# Warframe Nexus

一个双语、可自托管的 Warframe 实用工具合集。当前版本完成了**世界状态**页和**仲裁时间表**页；未完成的工具保留直接 URL 占位页，但顶栏只展示已完成页面。

> 当前版本：`0.3.1` · [变更记录](CHANGELOG.md)

- 中文 / English 切换，语言选择保存在浏览器。
- 明亮 / 黑暗 / 跟随系统三种主题。
- 前端使用原生 HTML / CSS / ES Modules，无框架运行时；Node.js 服务器负责官方世界状态代理。
- 桌面、平板和手机响应式布局，提供 GitHub Pages 静态发布方案。
- 数据源改为 **Digital Extremes 官方** `api.warframe.com/cdn/worldState.php`，不再请求 `api.warframestat.us` 或其他第三方世界状态 API。

## 先说明：GitHub Pages 与实时数据

GitHub Pages 只能托管静态文件，不能运行 Node 代理；而官方世界状态端点 **不返回 CORS 响应头**，所以浏览器无法从 GitHub Pages 直接请求官方实时数据。

本项目采用两层方案：

1. **本地 / Node 服务器**：`npm start` 启动代理，实时读取官方数据，缓存 30 秒。
2. **GitHub Pages + Vercel API**：将 `api/worldstate.mjs` 部署到 Vercel，Pages 页面在载入和手动刷新时请求 Vercel；Vercel 从官方 API 获取并解析数据。
3. **GitHub Pages 静态快照**：`npm run build:pages` 在构建时读取官方数据并生成 `docs/`，页面从 `docs/data/worldstate-*.json` 读取。GitHub Actions 在推送或手动触发时部署；GitHub 托管 runner 访问官方 feed 可能被拒绝，此时复用已有快照。

如果你需要 GitHub Pages 上真正的实时数据，需要额外加一个支持 CORS 的代理，让静态页面请求该代理。**仅靠 GitHub Pages 本身做不到**，这点无法绕过。

## 快速开始

### 方式 A：直接打开，不需要 npm / 服务器

双击根目录的 **`index.html`**，或拖进浏览器即可。

- 这是**自包含单文件**（约 2 MiB）：CSS、应用代码、中英文文案、官方术语表、官方数据快照和静态仲裁表全部内联。
- 使用的是构建时的静态快照，页面会明确显示“静态快照”，不是实时数据。
- 适用于本地快速查看布局和功能，不需要安装 Node.js，也不会发出网络请求。

### 方式 B：实时模式（需要 Node.js）

要求 Node.js 22.18 或更高版本。

```bash
npm install
npm start
```

打开 <http://127.0.0.1:4173>。此模式通过本地服务器读取官方实时数据。

开发时自动重启：

```bash
npm run dev
```

可用环境变量：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `4173` | HTTP 端口 |
| `HOST` | `127.0.0.1` | 监听地址；局域网访问可设为 `0.0.0.0` |
| `HTTPS_PROXY` / `HTTP_PROXY` | 空 | 服务器访问官方端点时使用的代理 |
| `NODE_USE_ENV_PROXY` | 空 | 设为 `1` 时让 Node 使用上面的代理变量 |

如果访问 `api.warframe.com` 失败，可在启动前设置代理：

```powershell
$env:HTTPS_PROXY = 'http://127.0.0.1:7897'
$env:NODE_USE_ENV_PROXY = '1'
npm start
```

## 已实现

### 主页

- 居中主页：站点标题、社交图标和工具搜索框。
- 仅展示可用工具卡片（世界状态、仲裁任务时间表），并保留“更多功能开发中”卡片；未完成的工具不再显示为占位卡片。
- 工具卡片只保留图标和标题，搜索仍按名称、描述与关键词过滤。
- 页脚居中显示 “Powered by DeepSeek & ZJM”。

### 世界状态

- 地球/希图斯（采用希图斯时间）、奥布山谷、魔胎之境、扎里曼号、双衍王境的世界时钟，以及霍瓦尼亚季节。
- 每日刷新（每天 00:00 UTC）和每周刷新（每周一 00:00 UTC）倒计时。
- Darvo 每日特惠。
- 午夜电波：赛季、日常/周常挑战、声望与结束时间。
- 仲裁：使用本地 `arbitration-schedule.csv` 计算当前、下一场和后续场次，不请求第三方 API。
- 警报、入侵、活动。
- 突击、执刑官猎杀、深层科研、时光科研。
- 虚空裂缝拆分为普通、钢铁之路、虚空风暴三个独立模块；模块标题不显示计数。
- 12 列宽屏自适应布局，并用砌体式补位算法让后续模块填入短模块下方的空白；所有模块都会在最小宽度和更大宽度之间自动选择，以填充可用空间。
- 深层/时光科研的个人修正默认展开，显示官方名词、填入可用数值，官方未提供数值时显示明确说明；风险等级的“精英”标签与风险标题同行。
- 可通过“自定义布局”用上下按钮调整模块顺序，顺序保存在本地浏览器。

### 仲裁时间表

- 当前仲裁卡片：节点、任务类型、敌人派系、开始/结束时间和剩余倒计时。
- 按本地时区按天分组的每小时轮换列表；每行显示任务类型和敌人派系。
- 默认从当前时段开始显示，已结束的当天场次自动隐藏。
- 支持日期选择、前一天/后一天、今天、1/3/7/30/90 天范围，以及任务类型、敌人派系筛选。
- 页面每分钟刷新当前状态；不请求第三方 API。

## 官方数据与解析

- 官方数据：`https://api.warframe.com/cdn/worldState.php`
- 解析库：`warframe-worldstate-parser`（MIT，仅作为解析器使用，不请求社区 API）。
- 该解析库默认会为赏金任务补充社区掉落表；`src/official.mjs` 在解析期间拦截所有非 `api.warframe.com` 的请求，因此项目实际只访问官方数据源。
- 仲裁：`public/data/arbitration-schedule.csv` 是提供的静态每小时轮换表；`public/data/arbitration-nodes.json` 和 `public/data/arbitration-node-meta.json` 由 `npm run build:arbitration` 生成显示名、任务类型与敌人派系。
- 服务器缓存 30 秒，页面每 60 秒刷新；GitHub Pages 静态模式读取构建时快照。

## 可选：Render 实时 API / 完整站点

项目包含 [`render.yaml`](render.yaml)，可以直接把现有 Node 服务部署为 Render Web Service。

部署后：

- `https://你的服务.onrender.com/` 是完整站点
- `https://你的服务.onrender.com/api/worldstate?lang=zh` 是实时 API
- 服务已支持 CORS，GitHub Pages 可以跨域调用

### 部署

1. 打开 <https://render.com>，用 GitHub 账号注册并登录。
2. 进入 **New → Blueprint**，选择本仓库。
3. Render 会读取 `render.yaml`，创建免费 Web Service。
4. 点击 **Deploy**。
5. 先测试健康检查：

```powershell
curl.exe -i https://你的服务.onrender.com/api/health
```

6. 再测试官方数据：

```powershell
curl.exe -i "https://你的服务.onrender.com/api/worldstate?lang=zh"
```

返回 HTTP 200 和 `data` 字段，说明 Render 出口可以访问官方 API。

如果 Blueprint 不可用，也可以手动创建 **Web Service**：

```text
Build Command: npm ci
Start Command: npm start
Health Check Path: /api/health
环境变量：HOST=0.0.0.0
```

### 让 GitHub Pages 使用 Render

在 GitHub 仓库 **Settings → Secrets and variables → Actions → Variables** 新建：

```text
名称：WF_NEXUS_API_BASE
值：https://你的服务.onrender.com
```

然后重新运行 Pages 工作流。页面会优先请求 Render，失败时回退静态快照。

### 注意

- Render 免费 Web Service 闲置约 15 分钟后休眠，冷启动约 1 分钟。
- 免费实例约 512 MB 内存、每月 750 实例小时、约 5 GB 出站流量。
- 常开实例约 **$7/月**。
- **Render 出口 IP 也可能被官方 API 返回 403**；先测试 `/api/worldstate`，不要直接设置 Pages 变量。

## 可选：Vercel 实时 API

项目包含一个只负责官方数据解析和 CORS 的 Vercel Function：

```text
api/worldstate.mjs
```

部署后地址形如：

```text
https://warframe-nexus.vercel.app/api/worldstate?lang=zh
```

### 部署

1. 打开 <https://vercel.com/new>，用 GitHub 登录并导入本仓库。
2. Framework Preset 选择 **Other**，Root Directory 保持仓库根目录。
3. 不需要修改 Build Command 或 Output Directory，Vercel 会自动识别 `api/`。
4. 点击 Deploy。
5. 测试接口：

```powershell
curl.exe -i "https://你的项目.vercel.app/api/worldstate?lang=zh"
```

### 切换到 Pages 实时模式

在 GitHub 仓库 **Settings → Secrets and variables → Actions → Variables** 新建：

```text
名称：WF_NEXUS_API_BASE
值：https://你的项目.vercel.app
```

然后重新运行 Pages 工作流。`build:pages` 会把该地址写入页面；页面载入和手动刷新都会请求 Vercel API。

未设置该变量，或 Vercel 请求失败时，页面仍会回退到构建时静态快照。

### 重要限制

- Vercel Hobby 免费计划仅限个人、非商业项目。
- 函数有冷启动，首次请求可能较慢。
- **Vercel 的出口 IP 也未必被官方 API 接受**；如果接口返回 502，先看错误详情。若官方返回 403，说明该平台出口被拒绝，不能靠升级套餐解决。

## GitHub Pages 发布

生成静态发布目录和本地单文件：

```bash
npm run build:pages
npm run build:standalone
```

`build:pages` 生成 `docs/`，`build:standalone` 把同一份官方快照、仲裁表和术语表内联进根目录 `index.html`。`build:standalone` 需要先存在 `docs/data/worldstate-*.json`。

仲裁表更新后，如果需要重新生成节点显示名：

```bash
npm run build:arbitration
```

输出：

```
docs/
  index.html                 ← GitHub Pages 入口
  assets/                    ← CSS / JS / 图标
  locales/                   ← 中英文界面文案
  data/terms.zh.json               ← 官方术语表
  data/worldstate-en.json          ← 官方数据静态快照（英文）
  data/worldstate-zh.json          ← 官方数据静态快照（中文）
  data/arbitration-schedule.csv    ← 仲裁每小时轮换表
  data/arbitration-nodes.json      ← 仲裁节点显示名
  data/arbitration-node-meta.json  ← 仲裁节点任务类型与敌人派系
```

然后二选一：

### A. GitHub Actions 自动刷新（推荐）

仓库已包含 `.github/workflows/pages.yml`：

1. 推送到 GitHub 后，在 Settings → Pages 将 Source 设为 **GitHub Actions**。
2. 工作流会按 `*/10 * * * *` 重新拉取官方数据、构建 `docs/` 并部署。
3. 页面会显示“静态快照”标记，提醒数据不是实时。

### B. 分支 `/docs` 手动发布

1. 执行 `npm run build:pages`。
2. 提交 `docs/`。
3. Settings → Pages → Deploy from a branch → `main` / `/docs`。
4. 之后需要手动重新构建才能更新数据。

根目录的 `index.html` 是自包含离线版本，可以直接用 `file://` 打开；`docs/` 是给 GitHub Pages 使用的常规静态版本。`docs/index.html` 依赖 `fetch` 读取快照，不能直接用 `file://` 打开，需用 HTTP 服务器或部署到 Pages。

## 本地化

界面文案在 `public/locales/zh-CN.json` 与 `public/locales/en.json`，键集合保持一致。

游戏名词由 `public/data/terms.zh.json` 提供，使用 **ee-localization** 从本机 Warframe 缓存提取的官方简中表生成：

```powershell
python ..\.dsh\skills\ee-localization\scripts\extract_localization.py --game warframe --lang zh,en --out ..\out\skill-cache\ee-localization
node scripts\build-terms.mjs --tsv ..\out\skill-cache\ee-localization\Warframe_zh_en.tsv
```

优先使用官方简中；没有直接对应条目的字段保留英文，并在页面上以 `lang="en"` 标记。不会为缺失条目自造译名。

`public/data/zh-hant-map.json` 是繁转简字符表，用于处理解析器中文数据中的繁体字。重新生成（Windows）：

```powershell
npm run build:chars
```

## 目录结构

```
warframe-nexus/
  index.html                自包含离线版（可直接 file:// 打开）
  server.mjs                静态文件 + 官方世界状态代理/缓存
  api/worldstate.mjs        Vercel Function：官方数据解析 + CORS
  vercel.json               Vercel 函数配置
  render.yaml               Render Web Service 蓝图
  src/official.mjs          官方 feed 获取、解析、第三方请求拦截
  public/
    index.html
    assets/css/styles.css
    assets/js/
      app.js                启动、路由、主题、语言、刷新
      normalize.js          世界状态纯函数归一化
      localize.js           官方术语与数据字段本地化
      i18n.js               界面文案与日期/倒计时格式
      pages/events.js       世界状态页
      pages/arbitration.js  仲裁时间表页
      pages/home.js         主页
      pages/placeholder.js  占位页与 404
    locales/                          中英文界面文案
    data/terms.zh.json                官方术语表
    data/arbitration-schedule.csv     仲裁每小时轮换表
    data/arbitration-nodes.json       仲裁节点显示名
    data/arbitration-node-meta.json   仲裁节点任务类型与敌人派系
  scripts/
    build-pages.mjs                   生成 GitHub Pages 静态目录 + 官方快照
    build-standalone.mjs              把 CSS/JS/数据内联成根目录 index.html
    build-arbitration-nodes.mjs       从仲裁表生成节点显示名、任务类型与敌人派系
    build-terms.mjs                   从 ee-localization TSV 生成术语表
    build-char-map.ps1      生成繁转简字符表
  docs/                     GitHub Pages 构建产物
  .github/workflows/pages.yml
  test/                     Node 内置测试
  LICENSE                   MIT 许可证
  THIRD_PARTY_NOTICES.md    第三方依赖许可
  CHANGELOG.md              版本变更记录
```

## 版本发布

```bash
npm ci
npm test
npm run build:pages
npm run build:standalone
```

提交后推送 `main`，在仓库 Settings → Pages 选择 **GitHub Actions**，工作流会部署 `docs/`。建议创建 `v0.3.1` 标签和对应 GitHub Release。

GitHub 托管 runner 访问官方 feed 可能返回 403。构建脚本会复用仓库中已有的 `worldstate-*.json` 快照并继续部署，避免静态站点因上游不可用而中断。需要更新静态快照时，可在能访问官方源的网络环境执行：

```bash
npm run build:pages
npm run build:standalone
```

然后提交 `docs/` 与根目录 `index.html`。若要让 Actions 自动刷新，需要额外配置可访问官方源的代理。

## 测试

```bash
npm test
```

覆盖归一化逻辑（裂缝分类、过期过滤、周常分类、赏金奖励排序等）和中英文文案/术语完整性。

## 浏览器支持

面向当前主流常青浏览器（Chrome、Edge、Firefox、Safari）及移动端浏览器。页面使用标准 CSS 自定义属性、Flexbox、Grid、`clamp()` 和原生 ES Modules；不依赖 `:has()`、CSS nesting、容器查询等较新的特性来实现核心布局。

主题支持：

- 跟随系统浅色 / 深色；
- 手动选择浅色或深色，并记住选择；
- 原生表单控件和滚动条随 `color-scheme` 适配。

## 说明

本项目为个人学习与实用工具项目，采用 MIT 许可证发布。Warframe 及相关名称、资产归 Digital Extremes 所有；本项目是非官方粉丝工具，与 Digital Extremes 无关。

## 许可证

本项目代码采用 [MIT License](LICENSE)。第三方依赖与浏览器解析器所包含代码的许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。Warframe 游戏数据、名称与相关资产归 Digital Extremes 所有，不包含在本项目的 MIT 授权范围内。

---

## English summary

Warframe Nexus is a bilingual Warframe utility hub. The first release implements the **Worldstate** page (world clocks with daily/weekly reset countdowns, Darvo, Nightwave, static-schedule arbitration, alerts, invasions, events, sortie, Archon Hunt, Deep/Temporal Archimedea, and void fissures) and the **Arbitration Schedule** page, with a responsive 12-column widescreen masonry layout and a local layout editor for reordering modules. Unfinished tools keep direct-URL placeholders but are not shown in the header navigation.

The data source is Digital Extremes' official `api.warframe.com/cdn/worldState.php`, parsed locally with `warframe-worldstate-parser`. Open the root `index.html` directly for a self-contained static snapshot (no npm or server required). Run `npm install && npm start` with Node.js 22.18+ for live data.

GitHub Pages is static hosting and the official endpoint has no CORS headers, so a Pages site cannot fetch live data directly. `npm run build:pages` writes a `docs/` site with official-data snapshots; the included Actions workflow deploys on push or manual dispatch. GitHub-hosted runners may receive HTTP 403 from the official feed, in which case the build reuses the committed snapshots. For true real-time data, host the Node server or put a CORS proxy in front of the official feed.
