# Xer - X (Twitter) 自动化助手

**Xer** 是一个强大的 Chrome 扩展程序，专为 X.com (推特) 设计，提供智能化的自动化交互功能。它结合了传统的自动化脚本与现代 AI 技术，能够由 AI 生成符合上下文的回复，解放你的双手。

![Status](https://img.shields.io/badge/Status-Production%20Ready-green)
![Tech](https://img.shields.io/badge/Tech-React%20%7C%20Vite%20%7C%20TypeScript-blue)

---

## ✨ 核心功能

### 🤖 全自动交互
*   **自动滚动 (Auto-Scroll)**: 智能浏览信息流，模拟人类阅读节奏。
*   **自动点赞 (Auto-Like)**: 自动点赞可视区域内的推文。
*   **自动回复 (Auto-Reply)**:
    *   **AI 驱动**: 调用 LLM (如 OpenAI/Gemini) 理解推文内容。
    *   **语境感知**: 自动识别推文语言，生成**同语言**（中文回中文，英文回英文）的自然回复。
    *   **拟人化延迟**: 打开回复框后和发送前均有随机延迟，模拟真实输入。
*   **自动转推 (Auto-Retweet)**: 支持自动转发。

### 🧠 智能 AI 集成
*   **高度可配**: 支持所有 OpenAI 兼容格式的 API (ChatGPT, Claude, Gemini via Proxy 等)。
*   **自定义模型**: 你可以指定任意模型名称 (gpt-4o, gpt-3.5-turbo, etc.)。
*   **Prompt 优化**: 内置专业 Prompt，确保回复风格友好、简短且相关。

### 🛡️ 安全与稳定性 (Production Grade)
*   **去重机制**: 自动记录已交互的 Tweet ID，**永不重复**点赞或回复同一条推文。
*   **每日限制**: 可设置每天的点赞、回复、转推最大次数，防止账号风控。
*   **随机间隔**: 所有操作均在设定的 `Min - Max` 秒数之间随机触发，避免机械化操作特征。
*   **持久化存储**: 历史记录和配置保存于本地 `chrome.storage`，重启浏览器不丢失。

### � 现代化界面
*   **侧边栏 (Side Panel)**: 完美融合 Chrome 侧边栏，不干扰主页面浏览。
*   **原生体验**: 经过精心调优的 **Light Theme** (亮色主题)，与 X.com 原生风格浑然一体。
*   **多语言支持 (I18n)**: 内置 简体中文、繁體中文、English、Русский 界面。
*   **测试实验室**: 提供手动触发按钮 (Test Tab)，方便调试每一个动作。

---

## 🚀 安装指南

### 1. 构建项目
确保你安装了 Node.js (推荐 v18+)。

```bash
# 克隆项目
git clone https://github.com/your-repo/xer.git

# 安装依赖
npm install

# 构建生产版本 (输出到 dist 目录)
npm run build
```

### 2. 加载到 Chrome
1.  打开 Chrome 浏览器，访问 `chrome://extensions/`。
2.  开启右上角的 **"开发者模式" (Developer mode)**。
3.  点击 **"加载已解压的扩展程序" (Load unpacked)**。
4.  选择项目根目录下的 **`dist`** 文件夹。

---

## 📖 使用说明

1.  **固定扩展**: 在浏览器工具栏固定 **Xer** 图标。
2.  **打开侧边栏**: 点击 Xer 图标打开侧边栏控制面板。
3.  **配置 AI**:
    *   进入 **设置 (Settings)** 标签页。
    *   填写你的 `API Key` (OpenAI 格式)。
    *   (可选) 修改 API Base URL (如果你使用中转服务) 和 模型名称。
4.  **调整参数**: 根据需要调整“滚动间隔”、“点赞间隔”以及“每日限制”。
5.  **启动**: 回到 **仪表盘 (Dashboard)**，点击 **"开始任务" (Start Task)**。

---

## 🛠️ 技术栈
*   **Core**: React 18, TypeScript
*   **Build Tool**: Vite (极速构建)
*   **Extension Framework**: Manifest V3, CRXJS
*   **Styling**: CSS Variables (Twitter Design System)
*   **Icons**: Native PNG generation (System.Drawing)

---

## ⚠️ 免责声明
本工具仅供学习和研究使用。使用自动化工具操作社交媒体账号存在被平台封禁的风险 (Shadowban/Suspension)。请务必设置合理的**时间间隔**和**每日限制**。作者不对因使用本工具导致的任何账号损失负责。

---
**License**: MIT