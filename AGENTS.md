# AGENTS.md

这份文件约束 Codex 在 `E:\project\MoviePilot-Plugins` 中的工作方式。本仓库是 MoviePilot 第三方插件仓库，不是 MoviePilot 主程序仓库，也不是 MoviePilot 前端仓库。

## 开始前必须阅读

开发或修改插件前，先按顺序阅读：

- `README.md`：仓库入口和文档导航。
- `docs/Repository_Guide.md`：仓库结构、插件目录、市场元数据、宿主/前端边界、安全要求和已确认命令。
- `docs/V2_Plugin_Development.md`：V2 插件开发主文档，包含生命周期、配置页、事件、API、渲染模式和校验建议。
- `docs/FAQ.md`：按插件放置、命名、配置、版本、验证等场景快速查阅。
- `https://github.com/jxxghp/MoviePilot-Frontend/blob/v2/docs/module-federation-guide.md`：只有插件需要 Vue 远程组件或模块联邦能力时再阅读。

同时阅读目标插件目录、`package.v2.json` 或 `package.json` 中对应插件节点。不要只凭经验推断 MoviePilot 插件规则。

## 仓库结构和默认选择

- `plugins.v2/`：V2 插件源码。新增插件默认放这里。
- `plugins/`：V1 插件源码。只有任务明确要求维护 V1 时才修改。
- `package.v2.json`：V2 插件市场元数据。
- `package.json`：V1 插件市场元数据。
- `icons/`：插件市场图标。
- `assets/`：插件说明图、配置截图等静态资源。
- `docs/`：本仓库开发文档。

当前仓库已有 `mediaopenlistupload` 插件，可作为 V2 插件目录、元数据、事件处理和远程组件写法参考。

## MoviePilot 边界

插件运行时依赖 MoviePilot 主程序提供的 `app.*` 包，例如 `_PluginBase`、事件系统、日志、HTTP 工具和 schema 类型。本仓库不包含这些依赖的完整实现。

- 不复制或修改 MoviePilot 主程序代码。
- 不假设宿主接口存在；涉及新宿主能力时先查证，查不到就说明依赖或做兼容处理。
- 简单配置页优先使用 `get_form()` 返回 Vuetify schema。
- 复杂前端交互才考虑远程 Vue 组件，并遵循 MoviePilot-Frontend 模块联邦文档。

## 本机 Vue 远程组件开发链路

当前 `plugins.v2/mediaopenlistupload/` 保留 Vue 远程组件，后端通过 `get_render_mode()` 返回 `("vue", "dist/assets")`。本机开发时不要手动移动源码或 `dist/assets` 到 MoviePilot 主程序目录。

正确链路：

- MoviePilot 设置中启用本地插件仓库路径，指向 `E:\project\MoviePilot-Plugins`。
- MoviePilot 设置中启用插件热重载。
- 修改 Python 后端文件后，保存源码，由 MoviePilot 本地插件热重载同步并重载。
- 修改 Vue 文件后，在 `plugins.v2\mediaopenlistupload` 下运行已确认的 `cmd /c npm run build`。
- `mediaopenlistupload` 的 `npm run build` 会执行 Vite 构建并运行 `scripts/postbuild.mjs`，清理不需要暴露的 Vite 入口/共享样式产物，然后触碰 `__init__.py` 的时间戳，触发 MoviePilot 监听器把整个插件目录同步到运行目录。

原因：MoviePilot 运行时通过 `/api/v1/plugin/file/<plugin_id>/...` 从主程序运行目录提供远程组件静态文件；当前宿主热重载主要由 Python 文件变更触发。Vue 构建产物是静态文件，因此需要构建后触发一次插件目录同步，而不是手动复制文件。

## 修改原则

- 先确认需求、影响范围和验证方式。
- 优先 V2；除非用户明确要求，不同步修改 V1。
- 只改目标插件、对应元数据、必要图标/资源和必要文档。
- 不新增框架、依赖、配置项或抽象层，除非当前任务确实需要。
- 不重排或统一格式化无关 JSON、Python 文件。
- 发现无关问题可以说明，不顺手处理。

## 插件实现注意事项

- 插件主类继承 `app.plugins._PluginBase`。
- `plugin_version` 要与 `package.v2.json` 对应节点的 `version` 同步。
- `plugin_icon` 优先引用 `icons/` 中的本地图标文件名。
- `get_form()` 中的 `props.model`、默认配置 key、`init_plugin(config)` 读取的 key 必须一致。
- `init_plugin()` 要能重复调用，避免配置变更后重复注册任务、模块或事件副作用。
- 有线程、定时任务、长连接、模块注册等资源时，必须在 `stop_service()` 或禁用分支中清理。
- 外部请求和事件回调要处理空值、异常和日志脱敏。
- 多实例或插件分身场景下，不要共享会互相覆盖的可变单例状态。

## 元数据要求

新增或发布 V2 插件时同步维护：

- `plugins.v2/<plugin_id>/__init__.py`
- `package.v2.json`
- `icons/<icon_file>`，如果使用本地图标
- `assets/<asset_file>`，如果需要说明图或截图

版本升级时同步更新插件类 `plugin_version`、`package.v2.json` 的 `version` 和 `history`。维护元数据时只修改目标插件节点。

## 已确认命令

只使用本项目已确认过的真实命令，不写占位命令。

```powershell
python --version
git diff --check
python -m py_compile plugins.v2\mediaopenlistupload\__init__.py
cmd /c npm run build
```

针对实际修改的 Python 文件，把 `py_compile` 路径替换为对应文件路径；如果修改了多个插件文件，逐个检查。当前仓库没有确认过项目级测试、打包或发布命令，不要虚构 CI 命令。
`cmd /c npm run build` 只在 `plugins.v2\mediaopenlistupload` 这类已配置 Vue 远程组件构建脚本的插件目录中使用。

## 安全边界

- 不读取 `.env*`。
- 不提交密钥、Token、证书、Cookie、完整认证头。
- 不在日志中输出敏感配置。
- 不编辑 `__pycache__`、编译产物等生成文件，除非任务明确要求。
- 不执行破坏性 git 或文件操作，除非用户明确要求。

## 验证和最终回复

源码变更后至少运行相关检查；无法运行时说明原因。常规验证优先：

- `git diff --check`
- `python -m py_compile <changed_python_file>`

最终回复说明：

- 改了什么。
- 运行了哪些验证。
- 哪些验证受限于本仓库缺少 MoviePilot 主程序依赖。
- 是否还有剩余风险。
