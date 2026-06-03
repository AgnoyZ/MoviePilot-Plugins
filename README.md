# MoviePilot-Plugins

这是一个基于原始仓库维护的 MoviePilot 第三方插件仓库。

- 原始仓库：[jxxghp/MoviePilot-Plugins](https://github.com/jxxghp/MoviePilot-Plugins)
- 当前仓库地址：`Mister-album/MoviePilot-Plugins`

当前仓库已不再保留原始仓库中的全部插件，主线只维护一个 V2 插件：`mediaopenlistupload`。

## 当前插件

### 媒体整理OpenList上传

插件目录：`plugins.v2/mediaopenlistupload/`

插件作用：

- 监听 MoviePilot 的媒体整理完成事件
- 按规则匹配整理后的媒体库目录
- 将命中的媒体文件、字幕文件，以及可选的刮削文件上传到 OpenList 指定目录
- 支持合并等待、失败重试、覆盖策略、结果查询和手动重试

适用场景：

- MoviePilot 已负责下载、识别、整理媒体文件
- OpenList 已在 MoviePilot 主程序中完成配置
- 需要在整理完成后，把媒体库内容同步到远端 OpenList 存储路径

## 仓库结构

- `plugins.v2/`：V2 插件源码
- `package.v2.json`：V2 插件市场元数据
- `icons/`：插件图标
- `docs/`：本仓库使用和开发文档

当前主要文件：

- `plugins.v2/mediaopenlistupload/__init__.py`：插件后端逻辑
- `plugins.v2/mediaopenlistupload/src/Config.vue`：插件配置页
- `plugins.v2/mediaopenlistupload/src/Page.vue`：上传结果页
- `plugins.v2/mediaopenlistupload/vite.config.js`：远程组件构建配置

## 使用说明

### 1. 准备条件

使用前请确认：

- MoviePilot 主程序已正常运行
- MoviePilot 已添加可用的 OpenList 或 Alist 存储配置
- MoviePilot 已启用本地插件仓库加载
- 插件仓库路径已指向当前仓库

### 2. 安装方式

将本仓库作为 MoviePilot 本地插件仓库使用，并确保插件目录中存在：

```text
plugins.v2/mediaopenlistupload/
```

如果你修改了 `src/` 下的 Vue 页面，需要在插件目录执行构建：

```powershell
cd plugins.v2\mediaopenlistupload
cmd /c npm run build
```

如果只修改 Python 后端逻辑，通常不需要前端重新构建。

### 3. 插件配置

在 MoviePilot 中启用插件后，按需配置：

- 启用插件
- 选择 OpenList 配置
- 合并等待时间
- 失败重试次数
- 重试间隔
- 默认覆盖方式
- 默认排除后缀
- 默认是否同步刮削文件

然后添加上传规则。每条规则可配置：

- 规则开关
- 规则名称
- 媒体库目录
- OpenList 目标目录
- 操作间隔
- 覆盖方式
- 排除后缀
- 是否同步刮削文件

### 4. 运行逻辑

插件工作流程如下：

1. MoviePilot 完成媒体整理
2. 插件接收整理完成事件
3. 按启用规则匹配整理后的本地路径
4. 命中规则后进入合并等待窗口
5. 等待结束后生成上传任务
6. 插件按规则将文件上传到 OpenList
7. 在结果页查看任务状态、文件明细和失败原因

### 5. 结果页

结果页可查看：

- 任务标题
- 命中规则
- 本地目录
- 文件数量
- 任务状态
- 文件级上传结果
- 失败信息

失败任务支持手动重试。

## 开发文档

开始开发或继续维护前，建议按顺序阅读：

- [仓库指南](./docs/Repository_Guide.md)
- [V2 插件开发指南](./docs/V2_Plugin_Development.md)
- [常见问题索引](./docs/FAQ.md)
- [MoviePilot 前端模块联邦开发指南](https://github.com/jxxghp/MoviePilot-Frontend/blob/v2/docs/module-federation-guide.md)

## 说明

- 本仓库不是 MoviePilot 主程序仓库
- 本仓库也不是 MoviePilot 前端仓库
- 插件运行依赖 MoviePilot 主程序提供的 `app.*` 能力
- 当前插件优先面向 MoviePilot V2 插件体系
