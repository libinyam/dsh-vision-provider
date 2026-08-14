# dsh-vision-provider

[English](README.md) | [简体中文](README.zh-CN.md)

`dsh-vision-provider` gives
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) one
selectable composite model:

```text
deepseek-v4-flash  DeepSeek V4 Flash + Vision
```

Select only one model in Harness. The plugin coordinates two providers behind
that single selection:

```text
Text-only message ───────────────────────────────> DeepSeek V4 Flash

Image message ──> private vision sidecar ──> visual description
                                               │
                                               └──> DeepSeek V4 Flash ──> answer
```

The OpenAI-compatible vision model is internal. It is not registered as a
second chat model and does not appear in the model selector.

> This is a community project. It is not an official DeepSeek or OpenAI
> package.

## Why v0.2.0 exists

Version `0.1.0` added a standalone model named `vision-openai`. DeepSeek
Harness can select only one model for a session, so users had to choose either
DeepSeek or the vision model. The two models could not cooperate.

Version `0.2.0` replaces that design with a runtime composite adapter:

- `deepseek-vision/deepseek-v4-flash` declares `text` and `image` input;
- text-only requests go directly to `deepseek-official/deepseek-v4-flash`;
- image-bearing messages are analyzed by an internal OpenAI-compatible model;
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
- An OpenAI-compatible vision endpoint and API key.
- `pnpm` available to `dsh plugin`.

When upgrading from `v0.1.0`, an existing active `vision-openai` route is
automatically reused as the hidden sidecar. On a fresh install, the direct
sidecar default is `gpt-4.1-mini` at `https://api.openai.com/v1`. Any endpoint
that implements OpenAI-compatible `/chat/completions` image input can be used
instead.

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
4. Select `deepseek-v4-flash / DeepSeek V4 Flash + Vision`.
5. Paste or drag an image into the composer.
6. Add a question and send it.

You do not select the GLM/OpenAI vision model. It is an internal sidecar used
only when an image is present.

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

An existing `vision-openai` entry remains in **Settings > Models** because it
is user-owned configuration created while `v0.1.0` was installed. `v0.2.0`
automatically reuses that active route as its hidden sidecar, so your existing
GLM model, protocol, endpoint, and credential continue to work. Select only
`DeepSeek + Vision` for the conversation; you do not need to select the old
route separately.

The old route can be deleted only after you configure the direct sidecar and
set `DSH_VISION_USE_LEGACY=0`.

## Custom vision endpoint

Set defaults before starting Harness:

```powershell
$env:DSH_VISION_USE_LEGACY = "0"
$env:DSH_VISION_BASE_URL = "https://gateway.example/v1"
$env:DSH_VISION_MODEL = "vendor-vision-model-id"
$env:DSH_VISION_API_KEY_ENV = "MY_VISION_GATEWAY_KEY"
$env:MY_VISION_GATEWAY_KEY = "your-api-key"

pnpm dsh web
```

`DSH_VISION_MODEL` identifies the hidden vision sidecar. It does not change the
selectable DeepSeek model.

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
| `DSH_VISION_COMPOSITE_MODEL` | Composite model ID shown by Harness | `deepseek-v4-flash` |
| `DSH_VISION_COMPOSITE_NAME` | Composite model display name | `DeepSeek V4 Flash + Vision` |
| `DSH_VISION_MAIN_PROVIDER` | Internal text/reasoning provider | `deepseek-official` |
| `DSH_VISION_MAIN_MODEL` | Internal DeepSeek model | `deepseek-v4-flash` |
| `DSH_VISION_BASE_URL` | Vision API root | `https://api.openai.com/v1` |
| `DSH_VISION_MODEL` | Hidden vision model ID | `gpt-4.1-mini` |
| `DSH_VISION_API_KEY_ENV` | Vision credential reference | `VISION_OPENAI_API_KEY` |
| `DSH_VISION_NO_AUTH` | Use placeholder auth when set to `1` | unset |
| `DSH_VISION_MAX_TOKENS` | Maximum vision-analysis output | `1024` |
| `DSH_VISION_TIMEOUT_MS` | Vision request timeout | `120000` |
| `DSH_VISION_DETAIL` | OpenAI image detail: `auto`, `low`, or `high` | `auto` |
| `DSH_VISION_USE_LEGACY` | Reuse an active legacy route; set `0` for direct mode | enabled |
| `DSH_VISION_LEGACY_PROVIDER` | Legacy sidecar provider route | `vision-openai` |
| `DSH_VISION_LEGACY_MODEL` | Optional exact legacy sidecar model; otherwise use its first model | unset |

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

Create a new session and select the provider `DeepSeek + Vision`, not
`DeepSeek`. The native `deepseek-official` model intentionally declares
text-only input.

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

### The old standalone vision model is still visible

That route is user-owned configuration left by `v0.1.0`; the new bundle does
not register it. It can stay visible while the composite model reuses it
internally. To remove it, first configure direct mode, set
`DSH_VISION_USE_LEGACY=0`, restart Harness, verify image input, and then delete
the old provider.

### DeepSeek answers without using the image

Confirm that the selected provider is `DeepSeek + Vision`. Then test the
vision endpoint directly or try a stronger sidecar model. The downstream
DeepSeek model sees the sidecar's textual description, so omitted visual
details cannot be recovered later.

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

## License

[MIT](LICENSE)
