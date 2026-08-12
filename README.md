<div align="center">

# ⚡ A-techer

**🌶️ 科技加持的麻辣鲜师**

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000?logo=vercel&logoColor=white)](https://vercel.com/new)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Turso](https://img.shields.io/badge/DB-Turso-4FF8B3?logo=turso&logoColor=white)](https://turso.tech/)

<p align="center">
  <img src="https://img.shields.io/badge/📅-课程表-10b981" />
  <img src="https://img.shields.io/badge/👩‍🎓-学生管理-3b82f6" />
  <img src="https://img.shields.io/badge/📝-成绩分析-f59e0b" />
  <img src="https://img.shields.io/badge/🏠-家校沟通-ec4899" />
</p>

</div>

---

## 🎀 这是什么？

**A-techer** 是专为小学老师设计的轻量级教学工作台。

它把日常的 **课表、学生管理、成绩分析、作业、背书统计、谈话记录、家校沟通、待办备忘** 等模块整合在一个可爱的 PWA 应用里，手机、平板、电脑都能用 📱💻

头像菜单中的“关于”页集中展示网站简介、品牌口号和当前版本。正式版本发布前显示为开发版，之后只需更新应用版本常量。

> 💡 核心理念：**一个老师，一组任课班级，一个统一工作台。** 顶部班级是学生、成绩、作业、沟通和课表的唯一数据入口，老师只需维护自己真正任教的班级。

### 核心：任课班级工作台

- 注册后班级保持为空，由老师通过“一至六年级 + 班号”选项建立自己的任课班级。
- 顶部班级选择统一驱动学生管理、成绩、作业、背书、家校沟通和班级课表，不再在各模块重复建班。
- 顶部班级矩阵会自然推下顶栏；班级管理占满右侧工作区，统一配置班主任、各科教师及可选联系方式，并支持通过 CSV/Excel 表格批量导入。
- 学校、学校科目和本人任教科目在生涯管理中统一设置；课表直接复用这些资料。
- 每段教职生涯对应一个学期，学期名称与时间段统一由生涯管理提供；“计划任教”可在假期提前配置课表，到达开始日期自动转为“任教中”，结束后自动转为“已完结”。
- “计划任教”和“任教中”合计只允许一条活动生涯；异常经历可冻结为只能查看或删除的“中断”记录。
- 顶栏学期控件统一切换当前与历史学期，历史课表只读；没有任教中或计划任教生涯时，侧栏与顶栏会持续提示补设。

---

## 🍰 功能一览

| 模块 | 说明 |
|------|------|
| 📊 仪表盘 | 今日安排、待办、教育热点一屏掌握 |
| 📅 课表 | 汇总全部任课班级的个人课表、班级课表、全校总表与调课日志 |
| 🏫 班级管理 | 顶部统一维护任课班级，所有教学事务共享同一班级来源 |
| 👩‍🎓 学生管理 | 当前任课班级的学生信息、座位表 |
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
- **数据库**：Turso（libSQL / SQLite 云端版）
- **认证**：JWT + bcrypt

---

## 🚀 一键部署到 Vercel

### 1. 准备代码

先确保项目已推送到 GitHub：

```bash
git clone git@github.com:JacobNg1/FlashBench.git
cd FlashBench
```

### 2. 导入 Vercel

1. 打开 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Add New Project**
3. 选择你的 `FlashBench` GitHub 仓库
4. Framework Preset 选择 **Other**
5. 在 **Environment Variables** 里添加下面三个变量（见下一节）
6. 点击 **Deploy** 🎉

> Vercel 会自动识别 `api/index.py` 作为后端函数，`public/` 目录作为静态前端。

---

## 🗄 连接数据库（Turso）

项目使用 **Turso** 作为云端数据库，每位用户的数据独立存储，支持跨设备同步。

### 1. 创建 Turso 数据库

1. 访问 [Turso](https://turso.tech/) 注册/登录
2. 安装 Turso CLI 并登录：

```bash
turso auth login
turso db create flashbench
turso db tokens create flashbench -a all
```

3. 获取数据库连接地址：

```bash
turso db show flashbench
```

### 2. 在 Vercel 设置环境变量

进入 Vercel 项目的 **Settings → Environment Variables**，添加：

| 变量名 | 说明 |
|--------|------|
| `TURSO_DATABASE_URL` | Turso 数据库地址，格式 `libsql://xxxx.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso 数据库 Token |
| `JWT_SECRET_KEY` | 用于签发登录 Token 的密钥，建议随机生成一串长字符串 |

### 3. 后端自动建表

部署完成后，FastAPI 启动时会自动执行 `CREATE TABLE IF NOT EXISTS`，无需手动建表。

---

## 🔐 注册与登录

- 首次打开页面时，会弹出登录/注册窗口
- 用户名 6-32 位，密码至少 6 位
- 登录成功后，Token 保存在浏览器 `localStorage`，30 天内自动登录
- 每个账号的数据在 Turso 中独立保存

---

## 💻 本地开发

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 设置环境变量（Windows PowerShell）
$env:TURSO_DATABASE_URL="libsql://xxxx.turso.io"
$env:TURSO_AUTH_TOKEN="your-turso-token"
$env:JWT_SECRET_KEY="your-random-secret"

# 3. 启动本地服务
python main.py

# 4. 浏览器打开
open http://localhost:8000
```

---

## 📁 项目结构

```
FlashBench/
├── api/                    # FastAPI 后端
│   ├── index.py            # 应用入口与生命周期
│   ├── db.py               # Turso 数据库操作
│   ├── auth.py             # 注册 / 登录 / JWT
│   └── data.py             # 工作台数据读写接口
├── public/                 # 前端静态资源（Vercel 自动托管）
│   ├── index.html
│   ├── auth.js             # 前端认证逻辑
│   ├── app.js              # 核心引擎
│   ├── modules.js          # 各功能模块
│   ├── style.css           # 样式
│   ├── ui/                 # 图标、国际化与主题模块
│   └── ...
├── main.py                 # 本地开发启动入口
├── requirements.txt        # Python 依赖
├── vercel.json             # Vercel 路由配置
└── README.md               # 本文件
```

---

## 🎨 个性化体验

提供“毛玻璃动态”和“纯色简约”两种主题风格，搭配九套配色；随机配色模式启用后，每次打开都会自动更换颜色。支持浅色、深色与跟随系统模式，界面可在中文和英文之间即时切换。弹窗、抽屉、表格与时间轴使用跟随主题的滚动条。

课表时间段可设置为上课、休息或活动类型，各自带有默认颜色，也可以逐时段自定义。我的课表会将当前周已经过去的日期显示为浅灰。

外观资源集中在 `public/ui/`：`icons.js` 提供本地图标，`i18n.js` 与 `localization-runtime.js` 负责单路径语言本地化，`workspace-header.js` 管理带动画的顶栏班级工作区，`appearance.js` 与 `theme.css` 负责主题。

---

<div align="center">

Powered by Gene · wjj_gene@163.com

</div>
