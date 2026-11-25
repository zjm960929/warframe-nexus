# Warframe 星际枢纽

一个简洁、双语、可自托管的 Warframe 实用工具站，集中展示世界状态、仲裁时间表和容易错过的刷新细节。

[![Deploy Pages](https://github.com/zjm960929/warframe-nexus/actions/workflows/pages.yml/badge.svg)](https://github.com/zjm960929/warframe-nexus/actions/workflows/pages.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D22.18-339933)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[English](README.md) | 中文

## 目录

- [功能](#功能)
- [环境要求](#环境要求)
- [安装](#安装)
- [使用](#使用)
- [工作原理](#工作原理)
- [安全与限制](#安全与限制)
- [开发](#开发)
- [发布](#发布)
- [贡献](#贡献)
- [许可证](#许可证)

## 功能

- **极简主页**：居中标题、社交链接，以及按名称、描述和关键词过滤工具卡片的搜索框。
- **世界状态**：七个世界时钟、每日与每周刷新倒计时、Darvo 每日特惠、午夜电波、仲裁、警报、入侵、活动、突击、执刑官猎杀、深层科研、时光科研，以及三个虚空裂缝模块。
- **仲裁时间表**：当前与下一场仲裁、本地时区的按日分组表，以及 1/3/7/30/90 天范围和任务类型、敌人派系筛选。
- **清晰的裂缝顺序**：普通裂缝、钢铁裂缝和虚空风暴都按古纪、前纪、中纪、后纪、安魂、全能排序。
- **双语界面**：中文与 English，语言偏好保存在本地；支持浅色、深色和跟随系统主题。
- **自定义布局**：通过本地布局编辑器调整世界状态模块顺序，刷新页面后仍会保留。
- **宽屏砌体布局**：12 列响应式布局，自动补位，避免短模块下方留下空洞。

## 环境要求

- **Node.js 22.18 或更高版本**：用于本地服务器、构建和测试。
- 支持 ES Modules 与 `localStorage` 的现代浏览器。
- 不需要 Warframe 账号、API 密钥或第三方世界状态服务。

## 安装

### 在线站点

打开 <https://zjm960929.github.io/warframe-nexus/>。

线上站点可以通过可用的 Render API 获取官方实时数据；API 不可用时，会回退到 Pages 构建时生成的静态快照。

### 自包含单文件

直接在浏览器打开仓库根目录的 `index.html`。

- 文件约 2 MiB，内联 CSS、应用代码、中英文文案、官方术语表、世界状态快照和静态仲裁表。
- 不发出网络请求，使用构建时快照，不读取实时数据。
- 适合不安装 Node.js、快速查看布局和功能。

### 本地 Node 服务器

```bash
npm ci
npm start
```

打开 <http://127.0.0.1:4173>。服务器按需读取 Digital Extremes 官方 feed，并缓存解析结果 30 秒。

可用环境变量：

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `PORT` | `4173` | HTTP 端口 |
| `HOST` | `127.0.0.1` | 监听地址；托管服务使用 `0.0.0.0` |
| `HTTPS_PROXY` / `HTTP_PROXY` | 空 | 请求官方 feed 时使用的代理 |
| `NODE_USE_ENV_PROXY` | 空 | 设为 `1` 时让 Node 使用上述代理变量 |

使用本地代理的示例：

```powershell
$env:HTTPS_PROXY = 'http://127.0.0.1:7897'
$env:NODE_USE_ENV_PROXY = '1'
npm start
```

开发模式：

```bash
npm run dev
```

### Render

仓库包含 [`render.yaml`](render.yaml)，可把现有 Node 服务器部署为 Render Web Service。

1. 注册 Render 并连接本仓库。
2. 新建 **Blueprint** 并选择本仓库；也可以手动创建 Web Service：
   - Build Command：`npm ci`
   - Start Command：`npm start`
   - Health Check Path：`/api/health`
   - 环境变量：`HOST=0.0.0.0`
3. 部署后测试 `/api/health` 与 `/api/worldstate?lang=zh`。

Render 免费 Web Service 闲置约 15 分钟后休眠，再次启动可能需要约一分钟。常开实例约为 **$7/月**。

如果希望 GitHub Pages 使用 Render，请把仓库变量 `WF_NEXUS_API_BASE` 设置为 Render 服务根地址，然后重新运行 Pages 工作流。

### GitHub Pages

```bash
npm ci
npm test
npm run build:pages
npm run build:standalone
```

`build:pages` 生成 `docs/` 静态站点，`build:standalone` 生成根目录的自包含 `index.html`。

如果 Pages 构建时官方 feed 不可用，构建脚本会复用仓库中已有的 `worldstate-*.json` 快照并继续。

可选仓库变量 `WF_NEXUS_API_BASE` 用于配置线上前端的外部 API。变量值应为服务根地址，不要带 `/api/worldstate`；未设置时 Pages 只使用静态快照。

### 可选的 Vercel API

仓库还包含 [`api/worldstate.mjs`](api/worldstate.mjs)，可部署到 Vercel。导入仓库并部署后测试：

```text
https://your-project.vercel.app/api/worldstate?lang=zh
```

Vercel Hobby 仅面向个人、非商业项目。云厂商出口 IP 也可能被官方 API 拒绝，因此应先测试接口，再配置 Pages。

## 使用

- 使用顶栏的 **主页**、**世界状态** 和 **仲裁任务时间表** 切换页面。
- 主页搜索框按工具名称、描述和关键词过滤；按 `/` 可快速聚焦。
- 顶栏的语言和主题切换会保存在本地。
- 在 **世界状态** 页点击 **自定义布局** 调整模块顺序；倒计时每分钟更新，点击 **刷新数据** 请求最新数据。
- 虚空裂缝模块先按纪年排序，同纪年内再按剩余时间排序。
- 在 **仲裁任务时间表** 页切换日期范围，并按任务类型或敌人派系筛选。

## 工作原理

```text
api.warframe.com/cdn/worldState.php
              │
              ├── 本地 Node 服务器 ──► /api/worldstate ──► 浏览器
              │
              └── Render Web Service ──► /api/worldstate ──► GitHub Pages
```

- 官方 feed 使用 [`warframe-worldstate-parser`](https://github.com/WFCD/warframe-worldstate-parser) 解析。解析期间，`src/official.mjs` 会拦截所有非官方请求，因此不会使用社区赏金掉落表。
- 官方端点不返回 CORS 响应头，所以浏览器不直接请求官方 API。
- GitHub Pages 是静态托管，默认读取 `docs/data/worldstate-*.json`；配置外部 API 后优先请求外部 API。
- 仲裁时间表来自内置的每小时轮换 CSV 和生成的显示元数据，不请求第三方 API。
- `/api/worldstate` 支持 CORS 和 `fresh=1` 查询参数，用于手动刷新时绕过缓存。

## 安全与限制

- **只使用官方数据**：世界状态来自 Digital Extremes 的公开 feed，不使用第三方世界状态 API。
- **不访问账号**：项目不会索取 Warframe 账号、密码、令牌或游戏安装目录。
- **云厂商出口可能被拒绝**：GitHub Actions 和部分云平台会被官方端点返回 HTTP 403；部署后必须先测试 `/api/worldstate`。
- **Render 免费实例会休眠**：闲置后的首次请求可能较慢；前端在超时后会回退到静态快照。
- **静态快照会过期**：自包含文件和 Pages 回退数据都是构建时快照，不是实时数据。
- **仲裁数据是静态的**：内置的每小时轮换表在官方调整轮换时可能过期。
- **无担保**：这是非官方粉丝项目，与 Digital Extremes 无隶属关系。

## 开发

### 仓库结构

```text
warframe-nexus/
  index.html                 自包含构建产物
  server.mjs                 静态服务器 + 官方世界状态代理
  api/worldstate.mjs         可选的 Vercel Function
  render.yaml                Render Web Service 蓝图
  src/official.mjs           官方数据获取、解析和请求拦截
  public/
    index.html
    assets/css/styles.css
    assets/js/
      app.js                 启动、路由、主题、语言、刷新
      normalize.js           世界状态纯函数归一化
      localize.js            官方术语本地化
      i18n.js                界面文案与日期/倒计时格式
      pages/                 主页、世界状态、仲裁、占位页
    locales/                 en.json 与 zh-CN.json
    data/                    术语表和仲裁数据
  scripts/
    build-pages.mjs          Pages 静态构建
    build-standalone.mjs     自包含单文件构建
    build-arbitration-nodes.mjs
    build-terms.mjs
  docs/                      GitHub Pages 构建产物
  test/                      Node 测试
```

### 检查与测试

```bash
npm ci
npm test
```

测试覆盖归一化、仲裁选择、本地化、双语文案一致性、术语映射和虚空裂缝排序。

### 本地构建冒烟测试

```bash
npm run build:pages
npm run build:standalone
```

然后通过静态服务器打开 `docs/index.html`，或直接打开根目录生成的 `index.html`。

## 发布

当前版本为 **v0.3.2**。

1. 运行 `npm test`。
2. 构建 `docs/` 与 `index.html`。
3. 提交源码和构建产物。
4. 创建与 `package.json` 一致的注释标签。
5. 推送 `main` 与标签。
6. 确认 GitHub Pages 工作流成功完成。

## 贡献

欢迎提交 Issue 和 Pull Request。请保持改动聚焦，行为改动附带测试，并把用户可见文案同时写入 `public/locales/en.json` 与 `public/locales/zh-CN.json`。

- 项目主页：<https://github.com/zjm960929/warframe-nexus>
- 邮箱：<zjm960929@outlook.com>

## 许可证

项目代码采用 [MIT License](LICENSE)。第三方依赖见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。Warframe 的名称、数据和资产归 Digital Extremes 所有。
