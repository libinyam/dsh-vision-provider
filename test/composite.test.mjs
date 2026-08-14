import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CompositeVisionAdapter,
  apply,
  resolveConfig,
} from '../src/index.js'

const TEXT_CHUNKS = [
  { type: 'block-start', index: 0, blockType: 'text' },
  { type: 'text-delta', index: 0, text: 'done' },
  { type: 'block-end', index: 0, block: { type: 'text', text: 'done' } },
  { type: 'finish', reason: { kind: 'stop' }, replayState: { cursor: 'deepseek' } },
]

function textMessage(text, id = 'user-1') {
  return {
    id,
    role: 'user',
    source: { kind: 'user' },
    content: [{ type: 'text', text }],
  }
}

function imageRef(id, name = `${id}.png`) {
  return {
    attachmentId: id,
    mediaType: 'image/png',
    bytes: 3,
    width: 1,
    height: 1,
    name,
  }
}

function imageMessage(ids = ['image-1'], id = 'user-image') {
  return {
    id,
    role: 'user',
    source: { kind: 'user' },
    content: [
      { type: 'text', text: 'What is shown here?' },
      ...ids.map(attachmentId => ({ type: 'image', attachment: imageRef(attachmentId) })),
    ],
  }
}

function fakeContext({ credential = 'vision-key', mainChunks = TEXT_CHUNKS } = {}) {
  const mainCalls = []
  const registrations = []
  const ctx = {
    attachments: {
      async readImage(ref) {
        return { ref, data: Uint8Array.from([1, 2, 3]) }
      },
    },
    llm: {
      registerAdapter(routes, adapter) {
        registrations.push({ routes, adapter })
        return () => {}
      },
      providerRetryPolicy() {
        return { maxAttempts: 2 }
      },
      listProviders() {
        return [{ id: 'deepseek-official', name: 'DeepSeek' }]
      },
      async listModels() {
        return []
      },
      async resolveModelInfo(provider, model) {
        return {
          provider,
          id: model,
          name: 'DeepSeek-V4-Flash',
          inputModalities: ['text'],
          context: { contextWindow: 1_000_000 },
          defaultMaxTokens: 256_000,
          reasoning: {
            efforts: [{ id: 'off', name: 'Off' }, { id: 'high', name: 'High' }],
            defaultEffort: 'high',
          },
        }
      },
      stream(options) {
        mainCalls.push(options)
        return (async function* () {
          yield* mainChunks
        })()
      },
    },
    get(service) {
      if (service !== 'credentials' || credential === undefined) return undefined
      return {
        async resolve() {
          return { value: credential, source: 'test' }
        },
      }
    },
  }
  return { ctx, mainCalls, registrations }
}

async function collect(iterable) {
  const output = []
  for await (const item of iterable) output.push(item)
  return output
}

test('registers one combined provider and advertises the direct vision model', async () => {
  const { ctx, registrations } = fakeContext()
  apply(ctx)
  assert.equal(registrations.length, 1)
  assert.deepEqual(registrations[0].routes, ['deepseek-vision'])

  const [model] = await registrations[0].adapter.listModels('deepseek-vision')
  assert.equal(model.id, 'deepseek-v4-flash')
  assert.equal(model.name, 'GPT-4.1 mini (Vision)')
  assert.match(model.description, /^gpt-4\.1-mini \| api\.openai\.com \(direct\)/)
  assert.deepEqual(model.inputModalities, ['text', 'image'])

  const resolved = await registrations[0].adapter.resolveModel(
    'deepseek-vision',
    'deepseek-v4-flash',
  )
  assert.equal(resolved.name, 'GPT-4.1 mini (Vision)')
  assert.deepEqual(resolved.inputModalities, ['text', 'image'])
  assert.deepEqual(resolved.context, { contextWindow: 1_000_000 })
  assert.equal(resolved.reasoning.defaultEffort, 'high')
})

test('text-only requests skip the vision endpoint and pass DeepSeek chunks through', async () => {
  const { ctx, mainCalls } = fakeContext()
  let visionCalls = 0
  const adapter = new CompositeVisionAdapter(ctx, {}, {
    fetch: async () => {
      visionCalls += 1
      throw new Error('vision fetch must not run')
    },
  })

  const chunks = await collect(adapter.stream({
    provider: 'deepseek-vision',
    model: 'deepseek-v4-flash',
    messages: [textMessage('hello')],
  }))

  assert.equal(visionCalls, 0)
  assert.deepEqual(chunks, TEXT_CHUNKS)
  assert.equal(mainCalls.length, 1)
  assert.equal(mainCalls[0].provider, 'deepseek-official')
  assert.equal(mainCalls[0].model, 'deepseek-v4-flash')
  assert.deepEqual(mainCalls[0].messages, [textMessage('hello')])
})

test('image requests call vision once and send text-only content to DeepSeek', async () => {
  const { ctx, mainCalls } = fakeContext()
  const visionRequests = []
  const adapter = new CompositeVisionAdapter(ctx, {}, {
    fetch: async (url, init) => {
      visionRequests.push({ url, init, body: JSON.parse(init.body) })
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'A red error dialog says Access denied.' } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    },
  })

  await collect(adapter.stream({
    provider: 'deepseek-vision',
    model: 'deepseek-v4-flash',
    messages: [imageMessage()],
  }))

  assert.equal(visionRequests.length, 1)
  assert.equal(visionRequests[0].url, 'https://api.openai.com/v1/chat/completions')
  assert.equal(visionRequests[0].body.model, 'gpt-4.1-mini')
  assert.equal(
    visionRequests[0].body.messages[1].content.filter(part => part.type === 'image_url').length,
    1,
  )
  assert.equal(visionRequests[0].init.headers.authorization, 'Bearer vision-key')
  assert.match(visionRequests[0].init.headers['user-agent'], /dsh-vision-provider\/0\.3\.0/)

  const sent = mainCalls[0].messages[0].content
  assert.equal(sent.some(block => block.type === 'image'), false)
  assert.match(sent.map(block => block.text ?? '').join(''), /Access denied/)
})

test('multiple images share one sidecar request and cached history is not analyzed twice', async () => {
  const { ctx, mainCalls } = fakeContext()
  let visionCalls = 0
  const adapter = new CompositeVisionAdapter(ctx, {}, {
    fetch: async (_url, init) => {
      visionCalls += 1
      const body = JSON.parse(init.body)
      assert.equal(
        body.messages[1].content.filter(part => part.type === 'image_url').length,
        2,
      )
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'Image 1 is a chart. Image 2 is a table.' } }],
      }))
    },
  })
  const options = {
    provider: 'deepseek-vision',
    model: 'deepseek-v4-flash',
    messages: [imageMessage(['image-1', 'image-2'])],
  }

  await collect(adapter.stream(options))
  await collect(adapter.stream(options))

  assert.equal(visionCalls, 1)
  assert.equal(mainCalls.length, 2)
})

test('reuses an existing legacy vision route as the hidden sidecar', async () => {
  const { ctx, mainCalls } = fakeContext()
  const sidecarCalls = []
  const mainStream = ctx.llm.stream.bind(ctx.llm)
  ctx.llm.listProviders = () => [
    { id: 'deepseek-official', name: 'DeepSeek' },
    { id: 'vision-openai', name: 'GLM' },
  ]
  ctx.llm.listModels = async provider => provider === 'vision-openai'
    ? [{
        provider,
        id: 'GLM-4.6V-Flash',
        name: 'GLM-4.6V-Flash',
        inputModalities: ['text', 'image'],
      }]
    : []
  ctx.llm.stream = (options) => {
    if (options.provider !== 'vision-openai') return mainStream(options)
    sidecarCalls.push(options)
    return (async function* () {
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text: 'The screenshot shows a login error.' }
      yield {
        type: 'block-end',
        index: 0,
        block: { type: 'text', text: 'The screenshot shows a login error.' },
      }
      yield { type: 'finish', reason: { kind: 'stop' } }
    })()
  }
  let directFetchCalled = false
  const adapter = new CompositeVisionAdapter(ctx, {}, {
    fetch: async () => {
      directFetchCalled = true
      throw new Error('direct fetch must not run while the legacy route is active')
    },
  })

  await collect(adapter.stream({
    provider: 'deepseek-vision',
    model: 'deepseek-v4-flash',
    messages: [imageMessage()],
  }))

  assert.equal(directFetchCalled, false)
  assert.equal(sidecarCalls.length, 1)
  assert.equal(sidecarCalls[0].model, 'GLM-4.6V-Flash')
  assert.deepEqual(sidecarCalls[0].messages[0].source, { kind: 'user' })
  assert.equal(sidecarCalls[0].messages[0].content.some(block => block.type === 'image'), true)
  assert.match(
    mainCalls[0].messages[0].content.map(block => block.text ?? '').join(''),
    /login error/,
  )
})

test('lists registered image models as selectable DeepSeek combinations', async () => {
  const { ctx, mainCalls } = fakeContext()
  const sidecarCalls = []
  const mainStream = ctx.llm.stream.bind(ctx.llm)
  ctx.llm.listProviders = () => [
    { id: 'deepseek-official', name: 'DeepSeek' },
    { id: 'vision-openai', name: 'GLM Vision' },
    { id: 'qwen-vision', name: 'Qwen Vision' },
    { id: 'text-only', name: 'Text Only' },
  ]
  ctx.llm.listModels = async provider => ({
    'deepseek-official': [{
      provider,
      id: 'deepseek-v4-flash',
      name: 'DeepSeek-V4-Flash',
      inputModalities: ['text'],
    }],
    'vision-openai': [{
      provider,
      id: 'GLM-4.6V-Flash',
      name: 'GLM-4.6V-Flash',
      inputModalities: ['text', 'image'],
    }],
    'qwen-vision': [{
      provider,
      id: 'qwen-vl-max',
      name: 'Qwen VL Max',
      inputModalities: ['text', 'image'],
    }],
    'text-only': [{
      provider,
      id: 'text-model',
      name: 'Text Model',
      inputModalities: ['text'],
    }],
  })[provider] ?? []
  ctx.llm.stream = (options) => {
    if (options.provider === 'deepseek-official') return mainStream(options)
    sidecarCalls.push(options)
    return (async function* () {
      yield { type: 'text-delta', index: 0, text: `${options.model} saw the image.` }
      yield {
        type: 'finish',
        reason: { kind: 'stop' },
      }
    })()
  }
  const adapter = new CompositeVisionAdapter(ctx)
  const models = await adapter.listModels('deepseek-vision')

  assert.deepEqual(models.map(model => model.name), [
    'GLM-4.6V-Flash',
    'GPT-4.1 mini (Vision)',
    'Qwen VL Max',
  ])
  assert.equal(models[0].id, 'deepseek-v4-flash')
  assert.equal(
    models[2].id,
    'deepseek-v4-flash+vision:r:qwen-vision:qwen-vl-max',
  )
  assert.match(models[2].description, /^qwen-vl-max \| Qwen Vision/)

  await collect(adapter.stream({
    provider: 'deepseek-vision',
    model: models[2].id,
    messages: [imageMessage()],
  }))

  assert.equal(sidecarCalls.length, 1)
  assert.equal(sidecarCalls[0].provider, 'qwen-vision')
  assert.equal(sidecarCalls[0].model, 'qwen-vl-max')
  assert.match(
    mainCalls[0].messages[0].content.map(block => block.text ?? '').join(''),
    /qwen-vl-max saw the image/,
  )
})

test('legacy sidecars use the configured vision timeout', async () => {
  const { ctx } = fakeContext()
  ctx.llm.listProviders = () => [
    { id: 'deepseek-official', name: 'DeepSeek' },
    { id: 'vision-openai', name: 'Vision' },
  ]
  ctx.llm.listModels = async provider => provider === 'vision-openai'
    ? [{
        provider,
        id: 'slow-vision',
        name: 'Slow Vision',
        inputModalities: ['text', 'image'],
      }]
    : []
  ctx.llm.stream = _options => (async function* () {
    await new Promise(() => {})
    yield { type: 'finish', reason: { kind: 'stop' } }
  })()
  const adapter = new CompositeVisionAdapter(ctx, { visionTimeoutMs: 10 })

  await assert.rejects(
    collect(adapter.stream({
      provider: 'deepseek-vision',
      model: 'deepseek-v4-flash',
      messages: [imageMessage()],
    })),
    error => error.code === 'TIMEOUT',
  )
})

test('a null caller signal still combines with the direct vision timeout', async () => {
  const { ctx } = fakeContext()
  const adapter = new CompositeVisionAdapter(ctx, {}, {
    fetch: async () => new Response(JSON.stringify({
      choices: [{ message: { content: 'The image is readable.' } }],
    })),
  })

  await collect(adapter.stream({
    provider: 'deepseek-vision',
    model: 'deepseek-v4-flash',
    messages: [imageMessage()],
    signal: null,
  }))
})

test('images nested in tool results are removed before DeepSeek serialization', async () => {
  const { ctx, mainCalls } = fakeContext()
  const adapter = new CompositeVisionAdapter(ctx, {}, {
    fetch: async () => new Response(JSON.stringify({
      choices: [{ message: { content: 'The tool image contains a green check mark.' } }],
    })),
  })
  const message = {
    id: 'tool-result-1',
    role: 'user',
    source: { kind: 'tool', callId: 'call-1' },
    content: [{
      type: 'tool-result',
      toolCallId: 'call-1',
      content: [{ type: 'image', attachment: imageRef('tool-image') }],
    }],
  }

  await collect(adapter.stream({
    provider: 'deepseek-vision',
    model: 'deepseek-v4-flash',
    messages: [message],
  }))

  const nested = mainCalls[0].messages[0].content[0].content
  assert.equal(nested.some(block => block.type === 'image'), false)
  assert.match(nested[0].text, /green check mark/)
})

test('historical composite provenance is rewritten for DeepSeek replay', async () => {
  const { ctx, mainCalls } = fakeContext()
  const adapter = new CompositeVisionAdapter(ctx)
  const historical = {
    id: 'assistant-1',
    role: 'assistant',
    source: {
      kind: 'model',
      provider: 'deepseek-vision',
      model: 'deepseek-v4-flash',
      replayState: { cursor: 'keep-me' },
    },
    content: [{ type: 'text', text: 'Earlier answer' }],
  }

  await collect(adapter.stream({
    provider: 'deepseek-vision',
    model: 'deepseek-v4-flash',
    messages: [historical, textMessage('continue', 'user-2')],
  }))

  assert.equal(mainCalls[0].messages[0].source.provider, 'deepseek-official')
  assert.equal(mainCalls[0].messages[0].source.model, 'deepseek-v4-flash')
  assert.deepEqual(mainCalls[0].messages[0].source.replayState, { cursor: 'keep-me' })
})

test('missing credentials fail clearly before provider I/O', async () => {
  const { ctx } = fakeContext({ credential: null })
  let fetched = false
  const adapter = new CompositeVisionAdapter(ctx, {}, {
    environment: {},
    fetch: async () => {
      fetched = true
      throw new Error('unreachable')
    },
  })

  await assert.rejects(
    collect(adapter.stream({
      provider: 'deepseek-vision',
      model: 'deepseek-v4-flash',
      messages: [imageMessage()],
    })),
    error => error.code === 'MISSING_CREDENTIAL'
      && /VISION_OPENAI_API_KEY/.test(error.message),
  )
  assert.equal(fetched, false)
})

test('no-auth mode sends only the documented placeholder credential', async () => {
  const { ctx } = fakeContext({ credential: null })
  let authorization
  const adapter = new CompositeVisionAdapter(ctx, { visionNoAuth: true }, {
    environment: {},
    fetch: async (_url, init) => {
      authorization = init.headers.authorization
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'Local image analysis.' } }],
      }))
    },
  })

  await collect(adapter.stream({
    provider: 'deepseek-vision',
    model: 'deepseek-v4-flash',
    messages: [imageMessage()],
  }))
  assert.equal(authorization, 'Bearer dsh-no-auth')
})

test('vision HTTP failures do not include the API key', async () => {
  const secret = 'sk-super-secret'
  const { ctx } = fakeContext({ credential: secret })
  const adapter = new CompositeVisionAdapter(ctx, {}, {
    fetch: async () => new Response(JSON.stringify({
      error: { message: `bad key ${secret}` },
    }), { status: 401 }),
  })

  await assert.rejects(
    collect(adapter.stream({
      provider: 'deepseek-vision',
      model: 'deepseek-v4-flash',
      messages: [imageMessage()],
    })),
    error => error.code === 'AUTH'
      && error.status === 401
      && !error.message.includes(secret),
  )
})

test('configuration rejects recursive routing and invalid bounds', () => {
  assert.throws(
    () => resolveConfig({ provider: 'same', mainProvider: 'same' }),
    error => error.code === 'INVALID_CONFIG',
  )
  assert.throws(
    () => resolveConfig({ visionMaxTokens: 0 }),
    error => error.code === 'INVALID_CONFIG',
  )
  assert.equal(resolveConfig({ visionNoAuth: 'true' }).visionNoAuth, true)
  assert.equal(resolveConfig({ preferLegacyProvider: 'no' }).preferLegacyProvider, false)
})
