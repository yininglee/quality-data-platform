# 质量数据平台

用于演示工厂、供应商和平台侧质量管理流程的本地应用，包含业务提报、质量指标和 QE 质量副驾。检验记录与附件使用演示数据。

## 本地运行

使用 Node.js 24 和 pnpm 11.16.0。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

打开终端显示的本地地址，在登录页选择演示角色。若需在本地接入模型，将 `apps/web/.env.example` 复制为 `apps/web/.env.local` 并填写配置。

运行 `pnpm test` 执行测试，运行 `pnpm build` 检查类型并构建应用。
