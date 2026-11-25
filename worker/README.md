# Warframe Nexus API Worker

一个只做官方数据转发和 CORS 的 Cloudflare Worker。它不解析数据，原始
`api.warframe.com/cdn/worldState.php` JSON 会交给浏览器端的
`warframe-worldstate-parser` 解析。

## 1. 注册 Cloudflare

1. 打开 <https://dash.cloudflare.com/sign-up>。
2. 用邮箱注册并完成邮箱验证。
3. 不需要添加域名，也不需要付费套餐；Workers 免费计划即可。

## 2. 登录 Wrangler

在项目根目录执行：

```powershell
npx wrangler login
```

浏览器会打开授权页面，登录 Cloudflare 并允许 Wrangler 访问账号。

## 3. 首次部署

```powershell
npx wrangler deploy --config worker/wrangler.toml
```

首次部署时 Cloudflare 会让你设置 `workers.dev` 子域名。例如填写
`zjm960929`，部署完成后地址类似：

```text
https://warframe-nexus-api.zjm960929.workers.dev
```

测试接口：

```powershell
curl.exe -i https://warframe-nexus-api.zjm960929.workers.dev/worldstate
```

应返回 `200`、`Content-Type: application/json`，并包含
`Access-Control-Allow-Origin: *`。

## 4. 配置 GitHub Pages 实时模式

在 GitHub 仓库：

1. **Settings → Secrets and variables → Actions**
2. 打开 **Variables** 标签
3. 新建变量：

```text
名称：WF_NEXUS_API_BASE
值：https://warframe-nexus-api.zjm960929.workers.dev
```

4. 重新运行 **Deploy Warframe Nexus to GitHub Pages** 工作流，或推送一次提交。

`build:pages` 会把变量写入页面：

- `wf-nexus-mode=live`
- `wf-nexus-api=<Worker 地址>`

线上页面此时会在每次进入世界状态页或点击“刷新数据”时请求 Worker，再由
浏览器解析官方数据，不再读取静态快照。

## 5. 本地开发

```powershell
npx wrangler dev --config worker/wrangler.toml
```

然后在另一个终端设置：

```powershell
$env:WF_NEXUS_API_BASE = 'http://127.0.0.1:8787'
npm run build:pages
```

## 免费额度

- Workers 免费计划按请求数和 CPU 时间计量，个人工具站通常足够。
- Worker 不缓存数据，每次请求都会向官方 feed 发起请求；官方端点自身有约
  35 秒缓存。
- 如果流量增长，可以升级到 Workers Paid，或加 Cache API/KV 缓存。

## 限制

- Worker 只负责转发，不绕过 Digital Extremes 的访问策略。如果 Cloudflare
  出口 IP 被官方拒绝，需要检查官方端点状态。
- 本项目不会把数据发送到第三方世界状态 API。
