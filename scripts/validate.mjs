import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const patch = await readFile(resolve(root, 'cordis.patch.yml'), 'utf8')
const readme = await readFile(resolve(root, 'README.md'), 'utf8')
const readmeZh = await readFile(resolve(root, 'README.zh-CN.md'), 'utf8')
const license = await readFile(resolve(root, 'LICENSE'), 'utf8')

assert.equal(manifest.name, 'dsh-vision-provider')
assert.equal(manifest.version, '0.1.0')
assert.equal(manifest.license, 'MIT')
assert.equal(manifest.repository?.url, 'git+https://github.com/libinyam/dsh-vision-provider.git')
assert.equal(manifest.dsh?.bundle?.patch, './cordis.patch.yml')
assert.match(patch, /- id: llm-pi-ai/)
assert.match(patch, /api: openai-completions/)
assert.match(patch, /defaultInput: \[text, image\]/)
assert.match(patch, /vision-openai:/)
assert.match(
  patch,
  /apiKeyEnv: !!js "process\.env\.DSH_VISION_NO_AUTH === '1' \? undefined : \(process\.env\.DSH_VISION_API_KEY_ENV \?\? 'VISION_OPENAI_API_KEY'\)"/,
)
assert.match(patch, /Authorization: 'Bearer dsh-no-auth'/)
assert.match(patch, /process\.env\.DSH_VISION_MODEL \?\? 'gpt-4\.1-mini'/)
assert.match(readme, /github:libinyam\/dsh-vision-provider/)
assert.match(readme, /Model ID/)
assert.match(readmeZh, /github:libinyam\/dsh-vision-provider/)
assert.match(readmeZh, /模型 ID/)
assert.match(license, /MIT License/)
assert.match(license, /Copyright \(c\) 2026 libinyam/)

console.log('dsh-vision-provider: package, docs, license, and multimodal patch look valid')
