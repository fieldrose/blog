---
description: 重新构建并部署静态镜像到 Trae 托管站点
---

在项目根目录执行部署脚本，把当前代码重新构建并发布到 Trae 托管站点：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/trae-deploy.ps1 -Title "<本次部署标题>" -Description "<本次变更说明>"
```

执行要求：

1. 标题与说明从「$ARGUMENTS」提炼；未提供时使用脚本默认值。
2. 脚本会自动生成新的静态资源版本、构建、打包、补上 `/` → 301 `/zh/` 规则、上传并等待部署结束，不要手工重复其中任何一步。
3. 成功后向用户汇报访问地址、Deployment ID 与可见性；失败时报告失败阶段、错误码与下一步可执行动作，不要原样重试。
4. Netlify 与 Cloudflare 由 `git push` 自动构建，本命令只针对 Trae 镜像站。
