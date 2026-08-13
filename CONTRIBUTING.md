# Contributing

Thanks for helping improve `dsh-vision-provider`.

## Before opening an issue

- Confirm the exact model ID supports image input.
- Record the DeepSeek Harness version or commit.
- Remove API keys, private endpoint tokens, prompts, and sensitive images.
- Run `pnpm dsh --profile web --dump-config` when the problem may involve
  profile composition.

## Development

```powershell
npm test
npm pack --dry-run
```

Keep changes focused on the bundle and its documentation. This project should
remain config-only unless a feature genuinely cannot be expressed through the
public DeepSeek Harness bundle and provider contracts.

## Pull requests

- Explain the user-visible problem and the chosen configuration.
- Update both `README.md` and `README.zh-CN.md` for behavior changes.
- Add or update assertions in `scripts/validate.mjs`.
- Do not commit credentials, private URLs, generated archives, or
  machine-specific profile files.

By contributing, you agree that your contribution is licensed under the MIT
License.
