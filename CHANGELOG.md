# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/libinyam/dsh-vision-provider/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/libinyam/dsh-vision-provider/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/libinyam/dsh-vision-provider/releases/tag/v0.1.0
