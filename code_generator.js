// Python 代码生成器 - v10.1 技术架构增强
// 支持 Selenium、Playwright 和 DrissionPage 代码生成

class PythonCodeGenerator {
    constructor() {
        this.currentFramework = 'selenium'; // 默认框架
    }

    // 清理 XPath 字符串
    cleanXPath(xpath) {
        // 移除 xpath: 前缀
        let cleaned = xpath.replace(/^xpath:/, '');
        // 转义双引号
        cleaned = cleaned.replace(/"/g, '\\"');
        return cleaned;
    }

    // 生成 Selenium 代码（简洁版）
    generateSelenium(xpath, iframeContext = null) {
        const cleanXPath = this.cleanXPath(xpath);

        let code = '';

        // 解析 iframe 层级
        if (iframeContext && iframeContext !== 'top') {
            const iframeLevels = iframeContext.split(' > ').map(s => s.trim());
            iframeLevels.forEach(iframeXpath => {
                code += `driver.switch_to.frame(driver.find_element(By.XPATH, "${iframeXpath}")))\n`;
            });
        }

        // 定位元素
        code += `element = driver.find_element(By.XPATH, "${cleanXPath}")`;

        return code;
    }

    // 生成 Playwright 代码（简洁版）
    generatePlaywright(xpath, iframeContext = null) {
        const cleanXPath = this.cleanXPath(xpath);

        let code = '';

        // 解析 iframe 层级 - 使用链式 frame_locator
        if (iframeContext && iframeContext !== 'top') {
            const iframeLevels = iframeContext.split(' > ').map(s => s.trim());
            let frameVar = 'page';

            iframeLevels.forEach((iframeXpath, idx) => {
                const varName = idx === 0 ? 'frame1' : `frame${idx + 1}`;
                code += `${varName} = ${frameVar}.frame_locator("${iframeXpath}")\n`;
                frameVar = varName;
            });

            code += `element = ${frameVar}.locator("${cleanXPath}")`;
        } else {
            code += `element = page.locator("${cleanXPath}")`;
        }

        return code;
    }

    // 生成 DrissionPage 代码（简洁版）
    generateDrissionPage(xpath, iframeContext = null) {
        const cleanXPath = this.cleanXPath(xpath);

        let code = '';

        // 解析 iframe 层级
        if (iframeContext && iframeContext !== 'top') {
            const iframeLevels = iframeContext.split(' > ').map(s => s.trim());
            iframeLevels.forEach(iframeXpath => {
                code += `page.to_iframe("${iframeXpath}")\n`;
            });
        }

        // 定位元素
        code += `element = page.ele("${cleanXPath}")`;

        return code;
    }

    // 生成通用代码模板
    generateGenericTemplate(xpath, framework, options = {}) {
        switch (framework.toLowerCase()) {
            case 'selenium':
                return this.generateSelenium(xpath, options.iframeContext);
            case 'playwright':
                return this.generatePlaywright(xpath, options.iframeContext);
            case 'drissionpage':
                return this.generateDrissionPage(xpath, options.iframeContext);
            default:
                return `# 不支持的框架: ${framework}`;
        }
    }

    // 生成代码文件名
    generateFileName(framework) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        return `element_locator_${framework}_${timestamp}.py`;
    }

    // 格式化代码用于显示
    formatCodeForDisplay(code) {
        // 先进行 HTML 转义，防止代码中的 < > 被误认为是 HTML 标签
        let escaped = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // 再进行语法高亮（注意：此时已经转义，需要用转义后的字符匹配）
        return escaped
            .replace(/&quot;([^&]|&(?!quot;))*&quot;/g, '<span class="code-string">$&</span>')
            .replace(/&apos;([^&]|&(?!apos;))*&apos;/g, '<span class="code-string">$&</span>')
            .replace(/#.*$/gm, '<span class="code-comment">$&</span>')
            .replace(/\b(import|from|class|def|return|try|except|finally|if|else|while|for)\b/g, '<span class="code-keyword">$&</span>');
    }

    // 获取纯文本代码（用于复制和下载）
    getPlainTextCode(code) {
        // 直接返回原始代码，不做任何 HTML 处理
        return code;
    }
}

// 导出代码生成器实例
const pythonCodeGenerator = new PythonCodeGenerator();

console.log('[CodeGenerator] Ready - Python code generation enabled');
