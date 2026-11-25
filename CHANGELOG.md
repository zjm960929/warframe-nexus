# Changelog

## [0.3.2] - 2026-11-26

### Added

- 顶栏新增 GitHub 项目主页与邮件按钮。
- 中英双语 README 拆分为 `README.md` 与 `README.zh.md`。

### Fixed

- 主页搜索框按 Soulframe 参考布局调整高度与图标垂直居中。
- 普通、钢铁与虚空风暴裂缝按古纪、前纪、中纪、后纪、安魂、全能排序。

## [0.3.1] - 2026-11-26

### Added

- `render.yaml`：Render Web Service 蓝图，直接运行现有 Node 服务。
- Node `/api/worldstate` 增加 CORS 和 OPTIONS 预检，供 GitHub Pages 跨域调用。
- 手动刷新使用 `fresh=1` 绕过 30 秒缓存。

## [0.3.0] - 2026-11-26

### Added

- Vercel Function `api/worldstate.mjs`：从官方 feed 获取并解析数据，提供 CORS。
- `WF_NEXUS_API_BASE` 配置；Pages 优先请求外部 API，失败时回退静态快照。

## [0.2.1] - 2026-11-26

### Changed

- 移除 Cloudflare Worker、Wrangler 配置、浏览器解析器和 live 模式，恢复 Node / 静态快照架构。
- 移除浏览器解析器相关的 `@noble/hashes` 和 Rollup 插件依赖。

## [0.2.0] - 2026-11-26

### Added

- 可选的 Cloudflare Worker 官方数据代理和 `WF_NEXUS_API_BASE` 实时模式；页面载入与手动刷新可请求官方 API，并在浏览器端解析。
- 浏览器端 `warframe-worldstate-parser` 打包文件与数据包。
- 浏览器端 md5/sha256 shim 和第三方许可说明。

## [0.1.0] - 2026-11-26

首个公开版本。

### Added

- 世界状态页：世界时钟、每日/每周刷新倒计时、Darvo、午夜电波、仲裁、警报、入侵、活动、突击、执刑官猎杀、深层科研、时光科研，以及三种虚空裂缝。
- 仲裁时间表页：当前仲裁、下一场、按日期分组的轮换表、1/3/7/30/90 天范围、任务类型与敌人派系筛选。
- 中英文界面、三种主题（自动/浅色/深色）、可自定义的世界状态模块顺序。
- 12 列宽屏自适应布局与砌体式补位。
- 根目录自包含离线版和 GitHub Pages 静态发布版。
- GitHub Actions 静态部署工作流；官方源临时不可用时复用仓库中已有快照继续部署。
- Node.js 本地实时模式，以及只访问官方数据源的解析保护。
- 文案规范、术语本地化和仲裁数据的自动化测试。

### Data and limitations

- 世界状态来自 Digital Extremes 官方 `api.warframe.com/cdn/worldState.php`。
- GitHub Pages 无法直接请求官方实时数据，页面使用构建时快照；实时模式需要运行 Node 服务器。
- 仲裁数据来自本地静态时间表，不请求第三方 API。

### Known notes

- 尚未实现的工具保留直接 URL 占位页，但不会显示在顶栏导航中。
- 游戏内名词优先使用官方简中译名；未收录文本保留英文。
