<div align="center">

# 🌸 Chloe 的超能工作台 ✨

**一位小学英语老师的一站式教学数字化助手**

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000?logo=vercel&logoColor=white)](https://vercel.com/new)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-f59e0b)](LICENSE)

<p align="center">
  <img src="https://img.shields.io/badge/📅-课程表-10b981" />
  <img src="https://img.shields.io/badge/👩‍🎓-学生管理-3b82f6" />
  <img src="https://img.shields.io/badge/📝-成绩分析-f59e0b" />
  <img src="https://img.shields.io/badge/🏠-家校沟通-ec4899" />
</p>

</div>

---

## 🎀 这是什么？

**Chloe 的超能工作台** 是专为小学英语老师设计的轻量级教学工作台。

它把日常的 **课表、学生管理、成绩分析、作业、背书统计、谈话记录、家校沟通、待办备忘** 等模块整合在一个可爱的 PWA 应用里，手机、平板、电脑都能用 📱💻

> 💡 核心理念：**简单、可爱、够用** —— 不需要复杂的系统，只要打开网页就能开始工作。

---

## 🍰 功能一览

| 模块 | 说明 |
|------|------|
| 📊 仪表盘 | 今日安排、待办、教育热点一屏掌握 |
| 📅 我的课表 | 个人课程表 + 全校课程总表 |
| 👩‍🎓 学生管理 | 班级、学生信息、座位表 |
| 📈 成绩分析 | 考试成绩录入与可视化统计 |
| 📝 作业管理 | 作业布置、提交情况追踪 |
| 🔊 背书统计 | 英语背书/默写进度统计 |
| 💬 谈话记录 | 师生谈话记录归档 |
| 🏠 家校沟通 | 家访、家长会、群通知记录 |
| ⭐ 教师锦囊 | 教学工具与 AI 小助手 |
| 📚 学习资源 | 常用教学资源快捷入口 |

---

## 🛠 技术栈

- **前端**：原生 HTML / CSS / JavaScript + Chart.js
- **后端**：FastAPI（Python）
- **部署**：Vercel
- **数据库**：Supabase PostgreSQL（可选，用于云端持久化）

---

## 🚀 一键部署到 Vercel

### 1. 准备代码

先确保项目已推送到 GitHub：

```bash
git clone git@github.com:chloe-sugar/FlashBench.git
cd FlashBench
```

### 2. 导入 Vercel

1. 打开 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Add New Project**
3. 选择你的 `FlashBench` GitHub 仓库
4. Framework Preset 选择 **Other**
5. 点击 **Deploy** 🎉

> Vercel 会自动识别 `api/index.py` 作为后端函数，`public/` 目录作为静态前端。

### 3. 绑定自定义域名（可选）

部署完成后，在 Vercel 项目的 **Domains** 里添加你自己的域名，比如 `chloe.jacobng.ccwu.cc`。

---

## 🐘 连接数据库（Supabase）

项目默认使用浏览器 `localStorage` 存储数据。如果想跨设备同步、防止数据丢失，可以接入 **Supabase** 免费 PostgreSQL。

### 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com/) 注册/登录
2. 新建一个 Project
3. 进入 **Project Settings → Database**，复制 **Connection string**

### 2. 在 Vercel 设置环境变量

进入 Vercel 项目的 **Settings → Environment Variables**，添加：

| 变量名 | 说明 |
|--------|------|
| `DATABASE_URL` | Supabase 的 PostgreSQL 连接字符串 |

连接字符串格式类似：

```
postgresql://postgres:[密码]@db.[项目ID].supabase.co:5432/postgres
```

### 3. 建表

在 Supabase 的 **SQL Editor** 里执行：

```sql
CREATE TABLE workbench_data (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default',
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_workbench_data_user ON workbench_data(user_id);
```

### 4. 完成 ✅

后端会通过 `DATABASE_URL` 自动连接数据库，前端保存数据时就会同步到 Supabase 云端。

---

## 💻 本地开发

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 启动本地服务
python main.py

# 3. 浏览器打开
open http://localhost:8000
```

---

## 📁 项目结构

```
FlashBench/
├── api/
│   └── index.py          # FastAPI 后端入口
├── public/               # 前端静态资源（Vercel 自动托管）
│   ├── index.html
│   ├── app.js
│   ├── modules.js
│   ├── style.css
│   └── ...
├── main.py               # 本地开发启动入口
├── requirements.txt      # Python 依赖
├── vercel.json           # Vercel 路由配置
└── README.md             # 本文件
```

---

## 🌈 关于 Chloe

这个项目是为一位可爱又努力的小学英语老师打造的 💐

希望它能让每一天的教学工作都更轻松一点点 ✨

---

<div align="center">

Made with 💚 for Chloe

</div>
