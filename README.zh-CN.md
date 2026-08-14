# dsh-vision-provider

[English](README.md) | [简体中文](README.zh-CN.md)

`dsh-vision-provider` 为
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
增加一个可选择的组合模型：

```text
deepseek-v4-flash  DeepSeek V4 Flash + Vision
```

在 Harness 里只选择一个模型即可。插件会在内部自动协调两个模型：

```text
纯文字消息 ─────────────────────────────────────> DeepSeek V4 Flash

图片消息 ──> 隐藏的视觉模型 ──> 图片文字描述
                                      │
                                      └──> DeepSeek V4 Flash ──> 最终回答
```

OpenAI-compatible 视觉模型只是内部识图器，不会注册成第二个聊天模型，也不会
出现在会话模型选择器中。

> 这是社区项目，不是 DeepSeek 或 OpenAI 官方软件包。

## 为什么需要 v0.2.0

`v0.1.0` 注册的是一个独立的 `vision-openai` 模型。DeepSeek Harness 的一个
会话只能选择一个模型，所以用户只能在 DeepSeek 和视觉模型之间二选一，两个模型
不能协作。

`v0.2.0` 改成了真正的组合适配器：

- `deepseek-vision/deepseek-v4-flash` 对外声明支持 `text` 和 `image`；
- 纯文字请求直接发送给 `deepseek-official/deepseek-v4-flash`；
- 含图片的消息先交给隐藏的 OpenAI-compatible 视觉模型分析；
- 插件把图片替换成视觉模型生成的文字描述，再发送给 DeepSeek；
- 推理、工具调用和最终回答仍然由 DeepSeek 完成；
- 同一进程内的后续工具步骤会复用图片分析缓存，避免重复识图。

这是一条“双模型桥接”链路，不是让 DeepSeek 原生接收图片像素。最终效果同时取决于
视觉模型的描述质量和 DeepSeek 的推理质量。

## 环境要求

- DeepSeek Harness `0.1.0-rc.5` 或兼容版本。
- Node.js `>=22.19.0`。
- 已为原生 `deepseek-official` Provider 配置 DeepSeek API Key。
- 一个支持图片输入的 OpenAI-compatible 接口及其 API Key。
- `dsh plugin` 可以正常调用 `pnpm`。

从 `v0.1.0` 升级时，插件会自动复用已经激活的 `vision-openai` 路由作为隐藏
识图器。全新安装且没有旧路由时，默认直连
`https://api.openai.com/v1` 下的 `gpt-4.1-mini`。也可以换成任何实现
OpenAI-compatible `/chat/completions` 图片输入的服务。

## 安装

### 从 Harness 源码仓库运行

在 DeepSeek Harness 仓库中执行：

```powershell
Set-Location D:\deepseek-harness
$env:DSH_HOME = "D:\dsh-home"

pnpm dsh plugin --profile web add github:libinyam/dsh-vision-provider
pnpm dsh web
```

### 使用已经安装的 `dsh`

```powershell
$env:DSH_HOME = "D:\dsh-home"

dsh plugin --profile web add github:libinyam/dsh-vision-provider
dsh web
```

安装插件和启动 Harness 时，必须使用同一个 `DSH_HOME`。

## 配置两个 API Key

组合模型最终会使用两套凭据：

1. DeepSeek Key：像平常一样在 **设置 > 模型** 中配置原生 DeepSeek Provider。
2. 视觉 Key：已有的 `vision-openai` 会继续使用它在 Harness 中保存的配置；
   直连识图器默认读取 `VISION_OPENAI_API_KEY`。

只对当前 PowerShell 窗口生效：

```powershell
$env:VISION_OPENAI_API_KEY = "你的视觉模型API密钥"
pnpm dsh web
```

永久写入当前 Windows 用户环境变量：

```powershell
[Environment]::SetEnvironmentVariable(
    "VISION_OPENAI_API_KEY",
    "你的视觉模型API密钥",
    "User"
)
```

设置永久变量后，请关闭并重新打开 PowerShell。

插件不会把 API Key 写进仓库或日志。它会先从 Harness 凭据服务读取
`VISION_OPENAI_API_KEY`，没有找到时再读取启动进程的环境变量。

## 使用方法

1. 启动或重启 Web Profile。
2. 新建会话。
3. Provider 选择 `DeepSeek + Vision`。
4. 模型选择 `deepseek-v4-flash / DeepSeek V4 Flash + Vision`。
5. 把图片粘贴或拖入输入框。
6. 输入问题并发送。

只选择这一个组合模型。不要再选择 GLM/OpenAI 视觉模型，它现在只是内部识图器。

发送纯文字时不会调用视觉接口。

## 从 v0.1.0 升级

先关闭 Harness，再执行：

```powershell
Set-Location D:\deepseek-harness
$env:DSH_HOME = "D:\dsh-home"

pnpm dsh plugin --profile web update dsh-vision-provider
pnpm dsh web
```

如果 GitHub 依赖没有刷新，可以彻底重装：

```powershell
pnpm dsh plugin --profile web remove dsh-vision-provider
pnpm dsh plugin --profile web add github:libinyam/dsh-vision-provider
pnpm dsh web
```

升级后，**设置 > 模型** 中仍可能保留旧的 `vision-openai`。这是 `v0.1.0`
时期保存的用户配置。`v0.2.0` 会自动把这个已激活路由当成内部识图器，因此已有的
GLM 模型、协议、接口地址和凭据可以继续使用。会话中只选择
`DeepSeek + Vision`，不需要再手动选择旧路由。

只有在配置好直连识图器并设置 `DSH_VISION_USE_LEGACY=0` 后，才建议删除旧路由。

## 使用第三方视觉接口

启动 Harness 前设置：

```powershell
$env:DSH_VISION_USE_LEGACY = "0"
$env:DSH_VISION_BASE_URL = "https://你的网关地址/v1"
$env:DSH_VISION_MODEL = "服务商提供的视觉模型ID"
$env:DSH_VISION_API_KEY_ENV = "MY_VISION_GATEWAY_KEY"
$env:MY_VISION_GATEWAY_KEY = "你的API密钥"

pnpm dsh web
```

`DSH_VISION_MODEL` 表示隐藏的视觉识图器 ID，不会改变界面中选择的 DeepSeek
组合模型。

### 无需真实鉴权的本地接口

部分本地 OpenAI-compatible 服务允许使用占位 Authorization：

```powershell
$env:DSH_VISION_NO_AUTH = "1"
$env:DSH_VISION_BASE_URL = "http://127.0.0.1:11434/v1"
$env:DSH_VISION_MODEL = "你的本地视觉模型ID"

pnpm dsh web
```

插件会发送 `Authorization: Bearer dsh-no-auth`。该模式只适合可信的本地服务，
不能用于要求真实密钥的远程接口。

## 环境变量

| 变量 | 用途 | 默认值 |
| --- | --- | --- |
| `DSH_VISION_DISPLAY_NAME` | 组合 Provider 显示名称 | `DeepSeek + Vision` |
| `DSH_VISION_COMPOSITE_MODEL` | Harness 中显示的组合模型 ID | `deepseek-v4-flash` |
| `DSH_VISION_COMPOSITE_NAME` | 组合模型显示名称 | `DeepSeek V4 Flash + Vision` |
| `DSH_VISION_MAIN_PROVIDER` | 内部文字推理 Provider | `deepseek-official` |
| `DSH_VISION_MAIN_MODEL` | 内部 DeepSeek 模型 | `deepseek-v4-flash` |
| `DSH_VISION_BASE_URL` | 视觉接口根地址 | `https://api.openai.com/v1` |
| `DSH_VISION_MODEL` | 隐藏的视觉模型 ID | `gpt-4.1-mini` |
| `DSH_VISION_API_KEY_ENV` | 视觉凭据名称 | `VISION_OPENAI_API_KEY` |
| `DSH_VISION_NO_AUTH` | 设为 `1` 时使用占位鉴权 | 未设置 |
| `DSH_VISION_MAX_TOKENS` | 视觉描述最大输出长度 | `1024` |
| `DSH_VISION_TIMEOUT_MS` | 视觉请求超时时间 | `120000` |
| `DSH_VISION_DETAIL` | OpenAI 图片精度：`auto`、`low` 或 `high` | `auto` |
| `DSH_VISION_USE_LEGACY` | 复用已激活的旧路由；设为 `0` 时使用直连模式 | 启用 |
| `DSH_VISION_LEGACY_PROVIDER` | 旧识图 Provider 路由 | `vision-openai` |
| `DSH_VISION_LEGACY_MODEL` | 可选的旧识图模型 ID；未设置时使用第一个模型 | 未设置 |

## 数据流与隐私

纯文字请求不会向视觉接口发送任何内容。

消息包含图片时，被选中的内部识图器会收到：

- 图片文件内容；
- 与这些图片处于同一条消息中的文字；
- 一段固定的“客观描述图片”指令。

DeepSeek 会收到正常会话上下文和视觉模型生成的文字描述。除非会话中的每条消息都
各自包含图片，否则插件不会把整段会话全部发送给视觉接口。

请同时查看视觉服务商和 DeepSeek 的数据保留、隐私及计费政策。一次图片请求通常会
产生一次视觉模型费用和一次 DeepSeek 模型费用。

进程内缓存可以避免工具循环的每一步都重复分析同一张持久化图片。Harness 重启后
缓存会清空，恢复旧会话时可能重新分析历史图片。

## 常见问题

### 图片仍然被拒绝

请新建会话并选择 `DeepSeek + Vision`，不要选择原生 `DeepSeek`。原生
`deepseek-official` 模型明确只支持文字输入。

检查最终组合配置：

```powershell
pnpm dsh --profile web --dump-config
```

结果中应该有一行 `id` 和 `name` 都是 `dsh-vision-provider`。

### 提示 `MISSING_CREDENTIAL`

请设置 `DSH_VISION_API_KEY_ENV` 指向的环境变量。默认名称是
`VISION_OPENAI_API_KEY`。修改永久环境变量后必须重启 PowerShell 和 Harness。

### 视觉接口返回 401 或 403

检查视觉接口的 API Key、地址、模型 ID 和鉴权规则。DeepSeek Key 与视觉 Key 是
两套不同凭据。

### 接口提示模型不存在

`DSH_VISION_MODEL` 必须填写视觉服务商 API 实际接受的精确模型 ID，显示名称不能
代替模型 ID。

### 旧的视觉模型还在界面中

它是 `v0.1.0` 留下的用户配置，新版 Bundle 本身不会注册它。组合模型可以在内部
继续复用这个路由，所以它暂时保留也没有问题。准备删除前，请先配置直连模式、设置
`DSH_VISION_USE_LEGACY=0`、重启并验证图片功能，然后再删除旧 Provider。

### DeepSeek 的回答没有使用图片内容

先确认选中的是 `DeepSeek + Vision`，然后检查视觉接口本身是否能正确识图，或者
换用更强的视觉模型。DeepSeek 看到的是视觉模型生成的文字描述，描述中遗漏的细节
无法在后续推理中恢复。

## 更新与卸载

```powershell
pnpm dsh plugin --profile web update dsh-vision-provider
```

```powershell
pnpm dsh plugin --profile web remove dsh-vision-provider
```

卸载 Bundle 不会自动删除用户自己的 Provider 设置或凭据。

## 开发与测试

```powershell
npm test
npm pack --dry-run
```

安装本地源码目录：

```powershell
pnpm dsh plugin --profile web add "C:\你的路径\dsh-vision-provider"
```

运行时代码是无第三方依赖的 ESM，直接复用 Harness 提供的 `llm` 和
`attachments` 服务。

## 开源协议

[MIT](LICENSE)
