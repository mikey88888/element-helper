# Electron 元素定位助手使用指南

本工具是 `元素定位助手` Chrome 扩展的 Electron 版本，专门用于在 Electron 应用的调试环境中使用。

## 🎯 适用场景

当您需要调试 Electron 应用中的元素时，本工具可以帮助您：
- 快速获取元素的 XPath 和 CSS 选择器
- 自动生成 Selenium/Playwright/DrissionPage 代码
- 查看 iframe 层级信息
- 高亮显示元素位置

## 🚀 快速开始

### 步骤 1: 启动 Electron 应用

确保 Electron 应用以远程调试模式启动：

```bash
# 示例：使用远程调试端口启动
your-electron-app.exe --remote-debugging-port=8315
```

### 步骤 2: 连接 Chrome 浏览器

1. 打开 Google Chrome 浏览器
2. 在地址栏输入：`http://localhost:8315`
3. 点击进入您要调试的页面

### 步骤 3: 打开 DevTools

1. 按 `F12` 打开开发者工具
2. 切换到 **Console** 标签

### 步骤 4: 注入脚本

1. 打开 `electron_helper.js` 文件
2. 全选复制所有内容（Ctrl+A, Ctrl+C）
3. 在 Chrome DevTools Console 中粘贴（Ctrl+V）
4. 按回车执行

### 步骤 5: 开始使用

- 页面右下角会出现**浮动面板**
- 鼠标悬停在元素上查看信息
- 点击面板按钮复制代码

## 📋 功能说明

### 浮动面板显示内容

| 项目 | 说明 |
|------|------|
| **标签** | 当前元素的 HTML 标签名 |
| **iframe** | 是否在 iframe 中，以及 iframe 深度 |
| **XPath** | 元素的 XPath 选择器 |
| **CSS** | 元素的 CSS 选择器 |
| **Selenium** | 自动生成的 Selenium Python 代码 |
| **Playwright** | 自动生成的 Playwright Python 代码 |
| **DrissionPage** | 自动生成的 DrissionPage Python 代码 |

### 面板按钮功能

| 按钮 | 功能 |
|------|------|
| 📋 XPath | 复制 XPath 到剪贴板 |
| 📋 CSS | 复制 CSS 选择器到剪贴板 |
| 📋 Selenium | 复制 Selenium 代码到剪贴板 |
| 📋 Playwright | 复制 Playwright 代码到剪贴板 |
| 📋 Drission | 复制 DrissionPage 代码到剪贴板 |
| ✨ 高亮 | 高亮当前元素 |
| ❌ 清除 | 清除所有高亮 |

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| F8 | 复制当前元素的 DrissionPage 代码 |
| Alt+1 | 复制当前元素的 XPath |
| ESC | 清除所有高亮 |

## 💡 使用示例

### 示例 1: 获取普通元素的定位代码

1. 鼠标悬停在目标元素上
2. 面板自动显示该元素的信息
3. 点击"📋 Selenium"按钮
4. 代码已复制到剪贴板，可直接粘贴使用

### 示例 2: 获取 iframe 中元素的定位代码

1. 鼠标悬停在 iframe 内的元素上
2. 面板显示"iframe: 是 (深度: X)"
3. 生成的代码会自动包含 iframe 切换逻辑
4. 点击相应的复制按钮

生成的 Selenium 代码示例：
```python
# 切换到 iframe
driver.switch_to.frame(driver.find_element(By.XPATH, "//iframe[@id='main']"))

# 定位元素
element = driver.find_element(By.XPATH, "//input[@id='username']")
```

## 📝 生成的代码格式

### Selenium 代码
```python
# 如果在 iframe 中，会先切换
driver.switch_to.frame(driver.find_element(By.XPATH, "//iframe[@id='main']"))

# 定位元素
element = driver.find_element(By.XPATH, "//input[@id='username']")
```

### Playwright 代码
```python
# 如果在 iframe 中
frame = page.frame_locator("//iframe[@id='main']")
element = frame.locator("//input[@id='username']")

# 如果不在 iframe 中
element = page.locator("//input[@id='username']")
```

### DrissionPage 代码
```python
# 如果在 iframe 中，会先切换
page.to_iframe("//iframe[@id='main']")

# 定位元素
element = page.ele("//input[@id='username']")
```

## 🎨 面板操作

### 移动面板
- 鼠标按住面板顶部的绿色标题栏
- 拖动到想要的位置

### 隐藏/显示面板
- 点击面板右上角的 × 按钮隐藏
- 刷新页面并重新注入脚本可重新显示

### 调整面板大小
- 面板会自动适应内容高度
- 最大高度为视口的 80%

## ⚠️ 注意事项

### 1. 每次刷新页面需要重新注入
由于这是手动注入脚本，不是 Chrome 扩展，所以：
- 每次页面刷新后需要重新粘贴脚本执行
- 建议将脚本内容保存在剪贴板工具中，方便快速粘贴

### 2. 功能限制
与完整版 Chrome 扩展相比，此版本**不支持**：
- ❌ 右键菜单集成
- ❌ 持久化存储
- ❌ 跨复杂 iframe 结构的深度定位
- ❌ 操作面板的高级功能

### 3. iframe 限制
- 支持**同源** iframe 的完整检测
- 对于**跨域** iframe，可能无法获取完整的层级信息
- 嵌套层级太深可能影响性能

### 4. 性能考虑
- 大量 DOM 元素的页面可能有轻微延迟
- 建议在需要时使用，用完后可关闭面板

## 🔧 常见问题

### Q1: 脚本执行后没有出现面板？
**A**: 检查以下几点：
- 确认 Console 没有报错信息
- 确认页面已完全加载
- 尝试刷新页面后重新注入

### Q2: 面板显示"iframe: 否"但实际在 iframe 中？
**A**: 这可能是因为：
- 使用了跨域 iframe（无法检测）
- 尝试切换到不同的 iframe 内页面再注入

### Q3: 复制按钮点击后没有反应？
**A**:
- 检查浏览器是否允许剪贴板访问
- 检查 Console 是否有错误信息
- 尝试手动复制面板中的代码

### Q4: 生成的代码不能使用？
**A**:
- 检查元素是否在动态加载的内容中
- 等待页面完全加载后再获取元素
- 某些特殊元素（如 Canvas、SVG）可能需要手动调整

### Q5: 如何同时调试多个页面？
**A**:
- 每个 Chrome 标签页需要单独注入脚本
- 建议为每个标签页分别注入

## 🎯 最佳实践

1. **保存脚本内容**：将 `electron_helper.js` 的内容保存在常用的代码片段工具中

2. **创建快捷方式**：如果经常使用，可以考虑：
   - 创建 Chrome DevTools snippet
   - 使用支持多行剪贴板的工具

3. **结合使用**：
   - 先用此工具快速定位元素
   - 再用完整版扩展在浏览器中测试

4. **代码优化**：生成的代码可能需要根据实际情况调整

## 📚 与完整版扩展的区别

| 功能 | Electron 版本 | 完整版扩展 |
|------|--------------|-----------|
| 元素定位 | ✅ | ✅ |
| 代码生成 | ✅ | ✅ |
| iframe 支持 | ⚠️ 基础支持 | ✅ 完整支持 |
| 操作面板 | ⚠️ 浮动面板 | ✅ 完整面板 |
| 快捷键 | ✅ 部分支持 | ✅ 完整支持 |
| 右键菜单 | ❌ | ✅ |
| 持久化 | ❌ | ✅ |
| 自动注入 | ❌ | ✅ |

## 🤝 反馈

如有问题或建议，欢迎在 GitHub 提 Issue。

---

**祝使用愉快！** 🎉
