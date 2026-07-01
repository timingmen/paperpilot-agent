# PaperPilot Agent

PaperPilot 是一款面向科研人员的论文修订 Agent，可将审稿意见转化为可追踪的修订任务队列。系统能够关联原文证据、生成论文修改建议与回复审稿人草稿，并在导出前引入人工审核。

## 核心功能

- 上传论文、审稿意见、期刊指南和参考文献。
- 将审稿意见解析为结构化的待办任务。
- 定位论文中可能需要修改的章节。
- 从论文原文中检索与审稿意见相关的证据。
- 生成有明确范围约束的英文修改建议和回复审稿人内容。
- 在导出 DOCX 前要求用户完成人工审核。
- 将演示项目、任务、上传文本和运行轨迹持久化到本地 JSON 文件。

## 系统架构

- Frontend：React + TypeScript + Vite。
- Backend：FastAPI + Pydantic。
- 文档处理：`python-docx`、`pypdf`。
- Agent pipeline：review parser -> 本地 BGE vector index -> dense evidence retriever -> DeepSeek revision writer -> quality gate。
- 数据存储：本地或演示环境使用 JSON 文件，通过 `PAPERPILOT_DATA_FILE` 配置路径。
- Provider 抽象：`backend/app/agent_service.py` 通过统一的 `AgentProvider` 接口，分别提供离线 `RuleBasedAgentProvider` 和真实的 `DeepSeekRagAgentProvider`。

当 `APP_MODE=deepseek-rag` 时，系统使用 FastEmbed 和 `BAAI/bge-small-en-v1.5` 在本地对论文分块进行 embedding，为每条审稿意见检索相似度最高的证据，再调用 DeepSeek 生成经过 schema 校验的英文修订任务。`APP_MODE=demo` 保留为确定性的离线演示模式，可用于测试和无网络环境下的功能展示。

界面文字以中文呈现，论文修改建议、回复审稿人内容及导出的修订材料保持英文，适配英文论文修订场景。

## 本地运行

### Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

打开 Vite 输出的访问地址，默认通常为 `http://localhost:5173`。

## 环境配置

将 `backend/.env.example` 复制为 `backend/.env`，并根据本地环境填写配置。

```env
APP_MODE=deepseek-rag
CORS_ORIGINS=http://localhost:5173
PAPERPILOT_DATA_FILE=./data/paperpilot_state.json
MAX_UPLOAD_BYTES=8388608
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
EMBEDDING_CACHE_DIR=D:/demo/models/fastembed
RAG_TOP_K=3
RAG_CHUNK_CHARS=900
RAG_CHUNK_OVERLAP=150
```

embedding model 首次运行时会自动下载，之后将从 `EMBEDDING_CACHE_DIR` 复用本地缓存。论文 embedding 和向量检索均在本地完成，仅将当前审稿意见及检索到的证据片段发送给 DeepSeek。

请勿将包含真实 `DEEPSEEK_API_KEY` 的 `.env` 文件提交到版本控制系统。

## 项目验证

在项目根目录运行：

```powershell
$env:PYTHONPATH="backend"; python -m unittest discover -s backend\tests
python -m compileall backend\app
```

在 `frontend/` 目录运行：

```bash
npm test
npm run build
npm audit --audit-level=moderate
```

## 产品流程

1. 创建项目并上传相关源文件。
2. 启动一次分析任务。
3. 查看每条审稿意见、原文证据、修改建议和回复内容。
4. 对每条任务执行“批准”或“要求修改”。
5. 至少批准一条任务后，导出回复审稿人的 DOCX 文档。

## 项目亮点

- 采用 Human-in-the-loop 论文修订工作流，而非通用聊天机器人。
- 使用本地 BGE embedding 实现真实的 dense vector RAG，并通过 DeepSeek 生成有证据支撑的结构化 JSON 内容。
- 通过清晰的 Provider 抽象保留确定性离线分析能力，便于自动化测试和现场演示。
- 使用本地 JSON store 持久化审计状态，后续可平滑替换为 PostgreSQL。
- 测试覆盖数据存储、Provider 边界、DOCX 导出规则及 Frontend 队列指标。
- 升级至 Vite 8 后，dependency audit 当前可通过。
