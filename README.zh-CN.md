# Skill Doctor

[English](./README.md)

Skill Doctor 是一个本地优先的 coding-agent skill 检查工具。它帮助你看清当前机器或项目里到底装了哪些 skill、谁会在冲突时生效、哪些定义存在风险，以及整个工作区在项目级、全局级和系统级上的行为结构。

## 功能亮点

- 扫描 Codex、Claude、Cursor、Copilot、GitHub 以及通用 skill 根目录
- 检测优先级链路、override、trigger 重叠和重复能力
- 标记 shell、网络、子进程、secret、破坏性命令等风险模式
- 将快照和配置统一存到 `~/.skill-doctor/`
- 提供本地 React UI，支持历史、筛选、删除和模型分析
- UI 支持英文和简体中文

## 为什么需要 Skill Doctor

随着本地和项目级 agent skill 越来越多，很多基础问题会越来越难回答：

- 当前真正生效的是哪个 skill？
- 为什么这个 skill 覆盖了另一个？
- 哪个 trigger phrase 存在歧义？
- 哪些 skill 最值得优先审查？

Skill Doctor 把 skill 当作可审查的基础设施，而不是黑盒行为。

## 安装方式

### 作为 npm 包使用

```bash
npm install -g skill-doctor
skill-doctor
```

或者不全局安装，直接运行：

```bash
npx skill-doctor
```

默认情况下，`skill-doctor` 会：

- 使用当前工作目录作为默认项目上下文
- 在 `http://localhost:4173` 启动本地 UI
- 尝试自动打开浏览器
- 不自动执行扫描，除非你在 UI 里手动触发，或者启动时加 `--scan`

### 在当前仓库里运行

```bash
npm install
npm run build
npm run serve
```

## 快速开始

### 启动本地 UI

```bash
skill-doctor
```

### 启动 UI 并先执行一次扫描

```bash
skill-doctor --scan
```

### 仅通过 CLI 扫描项目

```bash
skill-doctor-scan --project /path/to/project
```

### 输出 Markdown 报告

```bash
skill-doctor-scan --project /path/to/project --markdown ./skill-report.md
```

## CLI

### `skill-doctor`

启动本地 Web 应用。

```bash
skill-doctor [--project <path>] [--port <number>] [--app-home <path>] [--no-open] [--scan]
```

常用示例：

```bash
skill-doctor
skill-doctor --scan
skill-doctor --project /path/to/project
skill-doctor --no-open
```

### `skill-doctor-scan`

只执行扫描，不启动 UI。

```bash
skill-doctor-scan [--project <path>] [--output <file>] [--markdown <file>] [--analysis-language <en|zh-CN>] [--app-home <path>]
```

常用示例：

```bash
skill-doctor-scan --project .
skill-doctor-scan --project . --output ./scan.json
skill-doctor-scan --project . --markdown ./report.md
skill-doctor-scan --project . --analysis-language zh-CN
```

## 可检测内容

- 项目级、全局级、系统级已安装 skill
- 根目录发现方式与置信度
- 优先级链与可能胜出的定义
- 归一化后的重复 skill 名称
- trigger 重叠与歧义激活
- skill 文件中的本地静态风险模式
- 缺失或薄弱元数据，例如没有 trigger phrase

## 截图说明

### 总览页

主界面采用单条阅读路径：当前工作区上下文、顶层指标、历史入口、设置入口以及扫描入口都集中在首屏。左侧 hero 区强调产品价值，右侧摘要区则快速给出当前数据源和关键计数，避免用户一上来就陷入较重的抽屉或详情区域。

### 分析与目录页

分析页把两类信息并排放置：左侧是模型分析结论，右侧是实际扫描到的 roots。这样可以在同一视口里同时看到“结论”和“证据”，尤其适合审查同时接入多个 agent 目录、并且不同目录置信度不一致的工作区。

## 模型分析

每次新扫描都会通过 OpenAI-compatible 的 `chat/completions` 接口执行强制模型分析。

流程是：

1. Skill Doctor 先做本地静态扫描。
2. 再把扫描结果整理成结构化的压缩输入。
3. 把这份输入发送到配置好的模型接口。
4. 将模型返回的摘要、发现、建议和 spotlight 保存到快照里。

关键点：

- 在 UI 中配置 `apiKey`、`baseUrl` 和 `model`
- 本地扫描器会先对 skill 做优先级排序，再交给模型
- UI 触发的扫描会要求模型按当前界面语言返回
- CLI 默认英文，可通过 `--analysis-language zh-CN` 切换中文
- 如果模型配置缺失或 provider 调用失败，扫描仍会完成，只是在快照里记为分析错误

## 存储位置

Skill Doctor 默认把状态保存在被扫描项目之外：

```bash
~/.skill-doctor/
```

其中包括：

- `config.json`
- 扫描快照
- UI 使用的本地历史记录

## Architecture

Skill Doctor 是一个本地优先应用，可以分成四层运行结构：

```text
当前项目
    |
    v
根目录发现 + 本地静态扫描器
    |
    +--> 优先级 / 冲突 / 风险信号 / 本地优先级
    |
    v
结构化分析载荷
    |
    +--> OpenAI-compatible 模型分析
    |
    v
全局存储 (~/.skill-doctor/)
    |
    +--> config.json
    +--> 扫描快照
    +--> 历史记录元数据
    |
    v
本地 Node API
    |
    v
React UI
```

### 运行层说明

- `src-core/scanner/`：负责发现 roots、解析 skills、计算优先级、冲突、issue 和本地风险信号
- `src-core/analysis/`：负责构造结构化压缩输入、调用模型接口，并对分析结果做归一化
- `src-core/storage/`：负责管理 `~/.skill-doctor/` 下的全局配置和不可变快照
- `scripts/dev-server.ts`：负责托管前端构建产物，并暴露配置、扫描、历史和目录浏览等本地 API
- `src/`：负责渲染 React UI，包括历史、设置、扫描创建、分析结果和 skill 详情

### 数据流

1. 用户打开本地 UI，当前目录作为默认项目上下文。
2. 发起扫描后，系统先执行 root 发现和本地静态分析。
3. 扫描器生成 typed snapshot，并构造给模型的结构化输入。
4. 模型返回摘要、发现、建议和 skill spotlight。
5. 最终快照写入 `~/.skill-doctor/`，并立即出现在基于历史记录的 UI 中。

## UI 功能

- 英文和简体中文界面
- 顶部语言切换
- 历史记录抽屉，支持筛选、删除和坏数据处理
- 全局设置抽屉，支持模型配置和额外扫描目录
- 项目路径输入框和基于主目录的目录选择器
- 基于本地历史的最近项目路径
- skill 详情中的本地优先级拆解

## 支持的目录

内置发现逻辑当前覆盖这些常见工具的项目级和全局级目录：

- Codex
- Claude
- Cursor
- Copilot
- GitHub
- 通用隐藏 agent 目录布局

如果你的环境使用自定义路径，也可以在设置中补充额外的绝对扫描目录。

## Demo 工作区

仓库内置了一个用于验证功能的 demo 工作区：

```bash
examples/demo-workspace/
```

它适合验证：

- override 行为
- trigger overlap 检测
- 高风险和中风险本地模式
- 元数据缺失问题
- 模型分析前的本地优先级排序

运行方式：

```bash
npm run scan:demo
```

## 开发

安装依赖：

```bash
npm install
```

类型检查：

```bash
npm run typecheck
```

构建前端：

```bash
npm run build
```

在仓库内启动本地应用：

```bash
npm run serve
```

构建 npm 包产物：

```bash
npm run build:package
```

## 项目结构

```text
src/          React 前端
src-core/     扫描、分析、存储、校验
scripts/      CLI 和本地服务入口
public/       demo 数据和静态资源
docs/         方案文档、报告和产品说明
examples/     用于验证的 demo 工作区
```

## 路线图

- 引入按 agent 区分的优先级规则，而不是单一通用模型
- 支持跨项目或跨机器的差异对比
- 增强修复建议和自动修复产物
- 继续完善更便携的打包与安装方式

## License

当前仓库快照中还没有包含 license 文件。
