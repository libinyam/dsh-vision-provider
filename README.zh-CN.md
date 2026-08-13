# dsh-vision-provider

[English](README.md) | [简体中文](README.zh-CN.md)

这是一个纯配置型 Profile Bundle，用于给
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
添加 OpenAI-compatible 多模态模型路由。

它复用 Harness 已有的完整图片链路：

- 在 Web 输入框中粘贴或拖入图片；
- 图片附件随会话持久化；
- 模型声明 `text` 和 `image` 输入能力；
- 通过 `@deepseek-ai/dsh-llm-pi-ai` 转换请求；
- 将请求发送到 OpenAI 或其他兼容接口。

本项目没有运行时代码，也不修改 Harness 源码，只提供一个
`cordis.patch.yml` 配置层。

> 这是社区项目，并非 DeepSeek 或 OpenAI 官方软件包。

## 插件添加了什么

默认只提供一条清晰、容易修改的视觉模型路由：

| 配置项 | 默认值 |
| --- | --- |
| Provider 路由 | `vision-openai` |
| Provider 显示名称 | `Vision (OpenAI Compatible)` |
| API 协议 | `openai-completions` |
| API 地址 | `https://api.openai.com/v1` |
| 模型 ID | `gpt-4.1-mini` |
| 模型显示名称 | `GPT-4.1 mini (Vision)` |
| 输入模态 | `text`、`image` |
| 凭据引用 | `VISION_OPENAI_API_KEY` |

**模型 ID** 是实际发送给接口的精确字符串，**模型显示名称** 只是 Harness
界面中方便人阅读的标签。默认模型会显示为：

```text
gpt-4.1-mini  GPT-4.1 mini (Vision)
```

不同服务商可能对相似模型使用不同 ID。请以服务商 API 文档中的模型 ID 为准，
不要只根据显示名称猜测。

## 环境要求

- 已经可以正常运行的 DeepSeek Harness 源码仓库或安装版本。
- Node.js `>=22.19.0`。
- `dsh plugin` 能够调用 `pnpm`。
- 一个真正支持图片输入的 OpenAI-compatible 模型接口。
- API Key；本地接口接受占位鉴权时可以使用免真实密钥模式。

本 Bundle 基于 DeepSeek Harness `0.1.0-rc.5` 制作。Harness 仍处于快速演进
阶段，升级 Harness 或本项目时应留意兼容性说明。

## 从 GitHub 安装

### 从 Harness 源码仓库运行

在 DeepSeek Harness 仓库中执行：

```powershell
Set-Location D:\deepseek-harness
$env:DSH_HOME = "D:\dsh-home"

pnpm dsh plugin --profile web add github:libinyam/dsh-vision-provider
pnpm dsh web
```

第一条命令会把插件安装到 `web` Profile，并将
`dsh-vision-provider` 追加到有序的 `dsh.profile.bundles` 列表。

### 使用已经安装好的 `dsh`

```powershell
$env:DSH_HOME = "D:\dsh-home"

dsh plugin --profile web add github:libinyam/dsh-vision-provider
dsh web
```

安装插件和启动 Harness 时要使用同一个 `DSH_HOME`。如果没有设置该变量，
Harness 默认使用 `~/.dsh`，可能会打开另一套 Profile 配置。

## 配置方法

### 使用 OpenAI

1. 启动 Web Profile。
2. 打开 **设置 > 模型**。
3. 找到 `Vision (OpenAI Compatible)` / `vision-openai`。
4. 为 `VISION_OPENAI_API_KEY` 凭据引用保存 API Key。
5. 保留默认 API 地址和模型 ID，或者改成你的账号实际支持的值。
6. 新建会话，并选择这个视觉模型。

API Key 由 Harness 的凭据服务保存在 `$DSH_HOME` 下，不会写入本仓库，也不会
发送给本项目作者。

### 使用第三方 OpenAI-compatible 网关

可以在启动 Harness 前设置默认值：

```powershell
$env:DSH_VISION_BASE_URL = "https://你的网关地址/v1"
$env:DSH_VISION_MODEL = "服务商的视觉模型ID"
$env:DSH_VISION_MODEL_NAME = "视觉模型显示名称"
$env:DSH_VISION_DISPLAY_NAME = "我的视觉网关"
$env:DSH_VISION_API_KEY_ENV = "MY_VISION_GATEWAY_KEY"
$env:MY_VISION_GATEWAY_KEY = "你的API密钥"

pnpm dsh web
```

也可以在 **设置 > 模型** 中修改。界面保存的设置会覆盖 Bundle 默认值，并从
下一次请求开始生效。

### 使用无需真实鉴权的本地接口

部分 OpenAI-compatible 客户端即使连接本地免鉴权服务，也要求请求中存在
Authorization 值。此模式会自动加入无敏感信息的占位请求头
`Authorization: Bearer dsh-no-auth`：

```powershell
$env:DSH_VISION_NO_AUTH = "1"
$env:DSH_VISION_BASE_URL = "http://127.0.0.1:11434/v1"
$env:DSH_VISION_MODEL = "你的本地视觉模型ID"
$env:DSH_VISION_MODEL_NAME = "本地视觉模型"

pnpm dsh web
```

此模式只适合可信、并且允许占位 Authorization 请求头的本地服务。如果接口要求
真实密钥，请不要设置 `DSH_VISION_NO_AUTH`，改用正常的凭据配置。

## 环境变量说明

| 环境变量 | 用途 | 默认值 |
| --- | --- | --- |
| `DSH_VISION_BASE_URL` | OpenAI-compatible API 根地址 | `https://api.openai.com/v1` |
| `DSH_VISION_MODEL` | 实际发送给 API 的模型 ID | `gpt-4.1-mini` |
| `DSH_VISION_MODEL_NAME` | 给用户看的模型名称 | 模型 ID，其次为 `GPT-4.1 mini (Vision)` |
| `DSH_VISION_DISPLAY_NAME` | Harness 中的 Provider 名称 | `Vision (OpenAI Compatible)` |
| `DSH_VISION_API_KEY_ENV` | 凭据引用名称 | `VISION_OPENAI_API_KEY` |
| `DSH_VISION_NO_AUTH` | 设为 `1` 时使用占位鉴权 | 未设置 |

环境变量会在启动时形成组合配置默认值。通过 **设置 > 模型** 保存的用户配置
优先级更高。

## 发送图片

1. 新建一个会话。
2. 选择 `Vision (OpenAI Compatible)` 下的模型。
3. 将图片粘贴到输入框，或把图片拖入页面。
4. 输入文字要求并发送。

本 Bundle 为模型声明了 `image` 模态，因此 Harness 会允许图片进入请求。但这个
声明**不能证明远端模型真的支持图片**。如果模型 ID 实际上是纯文本模型，Provider
仍可能在消息已经持久化后拒绝请求。

## 配置组合原理

本 Bundle 定位已有的 `llm-pi-ai` 配置行，并在它的组合基础配置中提供一个
Provider。Harness 的 Settings 层随后按 Provider 合并用户配置，所以
**设置 > 模型** 中的修改可以覆盖字段，也可以增加其他路由。

Harness 的 Bundle Patch 在命中同一个配置行时，会替换该行的整个 `config`，
而不是在不同 Bundle 之间深度合并。如果另一个已安装 Bundle 也修改
`llm-pi-ai`，最终由 Bundle 顺序决定哪一份组合基础配置生效。这种情况下，应把
多个 Provider 合并到更靠后的同一个 Patch 层中。

## 常见问题

### 能看到 Provider，但请求提示缺少凭据

在 **设置 > 模型** 中填写密钥，或者设置
`DSH_VISION_API_KEY_ENV` 所指向的环境变量。默认凭据引用是
`VISION_OPENAI_API_KEY`。

### 接口返回 401 或 403

检查 API Key、API 地址和网关自己的鉴权规则。要求真实密钥的远程服务不能使用
`DSH_VISION_NO_AUTH=1`。

### 接口提示模型不存在

当前模型 ID 不适用于该接口。应修改真正发送给 API 的模型 ID；只改显示名称不会
改变请求。

### 图片被拒绝

确认这个精确的模型 ID 通过当前 API 协议支持图片输入。修改模型后新建会话。
纯文本模型不会因为配置中写了 `image` 就自动获得视觉能力。

### 安装另一个 Bundle 后，视觉 Provider 消失了

另一个 Bundle 可能也替换了 `llm-pi-ai` 的配置。检查最终组合结果：

```powershell
pnpm dsh --profile web --dump-config
```

然后把 Provider 定义合并到 Profile 中更靠后的 `cordis.patch.yml`，或者调整
Bundle 顺序。

### 环境变量修改后没有看到预期结果

**设置 > 模型** 中保存的值会覆盖 Bundle 默认值。修改或删除已保存的 Provider
字段，然后重新发起请求。

## 更新

```powershell
pnpm dsh plugin --profile web update dsh-vision-provider
```

也可以执行干净重装：

```powershell
pnpm dsh plugin --profile web remove dsh-vision-provider
pnpm dsh plugin --profile web add github:libinyam/dsh-vision-provider
```

## 卸载

```powershell
pnpm dsh plugin --profile web remove dsh-vision-provider
```

卸载 Bundle 不会自动删除用户自己的 Provider 设置和凭据。如果以后不再使用，
请在模型设置中删除 `vision-openai` 及其凭据。

## 开发与自检

克隆仓库后执行：

```powershell
npm test
npm pack --dry-run
```

安装本地源码目录：

```powershell
pnpm dsh plugin --profile web add "C:\你的路径\dsh-vision-provider"
```

上游参考：

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- [CLI 行为参考](https://github.com/deepseek-ai/deepseek-harness/blob/HEAD/apps/cli/reference/README.zh.md)
- [`dsh-llm-pi-ai` Provider 指南](https://github.com/deepseek-ai/deepseek-harness/blob/HEAD/packages/llm/llm-pi-ai/README.zh.md)

## 安全与隐私

- 不要把 API Key 提交到本仓库或 Profile Patch。
- 图片、提示词、工具结果和会话上下文会发送到你配置的接口，请自行确认该服务商的
  数据保留与隐私政策。
- 自定义网关应被视为可信基础设施。
- 免真实密钥模式使用的是公开、无敏感信息的占位请求头。

## 开源协议

[MIT](LICENSE)
