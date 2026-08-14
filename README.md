# dsh-vision-provider

[English](README.md) | [简体中文](README.zh-CN.md)

`dsh-vision-provider` gives
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
selectable vision choices under one `DeepSeek + Vision` provider:

```text
DeepSeek + Vision
  GLM-4.6V-Flash
  Qwen VL Max
  GPT-4.1 mini (Vision)
```

Select only one combination in Harness. The vision model named in that
selection is used behind DeepSeek:

```text
Text-only message ───────────────────────────────> DeepSeek V4 Flash

Image message ──> private vision sidecar ──> visual description
                                               │
                                               └──> DeepSeek V4 Flash ──> answer
```

The vision model does not run as the final answer model. Instead, it appears as
part of a selectable DeepSeek combination. DeepSeek still performs reasoning,
tool use, and final response generation.

> This is a community project. It is not an official DeepSeek or OpenAI
> package.

## Why v0.3.0 exists

Version `0.1.0` added a standalone model named `vision-openai`. DeepSeek
Harness can select only one model for a session, so users had to choose either
DeepSeek or the vision model. The two models could not cooperate.

Version `0.2.0` introduced a runtime composite adapter, but the vision model
remained hidden in environment configuration and Web UI showed only the vague
label `DeepSeek V4 Flash + Vision`.

Version `0.3.0` brings vision selection into Web UI:

- the plugin reads every model in **Settings > Models** that advertises
  `image` input;
- each vision model becomes a separate selectable DeepSeek combination;
- the combination name shows the vision display name, while its description
  starts with the exact model ID and provider route;
- text-only requests go directly to `deepseek-official/deepseek-v4-flash`;
- image-bearing messages are analyzed by the vision model selected in Web UI;
- the visual analysis replaces the raw image before the request reaches
  DeepSeek;
- DeepSeek remains the model that reasons, uses tools, and writes the final
  answer;
- repeated tool steps reuse cached image analysis in the current process.

This is a two-model bridge, not native pixel input for DeepSeek. The quality of
the final answer depends on both the vision sidecar and DeepSeek.

## Requirements

- DeepSeek Harness `0.1.0-rc.5` or a compatible build.
- Node.js `>=22.19.0`.
- A configured DeepSeek API key for the native `deepseek-official` provider.
- At least one model in **Settings > Models** that advertises `text` and
  `image`, or a direct OpenAI-compatible vision endpoint.
- `pnpm` available to `dsh plugin`.

When upgrading, active routes such as `vision-openai` are read automatically
and their image-capable models become selectable combinations. A fresh install
also keeps one direct fallback: `gpt-4.1-mini` at
`https://api.openai.com/v1`. Any endpoint implementing OpenAI-compatible
`/chat/completions` image input can replace it.

## Install

### Harness source checkout

From the DeepSeek Harness repository:

```powershell
Set-Location D:\deepseek-harness
$env:DSH_HOME = "D:\dsh-home"

pnpm dsh plugin --profile web add github:libinyam/dsh-vision-provider
pnpm dsh web
```

### Installed `dsh` command

```powershell
$env:DSH_HOME = "D:\dsh-home"

dsh plugin --profile web add github:libinyam/dsh-vision-provider
dsh web
```

Always use the same `DSH_HOME` for plugin management and startup.

## Configure keys

The composite model ultimately uses two credentials:

1. DeepSeek key: configure the native DeepSeek provider in
   **Settings > Models** as usual.
2. Vision key: an existing `vision-openai` route continues using its own
   Harness configuration. The direct sidecar fallback uses
   `VISION_OPENAI_API_KEY` by default.

For the current PowerShell window:

```powershell
$env:VISION_OPENAI_API_KEY = "your-vision-api-key"
pnpm dsh web
```

To persist it for future PowerShell windows:

```powershell
[Environment]::SetEnvironmentVariable(
    "VISION_OPENAI_API_KEY",
    "your-vision-api-key",
    "User"
)
```

Close and reopen PowerShell after setting a persistent user variable.

API keys are never written to this repository or logged by the plugin. The
plugin first asks Harness's credential service for the configured reference,
then falls back to the launching process environment.

## Use

1. Start or restart the Web profile.
2. Create a new session.
3. Select `DeepSeek + Vision`.
4. Select the vision model you want, for example `GLM-4.6V-Flash`.
5. Paste or drag an image into the composer.
6. Add a question and send it.

Select only one model. Its title is the vision model display name; the second
line starts with the exact API model ID. DeepSeek remains the final-answer
model.

Pure text messages skip the vision endpoint entirely.

## Upgrade from v0.1.0

Stop Harness, then run:

```powershell
Set-Location D:\deepseek-harness
$env:DSH_HOME = "D:\dsh-home"

pnpm dsh plugin --profile web update dsh-vision-provider
pnpm dsh web
```

If the GitHub dependency does not refresh, perform a clean reinstall:

```powershell
pnpm dsh plugin --profile web remove dsh-vision-provider
pnpm dsh plugin --profile web add github:libinyam/dsh-vision-provider
pnpm dsh web
```

Existing `vision-openai`, GLM, Qwen, and other provider entries remain in
**Settings > Models** because they are user-owned configuration. Version
`0.3.0` reads every model on those routes that advertises `image` input and
creates the matching combinations.

Do not delete a provider whose vision models you still want to select; those
routes are now the source of the Web combination catalog.

## Add a vision model in Web UI

1. Open **Settings > Models**.
2. Add or edit a third-party provider.
3. Enter its provider ID, display name, protocol, endpoint, and credential
   reference.
4. Add the exact vision model ID and display name.
5. Save, then return to the conversation selector and open
   `DeepSeek + Vision`.

Models from Harness's built-in catalog already carry their input capabilities,
so known vision models appear automatically. Harness `0.1.0-rc.5` does not
expose modality controls for a hand-declared custom model in its Models page.
For such a model, add `input: [text, image]` to its `settings.yaml` entry, or
set the provider's `defaultInput` to `[text, image]`, then restart Web.

The plugin automatically creates a selectable DeepSeek combination:

```text
Vision Model Display Name
vision-model-id | Provider Display Name (provider-id) | Final answer: DeepSeek-V4-Flash
```

Declaring image capability is required. A custom model left at Harness's
default `input: [text]` is intentionally excluded from the vision catalog.

Provider details, credentials, model IDs, and display names can stay in Web UI.
The two modality lines below are the part a custom model may need in
`settings.yaml`:

```yaml
llm-pi-ai:
  providers:
    my-vision:
      displayName: My Vision Provider
      apiKeyEnv: MY_VISION_API_KEY
      api: openai-completions
      baseURL: https://gateway.example/v1
      defaultInput: [text, image]
      models:
        - id: vendor-vision-model-id
          name: Vision Model Display Name
          input: [text, image]
```

Store the API key through the Web credential input. Do not put the secret
itself in `settings.yaml`.

## Advanced: direct vision endpoint

To avoid registering a provider in **Settings > Models**, set a direct endpoint
before starting Harness:

```powershell
$env:DSH_VISION_USE_LEGACY = "0"
$env:DSH_VISION_BASE_URL = "https://gateway.example/v1"
$env:DSH_VISION_MODEL = "vendor-vision-model-id"
$env:DSH_VISION_MODEL_NAME = "Vendor Vision Model"
$env:DSH_VISION_API_KEY_ENV = "MY_VISION_GATEWAY_KEY"
$env:MY_VISION_GATEWAY_KEY = "your-api-key"

pnpm dsh web
```

The direct model also appears as one combination under `DeepSeek + Vision`.
Because this fallback uses `fetch` directly, it does not pass through Harness
provider retries, `llm/stream` middleware, or provider token accounting.
Configure the vision model under **Settings > Models** when those integrations
are required.

### Local endpoint without authentication

Some local OpenAI-compatible servers accept a placeholder Authorization
header:

```powershell
$env:DSH_VISION_NO_AUTH = "1"
$env:DSH_VISION_BASE_URL = "http://127.0.0.1:11434/v1"
$env:DSH_VISION_MODEL = "your-local-vision-model"

pnpm dsh web
```

This sends `Authorization: Bearer dsh-no-auth`. Use it only with a trusted
local endpoint. Do not enable it for a remote service that requires a real
key.

## Environment reference

| Variable | Purpose | Default |
| --- | --- | --- |
| `DSH_VISION_DISPLAY_NAME` | Composite provider label | `DeepSeek + Vision` |
| `DSH_VISION_COMPOSITE_MODEL` | Backward-compatible preferred combination ID and prefix for additional IDs | `deepseek-v4-flash` |
| `DSH_VISION_COMPOSITE_NAME` | Fallback name when the main model name cannot be read | `DeepSeek V4 Flash + Vision` |
| `DSH_VISION_MAIN_PROVIDER` | Internal text/reasoning provider | `deepseek-official` |
| `DSH_VISION_MAIN_MODEL` | Internal DeepSeek model | `deepseek-v4-flash` |
| `DSH_VISION_BASE_URL` | Vision API root | `https://api.openai.com/v1` |
| `DSH_VISION_MODEL` | Vision model ID for the direct combination | `gpt-4.1-mini` |
| `DSH_VISION_MODEL_NAME` | Vision model display name shown in Web UI | `GPT-4.1 mini (Vision)` |
| `DSH_VISION_API_KEY_ENV` | Vision credential reference | `VISION_OPENAI_API_KEY` |
| `DSH_VISION_NO_AUTH` | Use placeholder auth when set to `1` | unset |
| `DSH_VISION_MAX_TOKENS` | Maximum vision-analysis output | `4096` |
| `DSH_VISION_TIMEOUT_MS` | Request timeout for direct and registered vision models | `120000` |
| `DSH_VISION_DETAIL` | OpenAI image detail: `auto`, `low`, or `high` | `auto` |
| `DSH_VISION_USE_LEGACY` | Make the configured registered route the preferred combination; set `0` to prefer direct | enabled |
| `DSH_VISION_LEGACY_PROVIDER` | Preferred registered vision provider route | `vision-openai` |
| `DSH_VISION_LEGACY_MODEL` | Optional preferred model ID; otherwise use that route's first image model | unset |

## Data flow and privacy

For a text-only request, no data is sent to the vision endpoint.

For an image-bearing message, the selected sidecar receives:

- the image bytes;
- text in the same image-bearing message;
- a fixed instruction asking for factual visual transcription.

DeepSeek receives the normal conversation plus the generated visual
description. The plugin does not send the entire conversation to the vision
endpoint unless every message in that conversation independently contains an
image.

Review both providers' retention and privacy policies. Image analysis can
incur a separate provider charge in addition to the DeepSeek request.

The process-local cache avoids analyzing the same persisted message on every
tool step. It is cleared when Harness restarts, so old image messages may be
analyzed again after a restart or session resume.

## Troubleshooting

### Images are still rejected

Create a new session and select a specific combination under
`DeepSeek + Vision`, not `DeepSeek`. The native `deepseek-official` model
intentionally declares text-only input.

### A newly added vision model is missing

Check the model's `input`, or its provider's `defaultInput`, in
**Settings > Models**. It must include both `text` and `image`. Save, reopen the
model selector, and allow up to 30 seconds for the discovery cache to refresh.
Restart the Web profile if the catalog is still stale after that.

Inspect the composed tree:

```powershell
pnpm dsh --profile web --dump-config
```

It should contain a row whose `id` and `name` are both
`dsh-vision-provider`.

### The plugin reports `MISSING_CREDENTIAL`

Set the environment variable named by `DSH_VISION_API_KEY_ENV`. The default is
`VISION_OPENAI_API_KEY`. Restart Harness after changing persistent variables.

### The vision endpoint returns 401 or 403

Check the sidecar key, Base URL, model ID, and gateway authentication rules.
The DeepSeek key and vision key are separate.

### The endpoint says the model does not exist

`DSH_VISION_MODEL` must be the exact model ID accepted by the configured vision
endpoint. A display name is not an API model ID.

### The vision model exhausts its output tokens

Reasoning-capable vision models can spend part of their output budget before
starting the visible description. The default is `4096`. If the plugin reports
`MAX_TOKENS`, increase `DSH_VISION_MAX_TOKENS` and restart the Web profile.

### The old standalone vision model is still visible

That route is user-owned provider configuration; the bundle does not create or
remove it. Its models that advertise `image` input become selectable
combinations under `DeepSeek + Vision`. Delete the provider only when none of
its vision models are needed.

### DeepSeek answers without using the image

Confirm that the selected entry under `DeepSeek + Vision` names the intended
vision model. Then test that endpoint or choose another combination directly
from the selector. DeepSeek sees the sidecar's textual description, so omitted
visual details cannot be recovered later.

## Update and uninstall

```powershell
pnpm dsh plugin --profile web update dsh-vision-provider
```

```powershell
pnpm dsh plugin --profile web remove dsh-vision-provider
```

Removing the bundle does not automatically delete user-owned provider settings
or credentials.

## Development

```powershell
npm test
npm pack --dry-run
```

Install a local checkout:

```powershell
pnpm dsh plugin --profile web add "C:\path\to\dsh-vision-provider"
```

The runtime is dependency-free ESM and uses the services already supplied by
Harness: `llm` for nested DeepSeek routing and `attachments` for durable image
bytes.

## Community acknowledgements

Thanks to the [Linux.do](https://linux.do/) community for its discussion,
feedback, and support.

## License

[MIT](LICENSE)
