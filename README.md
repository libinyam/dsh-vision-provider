# dsh-vision-provider

[English](README.md) | [简体中文](README.zh-CN.md)

A config-only profile bundle that gives
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) an
OpenAI-compatible multimodal model route.

It reuses the image pipeline already built into Harness:

- paste or drag images into the Web composer;
- persist attachments with the session;
- expose a model that declares `text` and `image` input;
- convert the request through `@deepseek-ai/dsh-llm-pi-ai`;
- send it to OpenAI or another compatible endpoint.

There is no runtime JavaScript plugin and no Harness source patch. The package
only contributes one `cordis.patch.yml` layer.

> This is a community project. It is not an official DeepSeek or OpenAI
> package.

## What it adds

The initial route is intentionally small and easy to edit:

| Field | Default |
| --- | --- |
| Provider route | `vision-openai` |
| Provider display name | `Vision (OpenAI Compatible)` |
| API protocol | `openai-completions` |
| Base URL | `https://api.openai.com/v1` |
| Model ID | `gpt-4.1-mini` |
| Model display name | `GPT-4.1 mini (Vision)` |
| Input modalities | `text`, `image` |
| Credential reference | `VISION_OPENAI_API_KEY` |

**Model ID** is the exact string sent to the endpoint. **Model display name**
is only the human-readable label shown in Harness. For the default model:

```text
gpt-4.1-mini  GPT-4.1 mini (Vision)
```

An endpoint may use a different ID even when its marketing name looks similar.
Always copy the model ID from your provider's API documentation.

## Requirements

- A working DeepSeek Harness checkout or installation.
- Node.js `>=22.19.0`.
- `pnpm` available to the `dsh plugin` command.
- A vision-capable OpenAI-compatible model endpoint.
- An API key, unless the local endpoint accepts placeholder authorization.

This bundle was prepared against DeepSeek Harness `0.1.0-rc.5`. Harness is
still evolving, so inspect the compatibility notes when upgrading either
project.

## Install from GitHub

### Running Harness from its source repository

From the DeepSeek Harness repository:

```powershell
Set-Location D:\deepseek-harness
$env:DSH_HOME = "D:\dsh-home"

pnpm dsh plugin --profile web add github:libinyam/dsh-vision-provider
pnpm dsh web
```

The first command installs the package into the `web` profile and appends
`dsh-vision-provider` to its ordered `dsh.profile.bundles` list.

### Running an installed `dsh`

```powershell
$env:DSH_HOME = "D:\dsh-home"

dsh plugin --profile web add github:libinyam/dsh-vision-provider
dsh web
```

Use the same `DSH_HOME` whenever you install plugins or launch Harness.
Without it, Harness defaults to `~/.dsh`, which may be a different profile
home.

## Configure

### OpenAI

1. Launch the Web profile.
2. Open **Settings > Models**.
3. Find `Vision (OpenAI Compatible)` / `vision-openai`.
4. Store your API key for the `VISION_OPENAI_API_KEY` credential reference.
5. Keep the default Base URL and model ID, or replace them with values
   supported by your account.
6. Start a new session and select the vision model.

Harness stores credentials under `$DSH_HOME` through its credential service.
This repository does not contain or receive your API key.

### Third-party OpenAI-compatible gateway

Set defaults before starting Harness:

```powershell
$env:DSH_VISION_BASE_URL = "https://gateway.example/v1"
$env:DSH_VISION_MODEL = "vendor-vision-model-id"
$env:DSH_VISION_MODEL_NAME = "Vendor Vision Model"
$env:DSH_VISION_DISPLAY_NAME = "My Vision Gateway"
$env:DSH_VISION_API_KEY_ENV = "MY_VISION_GATEWAY_KEY"
$env:MY_VISION_GATEWAY_KEY = "your-api-key"

pnpm dsh web
```

You may also edit these values in **Settings > Models**. Saved settings merge
over the bundle defaults and apply to the next request.

### Local endpoint without real authentication

Some OpenAI-compatible clients still require an authorization value even when
the local server does not validate it. This mode injects the harmless header
`Authorization: Bearer dsh-no-auth`:

```powershell
$env:DSH_VISION_NO_AUTH = "1"
$env:DSH_VISION_BASE_URL = "http://127.0.0.1:11434/v1"
$env:DSH_VISION_MODEL = "your-local-vision-model"
$env:DSH_VISION_MODEL_NAME = "Local Vision Model"

pnpm dsh web
```

Use this only with a trusted local endpoint that tolerates a placeholder
Authorization header. If the server requires a real key, leave
`DSH_VISION_NO_AUTH` unset and configure a credential normally.

## Environment reference

| Variable | Purpose | Default |
| --- | --- | --- |
| `DSH_VISION_BASE_URL` | OpenAI-compatible API root | `https://api.openai.com/v1` |
| `DSH_VISION_MODEL` | Exact model ID sent to the API | `gpt-4.1-mini` |
| `DSH_VISION_MODEL_NAME` | Human-readable model label | Model ID, then `GPT-4.1 mini (Vision)` |
| `DSH_VISION_DISPLAY_NAME` | Provider label in Harness | `Vision (OpenAI Compatible)` |
| `DSH_VISION_API_KEY_ENV` | Credential reference name | `VISION_OPENAI_API_KEY` |
| `DSH_VISION_NO_AUTH` | Use placeholder authorization when set to `1` | unset |

Environment values form the composition defaults read at boot. User values
saved through the Models page have higher priority.

## Use images

1. Start a new session.
2. Select the model under `Vision (OpenAI Compatible)`.
3. Paste an image into the composer or drag an image onto the page.
4. Add a text instruction and send the message.

The model is declared with the `image` modality, so Harness allows the
attachment into the request. This declaration does **not** prove that the
remote endpoint accepts images. If the model ID is text-only, the provider may
reject the request after the message has been persisted.

## Composition details

The bundle targets the existing `llm-pi-ai` row and supplies one provider in
its composition base. Harness's settings layer then merges user configuration
per provider, which is why edits in **Settings > Models** can override fields
or add more routes.

Harness bundle patches replace a targeted row's complete `config` value rather
than deep-merging bundle-to-bundle configuration. If another installed bundle
also patches `llm-pi-ai`, bundle order determines which composition base wins.
Combine the provider definitions into one later patch layer when using such
bundles together.

## Troubleshooting

### The provider appears, but the request says the credential is missing

Add the key in **Settings > Models**, or set the environment variable named by
`DSH_VISION_API_KEY_ENV`. The default reference is
`VISION_OPENAI_API_KEY`.

### The endpoint returns 401 or 403

Check the key, Base URL, and gateway-specific authentication rules. Do not use
`DSH_VISION_NO_AUTH=1` for a remote service that expects a real key.

### The endpoint says the model does not exist

The Model ID is wrong for that endpoint. Change the ID sent to the API; changing
only the display name does not affect requests.

### Images are rejected

Confirm that the exact model ID supports image input through the selected API
protocol. Open a new session after changing models. A text-only model cannot be
made visual merely by declaring the `image` modality.

### The provider disappeared after installing another bundle

The other bundle may also replace the `llm-pi-ai` row config. Inspect the
composed tree:

```powershell
pnpm dsh --profile web --dump-config
```

Then consolidate the provider definitions in the profile's later
`cordis.patch.yml` layer or adjust the bundle order.

### Changes do not match the environment variables

Values saved in **Settings > Models** override bundle defaults. Edit or remove
the saved provider values, then retry the request.

## Update

```powershell
pnpm dsh plugin --profile web update dsh-vision-provider
```

For a clean reinstall:

```powershell
pnpm dsh plugin --profile web remove dsh-vision-provider
pnpm dsh plugin --profile web add github:libinyam/dsh-vision-provider
```

## Uninstall

```powershell
pnpm dsh plugin --profile web remove dsh-vision-provider
```

Removing the bundle does not automatically erase user-owned provider settings
or credentials. Delete the `vision-openai` entry and its credential in the
Models page if they are no longer needed.

## Development

Clone this repository and run:

```powershell
npm test
npm pack --dry-run
```

To install a local checkout:

```powershell
pnpm dsh plugin --profile web add "C:\path\to\dsh-vision-provider"
```

Useful upstream references:

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- [CLI behavior reference](https://github.com/deepseek-ai/deepseek-harness/blob/HEAD/apps/cli/reference/README.md)
- [`dsh-llm-pi-ai` provider guide](https://github.com/deepseek-ai/deepseek-harness/blob/HEAD/packages/llm/llm-pi-ai/README.md)

## Security and privacy

- Never commit API keys to this repository or a profile patch.
- Images, prompts, tool results, and conversation context are sent to the
  configured endpoint. Review that provider's retention and privacy policy.
- Treat custom gateways as trusted infrastructure.
- The no-auth mode uses a visible, non-secret placeholder header.

## License

[MIT](LICENSE)
