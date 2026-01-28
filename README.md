# 元素定位助手 v10.1

一款强大的浏览器元素定位助手 Chrome 扩展，支持 XPath/CSS 选择器验证、高亮，并能生成 Selenium、Playwright、DrissionPage 代码。

## ✨ 主要功能

- 🔍 **智能元素定位**: 点击网页元素即可获取 XPath/CSS 选择器
- ✅ **选择器验证**: 实时验证 XPath/CSS 选择器的准确性
- 🎯 **元素高亮**: 一键高亮匹配的元素，直观查看定位结果
- 🐍 **代码生成**: 自动生成 Python 自动化代码（Selenium/Playwright/DrissionPage）
- 🖼️ **iframe 支持**: 完美支持跨框架元素定位
- 📝 **操作面板**: 可视化操作面板，Alt+O 快速打开
- ⌨️ **快捷键**: Alt+E 启停插件，Alt+O 打开面板，Alt+1 复制 XPath

## 🚀 快速开始

### 安装方法

1. 下载本项目的 `.zip` 文件
2. 解压到本地目录
3. 打开 Chrome 浏览器，访问 `chrome://extensions/`
4. 开启"开发者模式"
5. 点击"加载已解压的扩展程序"
6. 选择解压后的文件夹

### 使用方法

#### 快捷键

- `Alt + E`: 启用/禁用插件
- `Alt + O`: 打开/关闭操作面板
- `Alt + 1`: 复制智能 XPath
- `F8`: 复制鼠标所在处元素语法
- `F9`: 深度扫描定位动态元素

#### 操作面板

1. 按 `Alt+O` 打开操作面板
2. 点击"选择元素"按钮进入选择模式
3. 点击网页上的元素获取其选择器
4. 使用"验证"按钮测试选择器
5. 使用"高亮"按钮查看所有匹配元素
6. 查看自动生成的 Python 代码

#### 右键菜单

- 在网页元素上右键
- 选择对应功能（复制 XPath、复制语法等）

#### 悬浮球

- 点击页面右侧的悬浮球
- 选择需要的功能

## 📸 功能演示

### 操作面板
- 可视化操作界面
- XPath/CSS 编辑器
- 验证结果显示
- 代码预览和复制

### 元素高亮
- 支持同时高亮多个元素
- 红色边框清晰标识
- 支持跨 iframe 高亮

### 代码生成
- 支持三种框架：
  - **Selenium**: 标准 Python 自动化框架
  - **Playwright**: 现代化的端到端测试框架
  - **DrissionPage**: 自动化库，结合浏览器控制和 requests

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **框架**: jQuery 3.7.1, jQuery UI
- **开发工具**: Chrome Extension Manifest V3

## 📁 项目结构

```
ele_helper_10.1/
├── manifest.json          # 扩展配置文件
├── popup.html             # 弹出页面
├── content.js             # 内容脚本
├── operation_panel.js     # 操作面板逻辑
├── v10_1_enhancements.js  # 增强功能
├── iframe_handler.js      # iframe 处理
├── code_generator.js      # 代码生成器
├── background.js           # 后台服务
├── css/                   # 样式文件
│   ├── content.css
│   ├── operation_panel.css
│   └── jquery-ui.css
├── js/                    # JavaScript 库
│   ├── jquery-3.7.1.min.js
│   └── jquery-ui.js
└── img/                   # 图片资源
    ├── icon.png
    └── ...
```

## 🎯 使用场景

- **自动化测试**: 快速获取元素定位器
- **网页爬虫**: 验证 XPath/CSS 选择器
- **学习调试**: 理解网页结构和元素定位
- **DrissionPage 开发**: 辅助编写自动化脚本

## 📝 更新日志

### v10.1 (2024-01-27)
- ✨ 新增可视化操作面板
- ✨ 新增 iframe 元素定位支持（支持嵌套 iframe）
- ✨ 新增跨框架验证和高亮功能
- ✨ 新增 Python 代码生成（Selenium/Playwright/DrissionPage）
- ✨ 新增元素选择模式（类似 F12）
- ✨ 新增 Alt+E 和 Alt+O 快捷键
- 🐛 修复取消高亮无法跨 iframe 的问题
- 🧹 清理所有广告和推广内容
- 🔄 重命名核心类和方法（Sao → xiong）
- 🗑️ 移除定位功能（与高亮重复）


## ⌨️ 快捷键一览

| 快捷键 | 功能 |
|--------|------|
| Alt + E | 启用/禁用插件 |
| Alt + O | 打开/关闭操作面板 |
| Alt + 1 | 复制智能 XPath |
| F8 | 复制鼠标所在处元素语法 |
| F9 | 深度扫描定位动态元素 |
| ESC | 退出选择模式 |

## 🎯 核心功能详解

### 1. 智能元素定位

支持多种定位策略：
- ID 定位
- Name 属性定位
- Class 定位
- XPath 定位
- CSS 选择器定位

### 2. iframe 支持

完美支持复杂场景：
- 单层 iframe
- 嵌套多层 iframe
- 同源和跨源 iframe
- frameChain 自动追踪

### 3. 代码生成

生成的代码包含：
- iframe 切换逻辑（如果需要）
- 元素定位语句
- 简洁易读的注释
- 三行核心代码

示例（Selenium）：
```python
driver.switch_to.frame(driver.find_element(By.XPATH, "//iframe[@id='main']"))
element = driver.find_element(By.XPATH, "//input[@id='username']")
```

示例（Playwright）：
```python
frame1 = page.frame_locator("//iframe[@id='main']")
element = frame1.locator("//input[@id='username']")
```

示例（DrissionPage）：
```python
page.to_iframe("//iframe[@id='main']")
element = page.ele("//input[@id='username']")
```

### 4. 验证和高亮

- 实时验证选择器语法
- 显示匹配元素数量
- 高亮显示所有匹配元素
- 支持跨框架验证和高亮

## ⚠️ 注意事项

1. 本扩展仅用于学习和开发辅助
2. 请遵守目标网站的使用条款
3. 不得用于任何非法用途
4. 使用前请了解相关法律法规

## 📄 开源协议

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 反馈

如有问题或建议，欢迎在 GitHub 提 Issue。

---

**祝使用愉快！** 🎉
