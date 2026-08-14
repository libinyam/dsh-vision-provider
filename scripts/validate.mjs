import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as plugin from '../src/index.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const patch = await readFile(resolve(root, 'cordis.patch.yml'), 'utf8')
const readme = await readFile(resolve(root, 'README.md'), 'utf8')
const readmeZh = await readFile(resolve(root, 'README.zh-CN.md'), 'utf8')
const changelog = await readFile(resolve(root, 'CHANGELOG.md'), 'utf8')
const license = await readFile(resolve(root, 'LICENSE'), 'utf8')

assert.equal(manifest.name, 'dsh-vision-provider')
assert.equal(manifest.version, '0.3.3')
assert.equal(manifest.main, './src/index.js')
assert.equal(manifest.exports?.['.'], './src/index.js')
assert.equal(manifest.license, 'MIT')
assert.equal(manifest.repository?.url, 'git+https://github.com/libinyam/dsh-vision-provider.git')
assert.equal(manifest.dsh?.bundle?.patch, './cordis.patch.yml')

assert.equal(plugin.name, 'dsh-vision-provider')
assert.equal(plugin.version, manifest.version)
assert.deepEqual(plugin.inject, ['llm', 'attachments'])
assert.equal(typeof plugin.apply, 'function')
assert.equal(typeof plugin.CompositeVisionAdapter, 'function')

assert.match(patch, /- insert:/)
assert.match(patch, /name: dsh-vision-provider/)
assert.match(patch, /provider: deepseek-vision/)
assert.match(patch, /mainProvider: .*deepseek-official/)
assert.match(patch, /mainModel: .*deepseek-v4-flash/)
assert.match(patch, /visionModel: .*gpt-4\.1-mini/)
assert.match(patch, /visionModelName: .*GPT-4\.1 mini \(Vision\)/)
assert.match(patch, /DSH_VISION_MAX_TOKENS.*4096/)
assert.match(patch, /legacyProvider: .*vision-openai/)
assert.doesNotMatch(patch, /- id: llm-pi-ai/)
assert.doesNotMatch(patch, /vision-openai:\s*$/m)

assert.match(readme, /selectable DeepSeek combination/)
assert.match(readme, /github:libinyam\/dsh-vision-provider/)
assert.match(readme, /select only one model/i)
assert.match(readme, /allow up to 30 seconds/)
assert.match(readme, /does not pass through Harness/)
assert.match(readme, /Community acknowledgements[\s\S]*https:\/\/linux\.do\//)
assert.match(readmeZh, /DeepSeek \+ Vision.*可选择的视觉模型/s)
assert.match(readmeZh, /github:libinyam\/dsh-vision-provider/)
assert.match(readmeZh, /只选择一个(?:模型|组合项)/)
assert.match(readmeZh, /最多 30 秒/)
assert.match(readmeZh, /不会经过 Harness/)
assert.match(readmeZh, /社区鸣谢[\s\S]*https:\/\/linux\.do\//)
assert.match(changelog, new RegExp(`## \\[${manifest.version.replaceAll('.', '\\.')}\\]`))
assert.match(license, /MIT License/)
assert.match(license, /Copyright \(c\) 2026 libinyam/)

console.log('dsh-vision-provider: runtime, bundle patch, docs, and license look valid')
