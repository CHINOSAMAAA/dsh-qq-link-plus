# 通到 QQ · Plus

> **来源与许可**
>
> 本项目派生自 [Yuuyuko-uu/dsh-qq-link](https://github.com/Yuuyuko-uu/dsh-qq-link)，原作者 **[Yuuyuko-uu](https://github.com/Yuuyuko-uu)**。
>
> 继续采用原作者声明的 **[Yuuyuko-uu 插件许可 1.2](https://github.com/Yuuyuko-uu/dsh-qq-link/blob/main/LICENSE)**，完整许可保留在本仓库 [LICENSE](LICENSE)。

由 **CHINOSAMAAA** 维护的衍生版本，围绕历史聊天导入、会话隔离和配置界面扩展原项目。

[本项目改动](#本项目改动) · [安装与使用](#安装与使用) · [边界与数据](#边界与数据) · [原版文档与开发](#原版文档与开发)

## 本项目改动

| 方向 | 相对原仓库的修改 |
| :--- | :--- |
| **历史聊天导入** | 增加 OneBot 后端读取、QCE 单文件 JSON、OneBot JSON 和 QQ TXT 导入；支持 UTF-8 / GB18030 编码。 |
| **分段整理与恢复** | 按时间切段，将完整文本逐段交给目标会话的模型，携带前段摘要；保存进度、模型结果与写入回执，支持失败重试和断点恢复。 |
| **长期记忆对接** | 通过 [鱼的记忆 Plus](https://github.com/CHINOSAMAAA/dsh-fish-memory-plus) 的 HTTP 接口写入目标库，不直接修改记忆文件；导入过程不触发 QQ 回复。 |
| **聊天与会话隔离** | 每个私聊或群聊独占一个 DSH 会话；保存时拒绝重复绑定，收发时拒绝旧歧义配置，取消多聊天回复广播。 |
| **可信来源记录** | 核验 OneBot 登录账号，记录聊天映射和宿主消息凭据，供记忆插件校验来源；公开接收接口和模型工具不能生成这类可信凭据。 |
| **配置界面** | 将连接、绑定、回复策略、媒体、文件存储与表情包配置集中到同一页，按区域折叠展示；单独提供历史导入页。绑定工作区后，会话下拉只显示该工作区内的会话。 |
| **文件与存储** | 接收 QQ 文件、归档图片/文件到绑定工作区，支持打开本地目录。 |
| **表情包** | 自动发送、自动收藏、导入素材、打标签与分类；素材处理会话可单独指定。 |
| **AI 代写** | 按需求调用当前 DSH 模型生成角色设定，可一键复制。 |
| **更新来源** | 检查更新仅追踪本 Plus 仓库的 `main`，安装来源指向本仓库；保留本地开发副本保护，修正数字修订号的比较。 |
| **回归检查** | 补充历史解析、分页、任务恢复、来源校验、记忆接口契约和更新器测试。 |

**代码基线：**原作者 `dsh-qq-link 1.5.1`，对应提交 [fba7e3e](https://github.com/Yuuyuko-uu/dsh-qq-link/commit/fba7e3ee8ffb3a8f819a7823eb05186cfb782ecb)。本仓库版本以 [package.json](package.json) 为准；修改历史见 [CHANGELOG.md](CHANGELOG.md)。

## 安装与使用

在 DSH 插件管理器中安装本仓库：

```text
github:CHINOSAMAAA/dsh-qq-link-plus
```

历史导入还需安装记忆扩展：

```text
github:CHINOSAMAAA/dsh-fish-memory-plus
```

Web profile 也可使用命令行：

```bash
dsh plugin --profile web add github:CHINOSAMAAA/dsh-qq-link-plus
dsh plugin --profile web add github:CHINOSAMAAA/dsh-fish-memory-plus
```

桌面版通过应用内插件管理器操作，安装后按宿主提示重载或重启。

> 同一环境只启用一套 QQ 与记忆插件。原版、Plus 和已内置这两个模块的 [大肥鱼整合包](https://github.com/CHINOSAMAAA/dsh-big-flsh-aio) 共用部分接口及数据路径，不能同时启用。

### 导入历史聊天

1. 配置 QQ 后端，在「配置 → 会话绑定与角色」中为聊天选择独立的 DSH 会话。
2. 在鱼的记忆中启用总开关和目标会话记忆，选择**按会话模式**；工作区共享模式不允许历史导入。
3. 进入「历史导入」，选择绑定和读取方式，读取并预览对象、消息数、时间范围及停止原因。
4. 如历史中的某个 QQ 代表 AI 自己，填写「AI 对应的 QQ 号」；留空则按原发言人记录。
5. 开始整理并写入记忆。关闭页面会在当前段结束后停止；重新打开可恢复已有任务。

| 输入来源 | 可用范围 |
| :--- | :--- |
| **OneBot 后端** | 私聊 / 群历史，按 `message_seq` 反向分页；默认最多 100 页，可设置 1～1000 页。 |
| **JSON 文件** | [QQ Chat Exporter](https://github.com/shuakami/qq-chat-exporter) 的单文件 QCE JSON，以及 OneBot 消息数组或 `data.messages`。 |
| **QQ TXT** | 带时间和发言人头的多行聊天记录，支持 UTF-8 / GB18030。 |

## 边界与数据

- **体积与处理范围：**单文件最大 50 MB，单任务最多 10 万条；每段最多 6000 字符，摘要承接最多 2000 字符。暂不支持 HTML、Excel、JSONL 或加密 `.bak`。
- **读取完整性：**处理所选文件或后端可见范围内的文本。空页、重复页、缺少游标或达到页数上限均会停止，不能据此保证 QQ 云端历史完整。
- **媒体内容：**图片、语音、文件等保留类型和标识；历史导入不下载媒体、不执行 OCR / ASR，也不补取未展开的合并转发正文。
- **模型与费用：**整理使用目标会话配置的模型服务，会发送聊天文本并消耗额度；模型失败、输出格式错误或截断时不推进进度。
- **本地记录：**原文分段保存在 `$DSH_HOME/qq-history-imports/<内容哈希>.source.json`，进度、摘要及回执保存在同名 `.json`。删除记忆不会自动清除这些档案。
- **已有配置：**继续使用原来的 `DSH_HOME`（默认 `~/.dsh`）及 QQ 配置、收图路径。切换插件时保留数据，停止正在进行的导入后再操作。

## 原版文档与开发

原作者的功能介绍、QQ 后端搭建、收发设置、语音与媒体说明，请直接阅读 **[源仓库 README](https://github.com/Yuuyuko-uu/dsh-qq-link#readme)**。本页仅维护 Plus 的改动与使用差异。

| 入口 | 地址 |
| :--- | :--- |
| 原作者项目与发布记录 | [源仓库](https://github.com/Yuuyuko-uu/dsh-qq-link) · [Releases](https://github.com/Yuuyuko-uu/dsh-qq-link/releases) |
| Plus 问题反馈 | [本仓库 Issues](https://github.com/CHINOSAMAAA/dsh-qq-link-plus/issues) |
| 记忆扩展说明 | [dsh-fish-memory-plus](https://github.com/CHINOSAMAAA/dsh-fish-memory-plus#readme) |
| 版本与提交规则 | [AGENTS.md](AGENTS.md) |

本地验证：

```bash
npm test
FISH_MEMORY_SOURCE=../dsh-fish-memory-plus/lib/index.js node --test tests/history-import.test.mjs
```

第二条命令要求同级目录检出记忆 Plus。测试使用模拟数据与宿主接口，不能替代真实 QQ、模型服务和 DSH 环境的联调验收。
