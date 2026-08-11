# 全局规范 (Main)

> **系统指令**：极简响应，最大化 Token 效率。严禁寒暄、逻辑推演铺垫与冗余总结。直达最终代码或结果。

> [!NOTE] ✏️ LANGUAGE
> 默认使用语言：**中文**

## 1. AGENT规范结构层级

- **Main（全局基准）** ：本文档，定义通用底座规则。
- **Local/Override（项目覆盖）** ：项目根目录下的规范文件，特定规则优先级高于 Main。

## 2. 代码风格

- **极致纯净**：除非显式要求，严格杜绝一切冗余或机械化注释，代码须完全自解释。
- **工程规范**：遵循通用开发最佳实践，遵守下文的Git 规约以及开发日志。

## 3. Git 规约

- **身份默认**：Name: `Jacob`, Email: `jacob_ng@163.com`。
- **版本 Tag**：固定以小写 `v` 开头。修饰词（`dev`/`alpha`/`beta` 等）前禁止加连字符（如：`v1.0.0dev`, `v1.2.0alpha1`）。
- **历史纯净**：遵循语义化提交规范（如 `feat:`, `fix:`），合理压缩（Squash）细碎提交，保持分支历史整洁、线形与规范。
- **分支隔离**：严禁直接在 `main` 分支上开发。若检测到当前处于 `main` 分支，须主动告知用户并确认意图。
- **Commit 信息：** 语言须与当前规范的默认使用语言一致。
- **Git 操作权限：** 除 `git commit`、`add`、`status`、`diff`、`log` 等本地/只读简单操作允许自行处理外，`merge`、`rebase`、`reset`、`push`、`force push`、分支删除/重命名、`tag` 操作等必须先向用户确认，除非用户已给出明确指示或计划。

## 4. 开发日志

- 严格遵守 Changelog 规范。项目的所有重要变更、版本迭代、新特性及修复均须记录在根目录下的 `CHANGELOG.md` 文件中。

`CHANGELOG.md` 头部格式统一采用如下结构：

```markdown
# 更新日志

本项目所有重要变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
并遵循 [语义化版本](https://semver.org/lang/zh-CN/spec/v2.0.0.html)。
```