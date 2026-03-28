# TapNow Lite（本地版）

一个轻量的单页网站，目标是复刻 TapNow 里最核心的体验：

- 项目管理（多项目切换）
- 无限画布（拖拽/缩放/平移）
- 即时保存（本地自动保存）
- 换电脑后通过同网址继续（配合导入导出 JSON，或后续接入云存储）
- 接入本地大模型（OpenAI 兼容接口：Ollama / LM Studio / LocalAI）

## 快速运行

```bash
python3 -m http.server 8080
```

浏览器访问：`http://127.0.0.1:8080`

## 本地大模型接入说明

1. 启动本地模型服务（例如 Ollama + OpenAI 兼容网关）。
2. 在左侧填写：
   - API Base：如 `http://127.0.0.1:11434/v1`
   - 模型名：如 `qwen2.5:14b`
   - API Key：本地服务一般可留空
3. 点击“保存模型配置”后即可发送提示词。

> 如果调用失败，请检查本地服务是否已启动，以及 CORS 是否允许当前网页来源。

## 数据持久化

- 默认保存在浏览器 `localStorage`（键名：`tapnow-lite.v1`）。
- 可通过“导出 JSON / 导入 JSON”实现跨设备迁移。

## 后续可扩展

- 使用 Supabase / Appwrite / Firebase 实现账号登录与云端同步。
- 画布元素扩展（连线、图片、Markdown 卡片、任务状态流转）。
- WebSocket 协作编辑。
