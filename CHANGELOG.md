# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added a bilingual community acknowledgement for Linux.do.

### Fixed

- Attached a matching own `failure` payload to every plugin error so Harness
  keeps the plugin's code and HTTP status in the terminal finish chunk instead
  of normalizing them to `UNKNOWN`. Retryable vision failures such as
  `RATE_LIMIT`, `SERVER`, and `TIMEOUT` now remain visible to `llm-retry`'s
  retryable-code matching.

## [0.3.3] - 2026-08-14

### Changed

- Cached registered vision-model discovery for 30 seconds, including in-flight
  deduplication shared by model listing and selected-model routing.
- Documented that the direct vision fallback bypasses Harness retry,
  middleware, and token-accounting integrations.

### Fixed

- Kept the runtime User-Agent version synchronized with the package version and
  added validation to prevent future version drift.

## [0.3.2] - 2026-08-14

### Fixed

- Kept the vision timeout timer referenced until the request settles, ensuring
  stalled registered sidecars time out reliably on Linux and in GitHub Actions.

## [0.3.1] - 2026-08-14

### Fixed

- Raised the default vision output budget from 1024 to 4096 tokens so
  reasoning-capable vision models can reach their visible analysis.
- Registered sidecars now report `MAX_TOKENS` with an actionable configuration
  hint when reasoning consumes the full budget before any analysis text.
- Partial visible analysis remains usable when a provider ends with
  `max-tokens`.

## [0.3.0] - 2026-08-14

### Added

- Every registered model that advertises `image` input now appears in the Web
  model selector as a separate DeepSeek combination.
- Composite model names show the vision model display name, while descriptions
  lead with its exact model ID and provider route.
- The Web selector now gives its scarce title space to the vision model name;
  the DeepSeek final-answer model remains visible in the description.
- Added tests for multiple selectable providers, exact selected-model routing,
  legacy timeout handling, and nullable caller signals.

### Changed

- The existing `deepseek-v4-flash` composite ID remains the preferred,
  backward-compatible option; additional combinations use stable encoded IDs.
- Image-bearing messages in one request are analyzed concurrently.
- Registered-provider vision calls now honor `DSH_VISION_TIMEOUT_MS`.
- Direct transport failures now identify the unreachable endpoint.
- Boolean configuration accepts common true/false spellings.
- Empty environment-variable strings fall back instead of failing plugin boot.

### Removed

- Removed the unused `headerValue` helper.

## [0.2.0] - 2026-08-14

### Changed

- Replaced the standalone vision-provider route with one selectable composite
  model: `DeepSeek V4 Flash + Vision`.
- Text-only calls now go straight to the native `deepseek-official` adapter.
- Image-bearing messages are analyzed by a private OpenAI-compatible vision
  sidecar, then converted to text before DeepSeek receives them.
- The internal vision model no longer appears in the Harness model selector.
- Existing `vision-openai` user routes are automatically reused as the hidden
  sidecar during migration, including their model, protocol, endpoint, and
  credential behavior.
- Added image-analysis caching for repeated tool steps and preserved DeepSeek
  replay provenance across composite calls.
- Added dependency-free runtime tests and migration documentation.

## [0.1.0] - 2026-08-13

### Added

- Config-only DeepSeek Harness bundle for one OpenAI-compatible vision route.
- OpenAI defaults using `gpt-4.1-mini`.
- Environment overrides for endpoint, model identity, labels, and credential
  references.
- Local no-real-key mode with a non-secret placeholder Authorization header.
- English and Simplified Chinese documentation.

[Unreleased]: https://github.com/libinyam/dsh-vision-provider/compare/v0.3.3...HEAD
[0.3.3]: https://github.com/libinyam/dsh-vision-provider/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/libinyam/dsh-vision-provider/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/libinyam/dsh-vision-provider/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/libinyam/dsh-vision-provider/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/libinyam/dsh-vision-provider/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/libinyam/dsh-vision-provider/releases/tag/v0.1.0
