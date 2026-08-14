# dsh-vision-provider

[English](README.md) | [简体中文](README.zh-CN.md)

`dsh-vision-provider` 为
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
在 `DeepSeek + Vision` 分组下增加可选择的视觉模型：

```text
DeepSeek + Vision
  GLM-4.6V-Flash
  Qwen VL Max
  GPT-4.1 mini (Vision)
```

在 Harness 里只选择一个组合项即可。选择哪个组合项，就使用其中标明的视觉模型：

```text
纯文字消息 ─────────────────────────────────────> DeepSeek V4 Flash

图片消息 ──> 隐藏的视觉模型 ──> 图片文字描述
                                      │
                                      └──> DeepSeek V4 Flash ──> 最终回答
```

视觉模型不会作为最终回答模型单独运行，而是以组合项的形式直接出现在会话模型
选择器中。最终推理、工具调用和回答仍由 DeepSeek 完成。

> 这是社区项目，不是 DeepSeek 或 OpenAI 官方软件包。

## 为什么需要 v0.3.0

`v0.1.0` 注册的是一个独立的 `vision-openai` 模型。DeepSeek Harness 的一个
会话只能选择一个模型，所以用户只能在 DeepSeek 和视觉模型之间二选一，两个模型
不能协作。

`v0.2.0` 改成了组合适配器，但视觉模型仍藏在环境变量中，Web UI 只能看到一个
含义不明确的 `DeepSeek V4 Flash + Vision`。

`v0.3.0` 把视觉模型选择带回 Web UI：

- 插件实时读取 **设置 > 模型** 中所有声明支持 `image` 的模型；
- 每个视觉模型生成一个独立的 DeepSeek 组合项；
- 组合名称显示视觉模型名称，说明文字首先显示准确的模型 ID 和 Provider 路由；
- 纯文字请求直接发送给 `deepseek-official/deepseek-v4-flash`；
- 含图片的消息先交给用户在 Web UI 中选中的视觉模型分析；
- 插件把图片替换成视觉模型生成的文字描述，再发送给 DeepSeek；
- 推理、工具调用和最终回答仍然由 DeepSeek 完成；
- 同一进程内的后续工具步骤会复用图片分析缓存，避免重复识图。

这是一条“双模型桥接”链路，不是让 DeepSeek 原生接收图片像素。最终效果同时取决于
视觉模型的描述质量和 DeepSeek 的推理质量。

## 环境要求

- DeepSeek Harness `0.1.0-rc.5` 或兼容版本。
- Node.js `>=22.19.0`。
- 已为原生 `deepseek-official` Provider 配置 DeepSeek API Key。
- 至少一个在 **设置 > 模型** 中声明支持 `text` 和 `image` 的视觉模型，或者一个
  直连 OpenAI-compatible 视觉接口。
- `dsh plugin` 可以正常调用 `pnpm`。

从旧版本升级时，插件会自动读取已经激活的 `vision-openai` 等视觉路由，并把其中
支持图片的模型列成组合项。全新安装且没有视觉路由时，保留一个默认直连
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
4. 在模型列表中直接选择需要的视觉模型，例如 `GLM-4.6V-Flash`。
5. 把图片粘贴或拖入输入框。
6. 输入问题并发送。

只选择一个模型。第一行是视觉模型显示名称，第二行开头是接口实际使用的精确模型
ID；最终回答模型仍然是 DeepSeek。

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

升级后，**设置 > 模型** 中已有的 `vision-openai`、GLM、Qwen 或其他视觉
Provider 会继续保留。`v0.3.0` 会读取其中声明支持 `image` 的模型，并自动生成
对应组合项。

不要删除仍要使用的视觉 Provider；它现在就是 Web UI 组合目录的数据来源。

## 在 Web UI 添加视觉模型

1. 打开 **设置 > 模型**。
2. 添加或编辑一个第三方 Provider。
3. 填写 Provider ID、显示名称、协议、接口地址和凭据名称。
4. 添加视觉模型的准确 ID 和显示名称。
5. 保存后回到会话模型选择器，打开 `DeepSeek + Vision`。

Harness 内置模型目录已经携带输入能力信息，因此已知视觉模型会自动出现。
Harness `0.1.0-rc.5` 的“模型”页面还没有给自定义模型提供图片能力开关。此类模型
需要在 `settings.yaml` 中补上 `input: [text, image]`，或者给 Provider 设置
`defaultInput: [text, image]`，然后重启 Web。

插件会自动出现类似下面的组合项，无需再设置
`DSH_VISION_LEGACY_PROVIDER`：

```text
视觉模型显示名称
视觉模型ID | Provider显示名称 (Provider ID) | Final answer: DeepSeek-V4-Flash
```

关键点是必须声明图片能力。自定义模型若保持 Harness 默认的
`input: [text]`，插件不会把它误列为视觉模型。

Provider 信息、凭据、模型 ID 和显示名称仍然可以在 Web UI 中管理。下面两个能力
字段是自定义模型可能需要在 `settings.yaml` 中补充的部分：

```yaml
llm-pi-ai:
  providers:
    my-vision:
      displayName: My Vision Provider
      apiKeyEnv: MY_VISION_API_KEY
      api: openai-completions
      baseURL: https://供应商接口地址/v1
      defaultInput: [text, image]
      models:
        - id: 供应商的视觉模型ID
          name: 视觉模型显示名称
          input: [text, image]
```

API Key 继续在 Web UI 的凭据输入框中保存，不要把真实密钥直接写进
`settings.yaml`。

## 高级：直连第三方视觉接口

不想在 **设置 > 模型** 中注册 Provider 时，也可以在启动 Harness 前设置：

```powershell
$env:DSH_VISION_USE_LEGACY = "0"
$env:DSH_VISION_BASE_URL = "https://你的网关地址/v1"
$env:DSH_VISION_MODEL = "服务商提供的视觉模型ID"
$env:DSH_VISION_MODEL_NAME = "视觉模型显示名称"
$env:DSH_VISION_API_KEY_ENV = "MY_VISION_GATEWAY_KEY"
$env:MY_VISION_GATEWAY_KEY = "你的API密钥"

pnpm dsh web
```

直连模型也会作为一个组合项显示在 `DeepSeek + Vision` 下。
由于该回退通道直接使用 `fetch`，它不会经过 Harness 的 Provider 重试、
`llm/stream` 中间件或 Provider token 计量。需要这些集成能力时，请优先在
**设置 > 模型** 中注册视觉模型。

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
| `DSH_VISION_COMPOSITE_MODEL` | 首选组合项的兼容 ID，也是其他组合 ID 的前缀 | `deepseek-v4-flash` |
| `DSH_VISION_COMPOSITE_NAME` | 无法读取主模型名称时使用的回退名称 | `DeepSeek V4 Flash + Vision` |
| `DSH_VISION_MAIN_PROVIDER` | 内部文字推理 Provider | `deepseek-official` |
| `DSH_VISION_MAIN_MODEL` | 内部 DeepSeek 模型 | `deepseek-v4-flash` |
| `DSH_VISION_BASE_URL` | 视觉接口根地址 | `https://api.openai.com/v1` |
| `DSH_VISION_MODEL` | 直连组合项使用的视觉模型 ID | `gpt-4.1-mini` |
| `DSH_VISION_MODEL_NAME` | Web UI 中显示的视觉模型名称 | `GPT-4.1 mini (Vision)` |
| `DSH_VISION_API_KEY_ENV` | 视觉凭据名称 | `VISION_OPENAI_API_KEY` |
| `DSH_VISION_NO_AUTH` | 设为 `1` 时使用占位鉴权 | 未设置 |
| `DSH_VISION_MAX_TOKENS` | 视觉描述最大输出长度 | `4096` |
| `DSH_VISION_TIMEOUT_MS` | 直连和已注册视觉模型的请求超时时间 | `120000` |
| `DSH_VISION_DETAIL` | OpenAI 图片精度：`auto`、`low` 或 `high` | `auto` |
| `DSH_VISION_USE_LEGACY` | 让指定已注册路由成为首选组合项；设为 `0` 时首选直连模型 | 启用 |
| `DSH_VISION_LEGACY_PROVIDER` | 首选的已注册视觉 Provider 路由 | `vision-openai` |
| `DSH_VISION_LEGACY_MODEL` | 可选的首选视觉模型 ID；未设置时使用该路由第一个图片模型 | 未设置 |

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

请新建会话，在 `DeepSeek + Vision` 下选择一个明确的视觉组合项，不要选择原生 `DeepSeek`。原生
`deepseek-official` 模型明确只支持文字输入。

### 新添加的视觉模型没有出现在组合列表

检查 **设置 > 模型** 中该模型的 `input`，或者 Provider 的 `defaultInput`。它必须
同时包含 `text` 和 `image`。保存后重新打开模型选择器，并等待最多 30 秒让发现
缓存刷新；届时仍未出现再重启 Web Profile。

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

### 视觉模型耗尽输出额度

带推理能力的视觉模型可能先消耗一部分输出额度，再开始生成可见描述。默认额度为
`4096`。如果插件提示 `MAX_TOKENS`，请提高 `DSH_VISION_MAX_TOKENS`，然后重启
Web Profile。

### 旧的视觉模型还在界面中

它是用户自己的 Provider 配置，新版 Bundle 本身不会创建或删除它。该 Provider
中声明支持 `image` 的模型会成为 `DeepSeek + Vision` 下的可选组合项。只有确定
不再使用其中任何视觉模型时才应删除。

### DeepSeek 的回答没有使用图片内容

先确认选中的是 `DeepSeek + Vision` 下正确的视觉组合项，然后检查该视觉接口本身
是否能正确识图，或者直接在下拉框中换用另一个视觉模型。DeepSeek 看到的是视觉
模型生成的文字描述，描述中遗漏的细节无法在后续推理中恢复。

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
