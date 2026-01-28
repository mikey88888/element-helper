// 操作面板类 - v10.1
// 用于替换原有的跟随鼠标信息展示栏，提供完整的编辑、验证、高亮功能

// ========== 智能 XPath 生成器类 ==========
class IntelligentXPathGenerator {
    constructor() {
        // 动态 ID 检测规则（污点检测）
        this.dynamicIDPatterns = [
            /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i,  // UUID/Hash
            /^\d+$/,                                                             // 纯数字
            /^(ember|ng-|react-|vue-|_|__)/,                                     // 框架前缀
            /\d{6,}$/,                                                           // 编号ID（6位以上数字）
            /[a-z0-9]{20,}/                                                      // 随机长字符串
        ];

        // v10.1 技术架构增强 - 初始化上下文管理器
        if (typeof IframeContextManager !== 'undefined') {
            this.iframeManager = new IframeContextManager();
        } else {
            this.iframeManager = null;
        }

        if (typeof ShadowDOMDetector !== 'undefined') {
            this.shadowDetector = new ShadowDOMDetector();
        } else {
            this.shadowDetector = null;
        }
    }

    // 生成智能 XPath（主方法）
    generate(element) {
        const candidates = [];

        // 按优先级生成候选
        candidates.push(this.tryDataTestId(element));
        candidates.push(this.tryID(element));
        candidates.push(this.tryName(element));
        candidates.push(this.tryAriaLabel(element));
        candidates.push(this.tryPlaceholder(element));
        candidates.push(this.trySingleClass(element));
        candidates.push(this.tryTagWithText(element));
        candidates.push(this.trySmartParent(element));
        candidates.push(this.tryFullXPath(element));

        // 过滤有效候选并排序
        const valid = candidates.filter(c => c && this.isUnique(c.xpath));
        valid.sort((a, b) => b.score - a.score);

        // 返回最高分 > 60 的，否则返回完整 XPath
        const best = valid.find(c => c.score > 60);
        return best ? best.xpath : (valid[valid.length - 1]?.xpath || this.tryFullXPath(element).xpath);
    }

    // 检查是否为动态 ID
    isDynamicID(id) {
        if (!id) return false;
        return this.dynamicIDPatterns.some(pattern => pattern.test(id));
    }

    // 检查 XPath 是否唯一
    isUnique(xpath) {
        try {
            const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            return result.snapshotLength === 1;
        } catch (e) {
            return false;
        }
    }

    // 尝试 data-test-id / data-cy（优先级最高：100分）
    tryDataTestId(element) {
        const testId = element.getAttribute('data-test-id') || element.getAttribute('data-cy');
        if (testId) {
            const xpath = `//*[@data-test-id='${testId}']`;
            return { xpath, score: 100, method: 'data-test-id' };
        }
        return null;
    }

    // 尝试 ID（稳定ID: 90分，动态ID: 0分）
    tryID(element) {
        if (element.id) {
            const xpath = `//*[@id='${element.id}']`;
            const score = this.isDynamicID(element.id) ? 0 : 90;
            return { xpath, score, method: element.id };
        }
        return null;
    }

    // 尝试 name 属性（80分）
    tryName(element) {
        const name = element.getAttribute('name');
        if (name) {
            const xpath = `//${element.tagName}[@name='${name}']`;
            return { xpath, score: 80, method: 'name' };
        }
        return null;
    }

    // 尝试 aria-label（70-75分）
    tryAriaLabel(element) {
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.trim()) {
            const escaped = ariaLabel.replace(/'/g, "\\'");
            const xpath = `//${element.tagName}[@aria-label='${escaped}']`;
            const score = ariaLabel.length > 0 ? 75 : 70;
            return { xpath, score, method: 'aria-label' };
        }
        return null;
    }

    // 尝试 placeholder（70分）
    tryPlaceholder(element) {
        const placeholder = element.getAttribute('placeholder');
        if (placeholder && placeholder.trim()) {
            const escaped = placeholder.replace(/'/g, "\\'");
            const xpath = `//${element.tagName}[@placeholder='${escaped}']`;
            return { xpath, score: 70, method: 'placeholder' };
        }
        return null;
    }

    // 尝试单个 class（60分）
    trySingleClass(element) {
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.trim().split(/\s+/).filter(c => c && c.length > 0);
            if (classes.length === 1) {
                const xpath = `//${element.tagName}[@class='${classes[0]}']`;
                return { xpath, score: 60, method: 'single-class' };
            }
        }
        return null;
    }

    // 尝试 tag + text（40-50分）
    tryTagWithText(element) {
        const text = element.textContent?.trim();
        if (text && text.length > 0 && text.length < 50) {
            const escapedText = text.replace(/'/g, "\\'");
            const xpath = `//${element.tagName}[text()='${escapedText}']`;
            const score = text.length > 20 ? 40 : 50;
            return { xpath, score, method: 'tag+text' };
        }
        return null;
    }

    // 尝试智能父节点定位（70分）
    trySmartParent(element) {
        let parent = element.parentElement;
        if (!parent) return null;

        // 向上查找有 ID 或稳定属性的父节点
        let depth = 0;
        const maxDepth = 3;

        while (parent && depth < maxDepth) {
            if (parent.id && !this.isDynamicID(parent.id)) {
                // 在父节点下定位当前元素
                const siblings = Array.from(parent.children).filter(c => c.tagName === element.tagName);
                const index = siblings.indexOf(element) + 1;
                const xpath = `//*[@id='${parent.id}']//${element.tagName}[${index}]`;
                return { xpath, score: 70, method: 'parent-id' };
            }
            parent = parent.parentElement;
            depth++;
        }

        return null;
    }

    // 生成完整 XPath（保底方案：10分）
    tryFullXPath(element) {
        const parts = [];
        let current = element;

        while (current && current.nodeType === Node.ELEMENT_NODE) {
            let index = 1;
            let sibling = current.previousSibling;

            while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }

            const tagName = current.tagName.toLowerCase();
            parts.unshift(`${tagName}[${index}]`);
            current = current.parentElement;
        }

        const xpath = '/' + parts.join('/');
        return { xpath, score: 10, method: 'full-xpath' };
    }

    // ========== v10.1 技术架构增强 - 生成包含上下文的 XPath ==========

    // 生成包含 iframe 上下文的增强 XPath
    generateWithIframeContext(element) {
        const baseXPath = this.generate(element);

        if (!this.iframeManager) {
            return {
                xpath: baseXPath,
                iframeContext: null,
                fullExpression: baseXPath
            };
        }

        const framePath = this.iframeManager.framePath;
        const frameXPath = this.iframeManager.getFrameXPath();

        if (framePath === 'top') {
            return {
                xpath: baseXPath,
                iframeContext: null,
                fullExpression: baseXPath
            };
        }

        // 返回包含 iframe 上下文的结果
        return {
            xpath: baseXPath,
            iframeContext: {
                framePath: framePath,
                frameXPath: frameXPath,
                frameId: this.iframeManager.frameId
            },
            fullExpression: `Frame: ${framePath} > ${baseXPath}`,
            displayFormat: `📍 Iframe: ${framePath}\nXPath: ${baseXPath}`
        };
    }

    // 生成包含 Shadow DOM 上下文的增强 XPath
    generateWithShadowDOMContext(element) {
        if (!this.shadowDetector) {
            return {
                xpath: this.generate(element),
                shadowContext: null,
                warning: null
            };
        }

        const shadowInfo = this.shadowDetector.isInsideShadowDOM(element);

        if (!shadowInfo.inside) {
            return {
                xpath: this.generate(element),
                shadowContext: null,
                warning: null
            };
        }

        // 在 Shadow DOM 中
        if (shadowInfo.mode === 'closed') {
            return {
                xpath: null,
                shadowContext: {
                    inside: true,
                    mode: 'closed',
                    accessible: false
                },
                warning: '⚠️ 元素位于 closed 模式的 Shadow DOM 中，无法生成 XPath',
                alternative: `Shadow Host: ${this.generate(shadowInfo.host)}`
            };
        }

        // Open 模式 Shadow DOM
        const hostXPath = this.generate(shadowInfo.host);
        const innerPath = this.shadowDetector.getInnerPath(element, shadowInfo.host);

        return {
            xpath: null,  // XPath 无法直接进入 Shadow DOM
            shadowContext: {
                inside: true,
                mode: 'open',
                accessible: true,
                hostXPath: hostXPath,
                innerPath: innerPath
            },
            warning: '⚠️ 元素位于 Shadow DOM 中，标准 XPath 无法直接访问',
            suggestion: `需要使用 JavaScript 或 Playwright 的 Shadow DOM 支持`,
            fullDescription: `${hostXPath} >> Shadow Root >> ${innerPath}`
        };
    }

    // 综合生成方法（包含所有上下文）
    generateWithContext(element) {
        // 先检查 Shadow DOM
        const shadowResult = this.generateWithShadowDOMContext(element);

        // 如果在 Shadow DOM 中，返回 Shadow DOM 上下文
        if (shadowResult.shadowContext && shadowResult.shadowContext.inside) {
            return shadowResult;
        }

        // 检查 iframe 上下文
        const iframeResult = this.generateWithIframeContext(element);

        return iframeResult;
    }

    // 获取生成方法信息（用于调试）
    getMethodInfo(element) {
        const candidates = [];

        candidates.push(this.tryDataTestId(element));
        candidates.push(this.tryID(element));
        candidates.push(this.tryName(element));
        candidates.push(this.tryAriaLabel(element));
        candidates.push(this.tryPlaceholder(element));
        candidates.push(this.trySingleClass(element));
        candidates.push(this.tryTagWithText(element));
        candidates.push(this.trySmartParent(element));
        candidates.push(this.tryFullXPath(element));

        const valid = candidates.filter(c => c && this.isUnique(c.xpath));
        valid.sort((a, b) => b.score - a.score);

        return valid.map(c => `${c.method}(${c.score})`).join(' > ');
    }
}

// ========== 操作面板类 ==========
class OperationPanel {
    constructor() {
        this.panel = null;
        this.isVisible = false;
        this.isMinimized = false;
        this.currentElement = null;
        this.highlightedElements = [];
        this.isSelectingMode = false;  // v10.1 - 是否在选择模式
        this.selectModeOverlay = null; // v10.1 - 选择模式遮罩层
        this.selectModeMouseMove = null;
        this.selectModeClick = null;
        this.selectModeKeyDown = null;
        this.xpathGenerator = new IntelligentXPathGenerator();  // v10.1.1 - 智能 XPath 生成器
        this.currentGeneratedCode = {};  // v10.1.7 - 保存原始代码（不含 HTML）
        // v10.1 - 固定在右侧，不需要保存位置
        this.init();
    }

    async init() {
        // 只在主页面创建操作面板
        if (window !== window.top) {
            console.log('[OperationPanel] In iframe, skipping panel creation');
            this.setupIframeMessageHandler(); // 设置 iframe 消息处理器
            return;
        }

        this.createPanel();
        this.bindEvents();
        this.setupAutoUpdate();
        this.setupIframeMessageListener(); // 监听来自 iframe 的消息
    }

    // 创建操作面板
    createPanel() {
        const panelHTML = `
            <div id="operation-panel" class="operation-panel">
                <div class="panel-header">
                    <span class="panel-title">🔧 元素定位操作面板 v10.1</span>
                    <div class="panel-controls">
                        <span class="minimize-btn" title="最小化">_</span>
                        <span class="close-btn" title="关闭">×</span>
                    </div>
                </div>
                <div class="panel-content">
                    <!-- 当前元素信息 -->
                    <div class="panel-section">
                        <div class="section-title">📍 当前元素</div>
                        <div id="current-element-info" class="info-box">点击"🎯 选择元素"按钮，然后点击页面上的元素...<br><br>✨ 智能 XPath 生成已启用<br>自动选择最佳定位策略</div>
                        <div class="button-group">
                            <button id="btn-select-element" class="panel-btn primary">🎯 选择元素</button>
                            <button id="btn-copy-xpath" class="panel-btn">📋 复制 XPath</button>
                        </div>
                    </div>

                    <!-- 编辑器 -->
                    <div class="panel-section">
                        <div class="section-title">✏️ XPath/CSS 编辑器</div>
                        <textarea id="xpath-editor" rows="3" placeholder="输入 XPath 或 CSS 选择器...&#10;示例: //input[@id='username'] 或 #username"></textarea>
                        <div class="button-group">
                            <button id="btn-validate" class="panel-btn primary">验证</button>
                            <button id="btn-clear" class="panel-btn">清空</button>
                            <button id="btn-highlight" class="panel-btn warning">高亮</button>
                            <button id="btn-unhighlight" class="panel-btn danger">取消高亮</button>
                        </div>
                    </div>

                    <!-- 验证结果 -->
                    <div class="panel-section">
                        <div class="section-title">📊 验证结果</div>
                        <div id="validation-result" class="result-box">等待验证...</div>
                    </div>

                    <!-- Python 代码生成 -->
                    <div class="panel-section">
                        <div class="section-title">🐍 Python 代码生成</div>

                        <div class="code-tabs">
                            <button class="tab-btn active" data-framework="selenium">Selenium</button>
                            <button class="tab-btn" data-framework="playwright">Playwright</button>
                            <button class="tab-btn" data-framework="drissionpage">DrissionPage</button>
                        </div>

                        <div class="code-preview-container">
                            <div id="code-preview-selenium" class="code-preview active">
                                <pre><code>// 选择元素后生成 Selenium 代码...</code></pre>
                            </div>
                            <div id="code-preview-playwright" class="code-preview">
                                <pre><code>// 选择元素后生成 Playwright 代码...</code></pre>
                            </div>
                            <div id="code-preview-drissionpage" class="code-preview">
                                <pre><code>// 选择元素后生成 DrissionPage 代码...</code></pre>
                            </div>
                        </div>

                        <div class="button-group">
                            <button id="btn-generate-code" class="panel-btn primary">🔄 生成代码</button>
                            <button id="btn-copy-code" class="panel-btn">📋 复制代码</button>
                            <button id="btn-download-code" class="panel-btn">⬇️ 下载 .py</button>
                        </div>
                    </div>

                    <!-- 坐标信息 -->
                    <div class="panel-section">
                        <div class="section-title">🔍 坐标信息</div>
                        <div id="coord-info" class="coord-box">
                            浏览器: x: 0, y: 0<br>
                            屏幕: x: 0, y: 0
                        </div>
                    </div>
                </div>
            </div>
        `;
        $('body').append(panelHTML);
        this.panel = $('#operation-panel');
        // v10.1 - 固定在右侧，不需要应用保存的状态
    }

    // 绑定事件
    bindEvents() {
        // 控制按钮
        this.panel.find('.close-btn').on('click', () => this.hide());
        this.panel.find('.minimize-btn').on('click', () => this.toggleMinimize());

        // v10.1 - 移除拖动和调整大小功能，固定在右侧

        // 复制按钮
        this.panel.find('#btn-select-element').on('click', () => this.toggleSelectMode());
        this.panel.find('#btn-copy-xpath').on('click', () => this.copyXPath());

        // 编辑器按钮
        this.panel.find('#btn-validate').on('click', () => this.validateSelector());
        this.panel.find('#btn-clear').on('click', () => this.clearEditor());
        this.panel.find('#btn-highlight').on('click', () => this.highlightElements());
        this.panel.find('#btn-unhighlight').on('click', () => this.unhighlightElements());

        // 编辑器快捷键
        this.panel.find('#xpath-editor').on('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.validateSelector();
            }
        });

        // v10.1 技术架构增强 - 代码预览标签切换
        this.panel.find('.tab-btn').on('click', (e) => {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            const framework = $btn.data('framework');

            // 切换标签状态
            this.panel.find('.tab-btn').removeClass('active');
            $btn.addClass('active');

            // 切换预览内容
            this.panel.find('.code-preview').removeClass('active');
            this.panel.find(`#code-preview-${framework}`).addClass('active');

            // 重新生成代码
            this.generateAndShowCode(framework);
        });

        // 代码操作按钮
        this.panel.find('#btn-generate-code').on('click', () => this.generateCodeFromEditor());
        this.panel.find('#btn-copy-code').on('click', () => this.copyGeneratedCode());
        this.panel.find('#btn-download-code').on('click', () => this.downloadGeneratedCode());
    }

    // 设置自动更新
    setupAutoUpdate() {
        // 每 100ms 更新坐标信息
        setInterval(() => {
            this.updateCoordInfo();
        }, 100);
    }

    // 更新坐标信息
    updateCoordInfo() {
        // 从 window 对象获取鼠标位置（由 content.js 更新）
        if (window.mouseX !== undefined && window.mouseY !== undefined) {
            const coordHTML = `
                浏览器: x: ${window.mouseX}, y: ${window.mouseY}<br>
                屏幕: x: ${window.mouseX + window.screenX}, y: ${window.mouseY + window.screenY}
            `;
            this.panel.find('#coord-info').html(coordHTML);
        }
    }

    // 更新当前元素信息
    updateCurrentElement(element, frameChain = null) {
        if (!element || !(element instanceof Element)) {
            this.panel.find('#current-element-info').html('当前位置无法解析元素');
            return;
        }

        this.currentElement = element;

        // v10.1.8 - 更新 currentElementInfo
        // 如果提供了 frameChain，使用它；否则清空 frameChain（外层元素）
        if (frameChain !== null) {
            // iframe 元素：使用提供的 frameChain
            this.currentElementInfo = {
                xpath: null,  // 将由 xpathGenerator 生成
                frameChain: frameChain,
                tag: element.tagName.toLowerCase()
            };
        } else {
            // 外层元素：清空 frameChain
            this.currentElementInfo = {
                xpath: null,
                frameChain: [],  // ★ 空数组表示在主页面
                tag: element.tagName.toLowerCase()
            };
        }

        // 使用增强的智能生成器（包含 iframe 和 Shadow DOM 上下文）
        const contextResult = this.xpathGenerator.generateWithContext(element);
        const intelligentXPath = contextResult.xpath || contextResult.fullExpression;
        const methodInfo = this.xpathGenerator.getMethodInfo(element);

        // 更新 xpath 到 currentElementInfo
        this.currentElementInfo.xpath = intelligentXPath;

        // 显示元素基本信息
        const tagName = element.tagName.toLowerCase();
        let info = `tag: ${tagName}<br>`;

        if (element.id) info += `@@id=${element.id}<br>`;
        if (element.className) info += `@@class=${element.className}<br>`;
        if (element.innerText && element.innerText.trim()) {
            const text = element.innerText.trim().substring(0, 20);
            info += `@@text()=${text}<br>`;
        }

        // 显示 iframe 上下文
        if (contextResult.iframeContext && contextResult.iframeContext.framePath !== 'top') {
            info += `<br>📍 <strong>Iframe:</strong> ${contextResult.iframeContext.framePath}<br>`;
        }

        // 显示 Shadow DOM 上下文
        if (contextResult.shadowContext && contextResult.shadowContext.inside) {
            info += `<br>${contextResult.warning}<br>`;
            if (contextResult.shadowContext.mode === 'open') {
                info += `<small style='color: #666;'>${contextResult.fullDescription}</small>`;
            }
        }

        info += `<br><br>🎯 <strong>XPath:</strong><br>${intelligentXPath}`;
        info += `<br><br><small style='color: #999;'>策略: ${methodInfo}</small>`;

        this.panel.find('#current-element-info').html(info);

        // 自动填充到编辑器
        this.panel.find('#xpath-editor').val(`xpath:${intelligentXPath}`);

        // 自动生成 Python 代码
        const activeFramework = this.panel.find('.tab-btn.active').data('framework') || 'selenium';
        this.generateAndShowCode(activeFramework);
    }

    // 简单的 XPath 生成（备用）
    getSimpleXPath(element) {
        if (element.id) {
            return `id("${element.id}")`;
        }
        let paths = [];
        for (; element && element.nodeType == Node.ELEMENT_NODE; element = element.parentNode) {
            let index = 0;
            let siblings = element.parentNode.childNodes;
            for (let i = 0; i < siblings.length; i++) {
                let sibling = siblings[i];
                if (sibling == element) {
                    index++;
                    break;
                }
            }
            let tagName = element.nodeName.toLowerCase();
            let pathIndex = (index ? "[" + (index+1) + "]" : "");
            paths.splice(0, 0, tagName + pathIndex);
        }
        return paths.length ? "/" + paths.join("/") : null;
    }

    // 复制 XPath（使用智能生成器）
    copyXPath() {
        if (!this.currentElement) {
            alert('请先选择元素');
            return;
        }
        const xpath = this.xpathGenerator.generate(this.currentElement);
        this.copyToClipboard(`xpath:${xpath}`);
        this.showNotification('✅ 已复制智能 XPath');
    }

// 验证选择器（支持 iframe）
validateSelector() {
    const selector = this.panel.find('#xpath-editor').val().trim();
    if (!selector) {
        this.panel.find('#validation-result').html('⚠️ 请输入 XPath 或 CSS 选择器');
        return;
    }

    // ★ 检查是否有 iframe 上下文
    const hasIframeContext = this.currentElementInfo?.frameChain?.length > 0;
    
    if (hasIframeContext) {
        // 在 iframe 中验证 - 发送消息让 iframe 执行验证
        this.validateInIframe(selector, this.currentElementInfo.frameChain);
        return;
    }

    // 在主页面验证
    this.validateInCurrentDocument(selector, document);
}

// 在当前文档中验证（原有逻辑）
validateInCurrentDocument(selector, doc) {
    let result = '';
    let elements = [];
    let count = 0;

    try {
        if (selector.startsWith('//') || selector.startsWith('xpath:') || selector.startsWith('/')) {
            const xpath = selector.replace('xpath:', '');
            const xpathResult = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            count = xpathResult.snapshotLength;

            for (let i = 0; i < count; i++) {
                elements.push(xpathResult.snapshotItem(i));
            }
        } else {
            elements = Array.from(doc.querySelectorAll(selector));
            count = elements.length;
        }

        if (count === 0) {
            result = '❌ 没有匹配的元素';
        } else if (count === 1) {
            result = '✅ 匹配 1 个元素（唯一）';
            result += '\n\n预览: ' + elements[0].outerHTML.substring(0, 150) + '...';
        } else {
            result = `⚠️ 匹配 ${count} 个元素（不唯一）`;
            result += '\n\n建议添加更多属性来精确定位';
        }
    } catch (e) {
        result = '❌ 语法错误: ' + e.message;
    }

    this.panel.find('#validation-result').html(result.replace(/\n/g, '<br>'));
}

// ★ 在 iframe 中验证（通过 postMessage）
validateInIframe(selector, frameChain) {
    console.log('[OperationPanel] validateInIframe called');
    console.log('[OperationPanel] Selector:', selector);
    console.log('[OperationPanel] FrameChain:', frameChain);

    let targetDoc = document;
    let accessibleFrames = 0;

    for (let i = 0; i < frameChain.length; i++) {
        const frameXPath = frameChain[i];
        console.log(`[OperationPanel] Trying to access frame ${i + 1}:`, frameXPath);

        try {
            const result = targetDoc.evaluate(
                frameXPath,
                targetDoc,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            );
            const frameElement = result.singleNodeValue;

            if (!frameElement) {
                this.panel.find('#validation-result').html(
                    `⚠️ 无法找到 iframe: ${frameXPath}`
                );
                return;
            }

            try {
                // 尝试访问 iframe 的 document（同域才能成功）
                targetDoc = frameElement.contentDocument || frameElement.contentWindow.document;
                accessibleFrames++;
                console.log(`[OperationPanel] Successfully accessed frame ${i + 1}`);
            } catch (e) {
                // 跨域 iframe，使用 postMessage
                console.log(`[OperationPanel] Frame ${i + 1} is cross-origin, using postMessage`);

                this.panel.find('#validation-result').html(
                    `🔍 正在 iframe 中验证...<br>` +
                    `（跨域模式，已进入 ${accessibleFrames} 层，剩余 ${frameChain.length - accessibleFrames} 层）`
                );

                // ★ 关键：remainingFrameChain 应该从当前位置的下一个开始
                const remainingFrameChain = frameChain.slice(i + 1);

                console.log('[OperationPanel] Sending validate request to iframe');
                console.log('[OperationPanel] Remaining chain:', remainingFrameChain);

                frameElement.contentWindow.postMessage({
                    type: 'XIONG_VALIDATE_REQUEST',
                    source: 'saossion-helper',
                    selector: selector,
                    remainingFrameChain: remainingFrameChain
                }, '*');

                return;
            }
        } catch (e) {
            this.panel.find('#validation-result').html('❌ XPath 执行失败: ' + e.message);
            console.error('[OperationPanel] XPath execution error:', e.message);
            return;
        }
    }

    // 成功进入所有 iframe（全部同域），直接验证
    console.log('[OperationPanel] All frames accessible, validating directly');
    this.validateInCurrentDocument(selector, targetDoc);
}



    // HTML 转义工具
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 清空编辑器
    clearEditor() {
        this.panel.find('#xpath-editor').val('');
        this.panel.find('#validation-result').html('等待验证...');
    }

    // 高亮元素
    highlightElements() {
        const selector = this.panel.find('#xpath-editor').val().trim();
        if (!selector) {
            alert('请先输入 XPath 或 CSS 选择器');
            return;
        }

        this.unhighlightElements(); // 先清除之前的高亮

        // v10.1.8 - 检查是否有 iframe 上下文
        const hasIframeContext = this.currentElementInfo?.frameChain?.length > 0;

        if (hasIframeContext) {
            // 在 iframe 中高亮 - 发送消息让 iframe 执行高亮
            this.highlightInIframe(selector, this.currentElementInfo.frameChain);
            return;
        }

        // 在主页面高亮（原有逻辑）
        let elements = [];
        try {
            if (selector.startsWith('//') || selector.startsWith('xpath:') || selector.startsWith('/')) {
                const xpath = selector.replace('xpath:', '');
                const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                for (let i = 0; i < result.snapshotLength; i++) {
                    elements.push(result.snapshotItem(i));
                }
            } else {
                elements = Array.from(document.querySelectorAll(selector));
            }

            if (elements.length === 0) {
                this.panel.find('#validation-result').html('❌ 没有匹配的元素');
                return;
            }

            elements.forEach((el, index) => {
                el.classList.add('xiong-highlight');
                el.style.setProperty('--xiong-highlight-index', index + 1);
            });

            this.highlightedElements = elements;
            this.panel.find('#validation-result').html(`✅ 已高亮 ${elements.length} 个元素`);
        } catch (e) {
            this.panel.find('#validation-result').html('❌ 语法错误: ' + e.message);
        }
    }

    // ========== v10.1.8 - iframe 高亮支持 ==========

    // 在 iframe 中高亮（通过 postMessage）
    highlightInIframe(selector, frameChain) {
        console.log('[OperationPanel] highlightInIframe called');
        console.log('[OperationPanel] Selector:', selector);
        console.log('[OperationPanel] FrameChain:', frameChain);

        let targetDoc = document;
        let accessibleFrames = 0;

        for (let i = 0; i < frameChain.length; i++) {
            const frameXPath = frameChain[i];
            console.log(`[OperationPanel] Trying to access frame ${i + 1}:`, frameXPath);

            try {
                const result = targetDoc.evaluate(
                    frameXPath,
                    targetDoc,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                );
                const frameElement = result.singleNodeValue;

                if (!frameElement) {
                    this.panel.find('#validation-result').html(
                        `⚠️ 无法找到 iframe: ${frameXPath}`
                    );
                    return;
                }

                try {
                    targetDoc = frameElement.contentDocument || frameElement.contentWindow.document;
                    accessibleFrames++;
                    console.log(`[OperationPanel] Successfully accessed frame ${i + 1}`);
                } catch (e) {
                    // 跨域 iframe，使用 postMessage
                    console.log(`[OperationPanel] Frame ${i + 1} is cross-origin, using postMessage`);

                    this.panel.find('#validation-result').html(
                        `🔍 正在 iframe 中高亮...<br>` +
                        `（跨域模式，已进入 ${accessibleFrames} 层，剩余 ${frameChain.length - accessibleFrames} 层）`
                    );

                    const remainingFrameChain = frameChain.slice(i + 1);

                    frameElement.contentWindow.postMessage({
                        type: 'XIONG_HIGHLIGHT_REQUEST',
                        source: 'saossion-helper',
                        selector: selector,
                        remainingFrameChain: remainingFrameChain
                    }, '*');

                    return;
                }
            } catch (e) {
                this.panel.find('#validation-result').html('❌ XPath 执行失败: ' + e.message);
                console.error('[OperationPanel] XPath execution error:', e.message);
                return;
            }
        }

        // 成功进入所有 iframe（全部同域），直接高亮
        console.log('[OperationPanel] All frames accessible, highlighting directly');
        this.highlightInCurrentDocument(selector, targetDoc);
    }

    // 在当前文档中高亮
    highlightInCurrentDocument(selector, doc) {
        let elements = [];
        try {
            const xpath = selector.replace(/^xpath:/, '');

            if (xpath.startsWith('//') || xpath.startsWith('/')) {
                const xpathResult = doc.evaluate(
                    xpath,
                    doc,
                    null,
                    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                    null
                );
                for (let i = 0; i < xpathResult.snapshotLength; i++) {
                    elements.push(xpathResult.snapshotItem(i));
                }
            } else {
                elements = Array.from(doc.querySelectorAll(xpath));
            }

            if (elements.length === 0) {
                this.panel.find('#validation-result').html('❌ 没有匹配的元素');
                return;
            }

            elements.forEach((el, index) => {
                el.classList.add('xiong-highlight');
                el.style.setProperty('--xiong-highlight-index', index + 1);
            });

            this.highlightedElements = elements;
            this.panel.find('#validation-result').html(`✅ 已高亮 ${elements.length} 个元素`);
        } catch (e) {
            this.panel.find('#validation-result').html('❌ 语法错误: ' + e.message);
        }
    }

    // ========== v10.1.8 - iframe 取消高亮支持 ==========

    // 在 iframe 中取消高亮（通过 postMessage）
    unhighlightInIframe(frameChain) {
        console.log('[OperationPanel] unhighlightInIframe called');
        console.log('[OperationPanel] FrameChain:', frameChain);

        let targetDoc = document;
        let accessibleFrames = 0;

        for (let i = 0; i < frameChain.length; i++) {
            const frameXPath = frameChain[i];
            console.log(`[OperationPanel] Trying to access frame ${i + 1}:`, frameXPath);

            try {
                const result = targetDoc.evaluate(
                    frameXPath,
                    targetDoc,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                );
                const frameElement = result.singleNodeValue;

                if (!frameElement) {
                    console.warn('[OperationPanel] Cannot find iframe:', frameXPath);
                    return;
                }

                try {
                    targetDoc = frameElement.contentDocument || frameElement.contentWindow.document;
                    accessibleFrames++;
                    console.log(`[OperationPanel] Successfully accessed frame ${i + 1}`);
                } catch (e) {
                    // 跨域 iframe，使用 postMessage
                    console.log(`[OperationPanel] Frame ${i + 1} is cross-origin, using postMessage`);

                    const remainingFrameChain = frameChain.slice(i + 1);

                    frameElement.contentWindow.postMessage({
                        type: 'XIONG_UNHIGHLIGHT_REQUEST',
                        source: 'saossion-helper',
                        remainingFrameChain: remainingFrameChain
                    }, '*');

                    return;
                }
            } catch (e) {
                console.error('[OperationPanel] XPath execution error:', e.message);
                return;
            }
        }

        // 成功进入所有 iframe（全部同域），直接取消高亮
        console.log('[OperationPanel] All frames accessible, unhighting directly');
        this.unhighlightInCurrentDocument(targetDoc);
    }

    // 在当前文档中取消高亮
    unhighlightInCurrentDocument(doc) {
        // 清除所有高亮
        const highlighted = doc.querySelectorAll('.xiong-highlight');
        highlighted.forEach(el => {
            el.classList.remove('xiong-highlight');
        });
        console.log(`[OperationPanel] Removed ${highlighted.length} highlights from document`);
    }

    // ========== v10.1.8 结束 ==========

    // 取消高亮
    unhighlightElements() {
        // v10.1.8 - 检查是否有 iframe 上下文
        const hasIframeContext = this.currentElementInfo?.frameChain?.length > 0;

        if (hasIframeContext) {
            // 在 iframe 中取消高亮 - 发送消息让 iframe 执行取消高亮
            this.unhighlightInIframe(this.currentElementInfo.frameChain);
        }

        // 清除主页面高亮（原有逻辑）
        this.highlightedElements.forEach(el => {
            el.classList.remove('xiong-highlight');
        });
        this.highlightedElements = [];
        this.panel.find('#validation-result').html('✅ 已取消高亮');
    }

    // 复制到剪贴板
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).catch(() => {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        });
    }

    // 显示通知
    showNotification(message) {
        // 创建通知元素
        const notification = $(`
            <div class="xiong-notification">
                ${message}
            </div>
        `);
        $('body').append(notification);
        notification.fadeIn(300);
        setTimeout(() => {
            notification.fadeOut(300, () => notification.remove());
        }, 2000);
    }

    // v10.1 - 移除面板状态保存/加载，因为现在是固定侧边栏

    // 最小化切换
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        if (this.isMinimized) {
            this.panel.find('.panel-content').slideUp(300);
            this.panel.find('.minimize-btn').text('□');
        } else {
            this.panel.find('.panel-content').slideDown(300);
            this.panel.find('.minimize-btn').text('_');
        }
    }

    // ========== v10.1 选择模式功能 ==========

    // 开启/关闭选择模式
    toggleSelectMode() {
        this.isSelectingMode = !this.isSelectingMode;
        const $btn = this.panel.find('#btn-select-element');

        if (this.isSelectingMode) {
            $btn.text('❌ 取消选择 (ESC)').addClass('active');
            this.showSelectModeOverlay();
            document.body.style.cursor = 'crosshair';
            this.bindSelectModeEvents();

            // 通知所有 iframe 开启选择模式
            this.notifyIframesSelectMode(true);
        } else {
            $btn.text('🎯 选择元素').removeClass('active');
            this.hideSelectModeOverlay();
            document.body.style.cursor = '';
            this.unbindSelectModeEvents();

            // 通知所有 iframe 关闭选择模式
            this.notifyIframesSelectMode(false);
        }
    }

    // 显示选择模式提示
    showSelectModeOverlay() {
        const overlay = $(`
            <div class="select-mode-overlay">
                <div class="select-mode-hint">
                    🎯 选择模式已开启<br>
                    点击要检查的元素<br>
                    按 ESC 退出
                </div>
            </div>
        `);
        $('body').append(overlay);
        this.selectModeOverlay = overlay;
    }

    // 隐藏选择模式提示
    hideSelectModeOverlay() {
        if (this.selectModeOverlay) {
            this.selectModeOverlay.remove();
            this.selectModeOverlay = null;
        }
    }

    // 绑定选择模式事件
    bindSelectModeEvents() {
        this.selectModeMouseMove = (e) => this.onSelectModeMouseMove(e);
        this.selectModeClick = (e) => this.onSelectModeClick(e);
        this.selectModeKeyDown = (e) => this.onSelectModeKeyDown(e);

        document.addEventListener('mousemove', this.selectModeMouseMove, true);
        document.addEventListener('click', this.selectModeClick, true);
        document.addEventListener('keydown', this.selectModeKeyDown, true);
    }

    // 解绑选择模式事件
    unbindSelectModeEvents() {
        if (this.selectModeMouseMove) {
            document.removeEventListener('mousemove', this.selectModeMouseMove, true);
            document.removeEventListener('click', this.selectModeClick, true);
            document.removeEventListener('keydown', this.selectModeKeyDown, true);
            this.selectModeMouseMove = null;
            this.selectModeClick = null;
            this.selectModeKeyDown = null;
        }
        // 清除所有高亮
        $('.xiong-hover-highlight').removeClass('xiong-hover-highlight');
    }

    // 选择模式鼠标移动 - 高亮悬停元素
    onSelectModeMouseMove(event) {
        // 移除之前的高亮
        $('.xiong-hover-highlight').removeClass('xiong-hover-highlight');

        // 获取目标元素
        const target = event.target;
        if (target && target.id !== 'operation-panel' && !$('#operation-panel').find(target).length) {
            $(target).addClass('xiong-hover-highlight');
        }
    }

    // 选择模式点击 - 捕获元素
    onSelectModeClick(event) {
        const target = event.target;
        // 排除操作面板本身 - 让操作面板的按钮事件正常触发
        if (target.id === 'operation-panel' || $('#operation-panel').find(target).length > 0) {
            return; // 不阻止事件传播，让按钮点击事件正常触发
        }

        // v10.1.3 - 使用 elementsFromPoint 获取点击位置的所有元素（包括 iframe 内部）
        const elements = document.elementsFromPoint(event.clientX, event.clientY);

        // 过滤出有效的目标元素
        let targetElement = null;
        for (let el of elements) {
            // 跳过遮罩层、提示层、html/body 等容器元素
            if (el.classList && (
                el.classList.contains('select-mode-overlay') ||
                el.classList.contains('select-mode-hint') ||
                el.tagName === 'HTML' ||
                el.tagName === 'BODY'
            )) {
                continue;
            }

            // 找到第一个非容器元素
            if (el.nodeType === Node.ELEMENT_NODE) {
                targetElement = el;
                break;
            }
        }

        if (!targetElement) {
            return; // 没有找到有效元素
        }

        // 只对非操作面板的元素阻止默认行为
        event.preventDefault();
        event.stopPropagation();

        // v10.1.8 - 检查目标元素是否在 iframe 中
        // 由于我们在主页面，使用 elementsFromPoint 获取的元素可能来自 iframe
        // 但 cross-origin 的情况下，我们无法获取 iframe 内的元素
        // 所以这里只需要检查 targetElement.ownerDocument 是否等于 document
        let frameChain = [];

        if (targetElement.ownerDocument !== document) {
            // 目标元素在 iframe 中（同域情况）
            // 需要找到包含这个元素的 iframe
            const iframes = document.querySelectorAll('iframe, frame');
            for (let i = 0; i < iframes.length; i++) {
                const iframe = iframes[i];
                try {
                    if (iframe.contentDocument === targetElement.ownerDocument) {
                        // 找到了包含目标元素的 iframe
                        if (iframe.id) {
                            frameChain.push(`//iframe[@id='${iframe.id}']`);
                        } else if (iframe.name) {
                            frameChain.push(`//iframe[@name='${iframe.name}']`);
                        } else {
                            frameChain.push(`//iframe[${i + 1}]`);
                        }
                        break;
                    }
                } catch (e) {
                    // 跨域无法访问，跳过
                }
            }
        }
        // 如果 frameChain 为空，说明目标元素在主页面，frameChain = [] 正确表示主页面

        // 更新元素信息，传入 frameChain（空数组表示在主页面）
        this.updateCurrentElement(targetElement, frameChain);

        // 退出选择模式
        this.toggleSelectMode();
    }

    // 选择模式按键 - ESC 退出
    onSelectModeKeyDown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            if (this.isSelectingMode) {
                this.toggleSelectMode();
            }
        }
    }

    // 显示面板
    show() {
        this.panel.show();
        this.isVisible = true;
    }

    // 隐藏面板
    hide() {
        this.panel.hide();
        this.isVisible = false;
    }

    // 切换面板显示
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    // ========== v10.1.2 - iframe 跨框架通信功能 ==========

    // 在 iframe 中：设置消息处理器，监听元素点击并发送到主页面
    setupIframeMessageHandler() {
        // 调用独立函数
        setupIframeSelectionHandler();
    }

    // 在主页面中：监听来自 iframe 的消息
    setupIframeMessageListener() {
        window.addEventListener('message', (event) => {
            // 验证消息来源
            if (!event.data || event.data.source !== 'saossion-helper') return;

            // 处理元素选择消息
            if (event.data.type === 'XIONG_ELEMENT_SELECTED') {
                const data = event.data.data;

                console.log('[OperationPanel] Received element data:', data);

                // 格式化显示：iframe: [iframe选择器] > xpath:xxx
                let displayText = `tag: ${data.tag}`;

                if (data.id) displayText += `<br>@@id=${data.id}`;
                if (data.className) displayText += `<br>@@class=${data.className}`;
                if (data.text) displayText += `<br>@@text()=${data.text}`;

                // v10.1.5 - 支持嵌套 iframe 的 frameChain
                // framePath 格式：iframe1: //iframe[1] > iframe2: //iframe[@id='main']
                if (data.framePath && data.framePath !== 'top') {
                    displayText += `<br><br>${data.framePath}<br>xpath:${data.xpath}`;
                } else {
                    displayText += `<br><br>xpath:${data.xpath}`;
                }

                // 更新面板显示
                this.panel.find('#current-element-info').html(displayText);

                // 更新编辑器
                this.panel.find('#xpath-editor').val(`xpath:${data.xpath}`);

                // 保存当前元素信息（用于代码生成）
                this.currentElementInfo = {
                    xpath: data.xpath,
                    iframeContext: data.frameChain && data.frameChain.length > 0
                        ? data.frameChain.join(' > ')
                        : (data.frameXPath || null),
                    framePath: data.framePath,
                    frameChain: data.frameChain,  // 保存完整的 frameChain
                    tag: data.tag
                };

                // 生成 Python 代码
                const activeFramework = this.panel.find('.tab-btn.active').data('framework') || 'selenium';
                this.generateAndShowCodeForIframe(activeFramework, data);

                // 退出选择模式
                if (this.isSelectingMode) {
                    this.toggleSelectMode();
                }
            }

            // ★ 处理验证结果消息（v10.1.6）
            if (event.data.type === 'XIONG_VALIDATE_RESULT') {
                const result = event.data.result;
                let displayHTML = '';

                if (result.error) {
                    displayHTML = `❌ 语法错误: ${result.error}`;
                } else if (result.count === 0) {
                    displayHTML = '❌ 没有匹配的元素';
                } else if (result.count === 1) {
                    displayHTML = `✅ 匹配 1 个元素（唯一）<br><br>`;
                    displayHTML += `📍 位置: ${result.location}<br>`;
                    displayHTML += `预览: ${this.escapeHtml(result.preview)}`;
                } else {
                    displayHTML = `⚠️ 匹配 ${result.count} 个元素（不唯一）<br><br>`;
                    displayHTML += `建议添加更多属性来精确定位`;
                }

                this.panel.find('#validation-result').html(displayHTML);
            }

            // ★ 处理高亮结果消息（v10.1.8）
            if (event.data.type === 'XIONG_HIGHLIGHT_RESULT') {
                const result = event.data.result;
                let displayHTML = '';

                if (result.success) {
                    displayHTML = `✅ 已高亮 ${result.count} 个元素`;
                } else {
                    displayHTML = `❌ 高亮失败: ${result.error}`;
                }

                this.panel.find('#validation-result').html(displayHTML);
            }
        });

        console.log('[OperationPanel] iframe message listener ready');
    }

    // 为 iframe 元素生成代码
    generateAndShowCodeForIframe(framework, data) {
        // v10.1.3 - 检查 pythonCodeGenerator 是否可用
        if (typeof pythonCodeGenerator === 'undefined') {
            console.warn('[OperationPanel] pythonCodeGenerator not available');
            this.panel.find(`#code-preview-${framework} pre code`).text('// 代码生成器未加载');
            return;
        }

        // v10.1.5 - 使用 frameChain 构建完整的 iframe 上下文
        const iframeContext = data.frameChain && data.frameChain.length > 0
            ? data.frameChain.join(' > ')
            : null;

        let code = '';
        if (framework === 'selenium') {
            code = pythonCodeGenerator.generateSelenium(
                data.xpath,
                iframeContext
            );
        } else if (framework === 'playwright') {
            code = pythonCodeGenerator.generatePlaywright(
                data.xpath,
                iframeContext
            );
        } else if (framework === 'drissionpage') {
            code = pythonCodeGenerator.generateDrissionPage(
                data.xpath,
                iframeContext
            );
        }

        // v10.1.7 - 保存原始代码（不含 HTML）
        this.currentGeneratedCode[framework] = code;

        const formattedCode = pythonCodeGenerator.formatCodeForDisplay(code);
        this.panel.find(`#code-preview-${framework} pre code`).html(formattedCode);
        this.currentFramework = framework;
    }

    // 通知所有 iframe（包括嵌套的）开启/关闭选择模式
    notifyIframesSelectMode(enable) {
        // 计算 iframe 的 XPath
        const getIframeXPath = (iframe, parentDoc) => {
            if (iframe.id) {
                return `//iframe[@id='${iframe.id}']`;
            }
            if (iframe.name) {
                return `//iframe[@name='${iframe.name}']`;
            }
            // 计算索引
            const iframes = parentDoc.querySelectorAll('iframe, frame');
            for (let i = 0; i < iframes.length; i++) {
                if (iframes[i] === iframe) {
                    return `//iframe[${i + 1}]`;
                }
            }
            return '//iframe';
        };

        // 递归通知
        const notifyRecursively = (iframe, parentDoc, frameChain) => {
            try {
                const myXPath = getIframeXPath(iframe, parentDoc);
                const newChain = [...frameChain, myXPath];

                // 发送消息，包含完整的 frameChain
                iframe.contentWindow.postMessage({
                    type: 'XIONG_SELECT_MODE',
                    source: 'saossion-helper',
                    enabled: enable,
                    frameChain: newChain  // ★ 传递完整的 iframe 链
                }, '*');

                console.log('[OperationPanel] Notified iframe:', myXPath, 'chain:', newChain);

                // 尝试递归通知子 iframe
                try {
                    const innerDoc = iframe.contentDocument || iframe.contentWindow.document;
                    const innerIframes = innerDoc.querySelectorAll('iframe, frame');
                    innerIframes.forEach(innerIframe => {
                        notifyRecursively(innerIframe, innerDoc, newChain);
                    });
                } catch (e) {
                    // 跨域无法访问，子 iframe 会自己链式转发
                }
            } catch (e) {
                console.warn('[OperationPanel] Cannot notify iframe:', e.message);
            }
        };

        // 通知所有直接子 iframe
        const iframes = document.querySelectorAll('iframe, frame');
        iframes.forEach(iframe => {
            notifyRecursively(iframe, document, []);
        });

        console.log(`[OperationPanel] Notified ${iframes.length} iframes: selectMode=${enable}`);
    }

    // ========== v10.1.3 - 手动生成代码功能 ==========

    // 从编辑器生成代码
    generateCodeFromEditor() {
        // v10.1.3 - 检查 pythonCodeGenerator 是否可用
        if (typeof pythonCodeGenerator === 'undefined') {
            this.showNotification('⚠️ 代码生成器未加载，请刷新页面重试');
            this.panel.find('.code-preview pre code').text('// 代码生成器未加载，请刷新页面');
            return;
        }

        const selector = this.panel.find('#xpath-editor').val().trim();
        if (!selector) {
            this.showNotification('⚠️ 请先输入 XPath 或 CSS 选择器');
            return;
        }

        // 获取当前选中的框架
        const framework = this.panel.find('.tab-btn.active').data('framework') || 'selenium';

        // 移除 xpath: 前缀（如果有）
        let xpath = selector.replace(/^xpath:/, '');

        // 检查是否包含 iframe 层级信息
        // 格式：iframe1: //iframe[1] > iframe2: //iframe[@id='main'] > xpath://input[@id='username']
        let iframeContext = null;

        if (xpath.includes('iframe1:')) {
            // 解析 iframe 层级
            const parts = xpath.split(' > ');
            const lastPart = parts[parts.length - 1];

            // 提取最后的 xpath
            if (lastPart.startsWith('xpath:')) {
                xpath = lastPart.replace('xpath:', '');
            }

            // 提取 iframe 层级（去掉 "iframeN: " 前缀）
            const iframeParts = parts.slice(0, -1).map(p => p.replace(/^iframe\d+:\s*/, ''));
            iframeContext = iframeParts.join(' > ');
        }

        // 生成代码
        let code = '';
        if (framework === 'selenium') {
            code = pythonCodeGenerator.generateSelenium(xpath, iframeContext);
        } else if (framework === 'playwright') {
            code = pythonCodeGenerator.generatePlaywright(xpath, iframeContext);
        } else if (framework === 'drissionpage') {
            code = pythonCodeGenerator.generateDrissionPage(xpath, iframeContext);
        }

        // v10.1.7 - 保存原始代码（不含 HTML）
        this.currentGeneratedCode[framework] = code;

        // 显示代码
        const formattedCode = pythonCodeGenerator.formatCodeForDisplay(code);
        this.panel.find(`#code-preview-${framework} pre code`).html(formattedCode);
        this.currentFramework = framework;

        this.showNotification('✅ 代码已生成');
    }

    // ========== v10.1 技术架构增强 - Python 代码生成功能 ==========

    // 生成并显示代码
    generateAndShowCode(framework = 'selenium') {
        // v10.1.3 - 检查 pythonCodeGenerator 是否可用
        if (typeof pythonCodeGenerator === 'undefined') {
            this.panel.find('.code-preview pre code').text('// 代码生成器未加载，请刷新页面');
            return;
        }

        if (!this.currentElement) {
            this.panel.find('.code-preview pre code').text('// 请先选择元素...');
            return;
        }

        // v10.1.7 - 使用保存的元素信息和 iframe 上下文
        const xpath = this.currentElementInfo?.xpath ||
                      (this.xpathGenerator ? this.xpathGenerator.generate(this.currentElement) : '');
        const iframeContext = this.currentElementInfo?.frameChain?.length > 0
            ? this.currentElementInfo.frameChain.join(' > ')
            : null;

        // 生成代码
        let code = '';
        if (framework === 'selenium') {
            code = pythonCodeGenerator.generateSelenium(xpath, iframeContext);
        } else if (framework === 'playwright') {
            code = pythonCodeGenerator.generatePlaywright(xpath, iframeContext);
        } else if (framework === 'drissionpage') {
            code = pythonCodeGenerator.generateDrissionPage(xpath, iframeContext);
        }

        // v10.1.7 - 保存原始代码（不含 HTML）
        this.currentGeneratedCode[framework] = code;

        // 显示代码（使用简单的语法高亮）
        const formattedCode = pythonCodeGenerator.formatCodeForDisplay(code);
        this.panel.find(`#code-preview-${framework} pre code`).html(formattedCode);

        // 更新当前框架
        this.currentFramework = framework;
    }

    // 复制生成的代码
    copyGeneratedCode() {
        if (!pythonCodeGenerator || !this.currentFramework) {
            alert('请先选择元素');
            return;
        }

        // 使用保存的原始代码（不含 HTML 标签）
        const code = this.currentGeneratedCode?.[this.currentFramework] || '';

        if (!code) {
            alert('请先生成代码');
            return;
        }

        this.copyToClipboard(code);
        this.showNotification(`✅ 已复制 ${this.currentFramework} 代码`);
    }

    // 下载生成的代码
    downloadGeneratedCode() {
        if (!pythonCodeGenerator || !this.currentFramework || !this.currentElement) {
            alert('请先选择元素');
            return;
        }

        // 使用保存的原始代码（不含 HTML 标签）
        const code = this.currentGeneratedCode?.[this.currentFramework] || '';

        if (!code) {
            alert('请先生成代码');
            return;
        }

        // 生成文件名
        const fileName = pythonCodeGenerator.generateFileName(this.currentFramework);

        // 创建 Blob 并下载
        const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification(`⬇️ 已下载 ${fileName}`);
    }
}
function setupIframeSelectionHandler() {
    console.log('[XIONG Iframe] Initializing in:', window.location.href);

    // ★ 保存从父窗口传来的 frameChain
    window.xiongFrameChain = [];

    // 1. 注入高亮样式
    if (!document.getElementById('xiong-iframe-style')) {
        const style = document.createElement('style');
        style.id = 'xiong-iframe-style';
        style.textContent = `
            .xiong-hover-highlight {
                outline: 3px solid #ff0000 !important;
                outline-offset: -3px;
                background-color: rgba(255, 0, 0, 0.15) !important;
                cursor: crosshair !important;
                z-index: 2147483647;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    // 2. 监听消息 + 链式转发
    window.addEventListener('message', (event) => {
        if (!event.data || event.data.source !== 'saossion-helper') return;

        // 处理选择模式消息
        if (event.data.type === 'XIONG_SELECT_MODE') {
            window.xiongSelectingMode = event.data.enabled;

            // ★ 保存 frameChain（如果有的话）
            if (event.data.frameChain && event.data.frameChain.length > 0) {
                window.xiongFrameChain = event.data.frameChain;
            }

            console.log('[XIONG Iframe] Select mode:', window.xiongSelectingMode,
                        'frameChain:', window.xiongFrameChain);

            document.body.style.cursor = window.xiongSelectingMode ? 'crosshair' : '';

            if (!window.xiongSelectingMode) {
                document.querySelectorAll('.xiong-hover-highlight').forEach(el => {
                    el.classList.remove('xiong-hover-highlight');
                });
            }

            // ★ 链式转发给子 iframe（附带更新的 frameChain）
            const childIframes = document.querySelectorAll('iframe, frame');
            if (childIframes.length > 0) {
                console.log('[XIONG Iframe] Forwarding to', childIframes.length, 'child iframe(s)');
                childIframes.forEach((iframe, idx) => {
                    try {
                        // 计算子 iframe 的 XPath
                        let childXPath = '//iframe';
                        if (iframe.id) {
                            childXPath = `//iframe[@id='${iframe.id}']`;
                        } else if (iframe.name) {
                            childXPath = `//iframe[@name='${iframe.name}']`;
                        } else {
                            childXPath = `//iframe[${idx + 1}]`;
                        }

                        iframe.contentWindow.postMessage({
                            type: 'XIONG_SELECT_MODE',
                            source: 'saossion-helper',
                            enabled: event.data.enabled,
                            frameChain: [...window.xiongFrameChain, childXPath]  // ★ 追加当前 iframe 信息
                        }, '*');
                    } catch (e) {
                        console.warn('[XIONG Iframe] Forward failed:', e.message);
                    }
                });
            }
        }

        // ========== 处理验证请求（v10.1.6 增强版）==========
        if (event.data.type === 'XIONG_VALIDATE_REQUEST') {
            const selector = event.data.selector;
            const remainingChain = event.data.remainingFrameChain || [];

            console.log('[XIONG Iframe] Validate request received in:', window.location.hostname);
            console.log('[XIONG Iframe] Selector:', selector);
            console.log('[XIONG Iframe] Remaining chain:', remainingChain);

            // 如果还有更多 iframe 层级，需要继续转发
            if (remainingChain.length > 0) {
                const nextFrameXPath = remainingChain[0];
                console.log('[XIONG Iframe] Need to forward to:', nextFrameXPath);

                try {
                    // 查找下一层 iframe
                    const result = document.evaluate(
                        nextFrameXPath,
                        document,
                        null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null
                    );
                    const frameElement = result.singleNodeValue;

                    if (frameElement) {
                        console.log('[XIONG Iframe] Found next iframe, forwarding...');

                        frameElement.contentWindow.postMessage({
                            type: 'XIONG_VALIDATE_REQUEST',
                            source: 'saossion-helper',
                            selector: selector,
                            remainingFrameChain: remainingChain.slice(1)
                        }, '*');

                        console.log('[XIONG Iframe] Forwarded to next iframe');
                        return;  // 已转发，不在当前层执行验证
                    } else {
                        console.error('[XIONG Iframe] Cannot find iframe:', nextFrameXPath);

                        // 找不到目标 iframe，返回错误
                        window.top.postMessage({
                            type: 'XIONG_VALIDATE_RESULT',
                            source: 'saossion-helper',
                            result: {
                                count: 0,
                                error: `在 ${window.location.hostname} 中找不到 iframe: ${nextFrameXPath}`,
                                preview: '',
                                location: window.location.hostname
                            }
                        }, '*');
                        return;
                    }
                } catch (e) {
                    console.error('[XIONG Iframe] Error finding iframe:', e.message);

                    // XPath 执行失败，返回错误
                    window.top.postMessage({
                        type: 'XIONG_VALIDATE_RESULT',
                        source: 'saossion-helper',
                        result: {
                            count: 0,
                            error: `查找 iframe 失败: ${e.message}`,
                            preview: '',
                            location: window.location.hostname
                        }
                    }, '*');
                    return;
                }
            }

            // remainingChain 为空，在当前 iframe 执行验证
            console.log('[XIONG Iframe] Executing validation in:', window.location.hostname);

            let result = {
                count: 0,
                error: null,
                preview: '',
                location: window.location.hostname
            };

            try {
                const xpath = selector.replace(/^xpath:/, '');
                let elements = [];

                if (xpath.startsWith('//') || xpath.startsWith('/')) {
                    const xpathResult = document.evaluate(
                        xpath,
                        document,
                        null,
                        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                        null
                    );
                    for (let i = 0; i < xpathResult.snapshotLength; i++) {
                        elements.push(xpathResult.snapshotItem(i));
                    }
                } else {
                    elements = Array.from(document.querySelectorAll(xpath));
                }

                result.count = elements.length;
                if (elements.length > 0) {
                    result.preview = elements[0].outerHTML.substring(0, 100) + '...';
                }

                console.log('[XIONG Iframe] Validation result:', result.count, 'elements');
            } catch (e) {
                result.error = e.message;
                console.error('[XIONG Iframe] Validation error:', e.message);
            }

            // 返回结果给顶层
            console.log('[XIONG Iframe] Sending validation result to top:', result);
            window.top.postMessage({
                type: 'XIONG_VALIDATE_RESULT',
                source: 'saossion-helper',
                result: result
            }, '*');
        }

        // ========== 处理高亮请求（v10.1.8）==========
        if (event.data.type === 'XIONG_HIGHLIGHT_REQUEST') {
            const selector = event.data.selector;
            const remainingChain = event.data.remainingFrameChain || [];

            console.log('[XIONG Iframe] Highlight request received in:', window.location.hostname);
            console.log('[XIONG Iframe] Selector:', selector);
            console.log('[XIONG Iframe] Remaining chain:', remainingChain);

            // 清除旧的高亮
            document.querySelectorAll('.xiong-highlight').forEach(el => {
                el.classList.remove('xiong-highlight');
            });

            // 如果还有更多 iframe 层级，需要继续转发
            if (remainingChain.length > 0) {
                const nextFrameXPath = remainingChain[0];
                console.log('[XIONG Iframe] Need to forward to:', nextFrameXPath);

                try {
                    const result = document.evaluate(
                        nextFrameXPath,
                        document,
                        null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null
                    );
                    const frameElement = result.singleNodeValue;

                    if (frameElement) {
                        console.log('[XIONG Iframe] Found next iframe, forwarding...');

                        frameElement.contentWindow.postMessage({
                            type: 'XIONG_HIGHLIGHT_REQUEST',
                            source: 'saossion-helper',
                            selector: selector,
                            remainingFrameChain: remainingChain.slice(1)
                        }, '*');

                        return;
                    } else {
                        console.error('[XIONG Iframe] Cannot find iframe:', nextFrameXPath);

                        window.top.postMessage({
                            type: 'XIONG_HIGHLIGHT_RESULT',
                            source: 'saossion-helper',
                            result: {
                                success: false,
                                error: `在 ${window.location.hostname} 中找不到 iframe: ${nextFrameXPath}`
                            }
                        }, '*');
                        return;
                    }
                } catch (e) {
                    console.error('[XIONG Iframe] Error finding iframe:', e.message);

                    window.top.postMessage({
                        type: 'XIONG_HIGHLIGHT_RESULT',
                        source: 'saossion-helper',
                        result: {
                            success: false,
                            error: `查找 iframe 失败: ${e.message}`
                        }
                    }, '*');
                    return;
                }
            }

            // remainingChain 为空，在当前 iframe 执行高亮
            console.log('[XIONG Iframe] Executing highlight in:', window.location.hostname);

            let elements = [];
            try {
                const xpath = selector.replace(/^xpath:/, '');

                if (xpath.startsWith('//') || xpath.startsWith('/')) {
                    const xpathResult = document.evaluate(
                        xpath,
                        document,
                        null,
                        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                        null
                    );
                    for (let i = 0; i < xpathResult.snapshotLength; i++) {
                        elements.push(xpathResult.snapshotItem(i));
                    }
                } else {
                    elements = Array.from(document.querySelectorAll(xpath));
                }

                elements.forEach((el, index) => {
                    el.classList.add('xiong-highlight');
                    el.style.setProperty('--xiong-highlight-index', index + 1);
                });

                console.log('[XIONG Iframe] Highlight result:', elements.length, 'elements');

                window.top.postMessage({
                    type: 'XIONG_HIGHLIGHT_RESULT',
                    source: 'saossion-helper',
                    result: {
                        success: true,
                        count: elements.length
                    }
                }, '*');
            } catch (e) {
                console.error('[XIONG Iframe] Highlight error:', e.message);

                window.top.postMessage({
                    type: 'XIONG_HIGHLIGHT_RESULT',
                    source: 'saossion-helper',
                    result: {
                        success: false,
                        error: e.message
                    }
                }, '*');
            }
        }

        // ========== 处理取消高亮请求（v10.1.8）==========
        if (event.data.type === 'XIONG_UNHIGHLIGHT_REQUEST') {
            const remainingChain = event.data.remainingFrameChain || [];

            console.log('[XIONG Iframe] Unhighlight request received in:', window.location.hostname);
            console.log('[XIONG Iframe] Remaining chain:', remainingChain);

            // 如果还有更多 iframe 层级，需要继续转发
            if (remainingChain.length > 0) {
                const nextFrameXPath = remainingChain[0];
                console.log('[XIONG Iframe] Need to forward to:', nextFrameXPath);

                try {
                    const result = document.evaluate(
                        nextFrameXPath,
                        document,
                        null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null
                    );
                    const frameElement = result.singleNodeValue;

                    if (frameElement) {
                        console.log('[XIONG Iframe] Found next iframe, forwarding...');

                        frameElement.contentWindow.postMessage({
                            type: 'XIONG_UNHIGHLIGHT_REQUEST',
                            source: 'saossion-helper',
                            remainingFrameChain: remainingChain.slice(1)
                        }, '*');

                        return;
                    } else {
                        console.error('[XIONG Iframe] Cannot find iframe:', nextFrameXPath);
                        return;
                    }
                } catch (e) {
                    console.error('[XIONG Iframe] Error finding iframe:', e.message);
                    return;
                }
            }

            // remainingChain 为空，在当前 iframe 执行取消高亮
            console.log('[XIONG Iframe] Executing unhighlight in:', window.location.hostname);

            // 清除所有高亮
            const highlighted = document.querySelectorAll('.xiong-highlight');
            highlighted.forEach(el => {
                el.classList.remove('xiong-highlight');
            });

            console.log('[XIONG Iframe] Unhighlight result:', highlighted.length, 'highlights removed');
        }
        // ========== v10.1.8 结束 ==========
    });

    // 3. 鼠标悬停高亮
    document.addEventListener('mouseover', (e) => {
        if (!window.xiongSelectingMode) return;

        document.querySelectorAll('.xiong-hover-highlight').forEach(el => {
            if (el !== e.target) el.classList.remove('xiong-hover-highlight');
        });

        if (e.target && !['HTML', 'BODY'].includes(e.target.tagName)) {
            e.target.classList.add('xiong-hover-highlight');
        }
    }, true);

    document.addEventListener('mouseout', (e) => {
        if (!window.xiongSelectingMode) return;
        e.target?.classList.remove('xiong-hover-highlight');
    }, true);

    // 4. 点击捕获
    document.addEventListener('click', (e) => {
        if (!window.xiongSelectingMode) return;

        console.log('[XIONG Iframe] Element clicked:', e.target.tagName);

        e.preventDefault();
        e.stopPropagation();

        const element = e.target;
        element.classList.remove('xiong-hover-highlight');

        // 生成元素 XPath
        let xpath = '';
        if (element.id && !/^\d/.test(element.id)) {
            xpath = `//*[@id='${element.id}']`;
        } else {
            const name = element.getAttribute('name');
            if (name) {
                xpath = `//${element.tagName.toLowerCase()}[@name='${name}']`;
            } else {
                const parts = [];
                let current = element;
                while (current && current.nodeType === Node.ELEMENT_NODE) {
                    let index = 1;
                    let sibling = current.previousElementSibling;
                    while (sibling) {
                        if (sibling.tagName === current.tagName) index++;
                        sibling = sibling.previousElementSibling;
                    }
                    parts.unshift(`${current.tagName.toLowerCase()}[${index}]`);
                    current = current.parentElement;
                }
                xpath = '/' + parts.join('/');
            }
        }

        // ★ 直接使用保存的 frameChain（已经是精准的了）
        const frameChain = window.xiongFrameChain || [];
        
        let framePathStr = '';
        if (frameChain.length > 0) {
            framePathStr = frameChain.map((fp, idx) => `iframe${idx + 1}: ${fp}`).join(' > ');
        }

        const elementInfo = {
            xpath: xpath,
            frameXPath: frameChain.length > 0 ? frameChain[frameChain.length - 1] : null,
            framePath: framePathStr || 'top',
            frameChain: frameChain,
            tag: element.tagName.toLowerCase(),
            id: element.id || '',
            className: typeof element.className === 'string' ? element.className : '',
            text: (element.textContent || '').trim().substring(0, 50)
        };

        console.log('[XIONG Iframe] Sending to TOP:', elementInfo);

        window.top.postMessage({
            type: 'XIONG_ELEMENT_SELECTED',
            source: 'saossion-helper',
            data: elementInfo
        }, '*');

        window.xiongSelectingMode = false;
        document.body.style.cursor = '';
    }, true);

    console.log('[XIONG Iframe] Handler ready ✓');
}


// ========== v10.1.5 - 自动初始化 ==========

// 确保 DOM 加载完成后初始化
function autoInit() {
    console.log('[OperationPanel] Auto-init in:', window === window.top ? 'TOP' : 'IFRAME', 'readyState:', document.readyState);

    if (window === window.top) {
        // 主页面：创建 OperationPanel 实例（如果还没有）
        if (typeof window.operation_panel === 'undefined') {
            window.operation_panel = new OperationPanel();
            console.log('[OperationPanel] ✓ Instance created in top window');
        }
    } else {
        // iframe：直接调用独立函数
        console.log('[OperationPanel] Setting up iframe handler...');
        setupIframeSelectionHandler();
    }
}

// 延迟初始化，确保所有脚本都已加载
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
} else {
    // 如果 DOM 已经加载完成，稍微延迟以确保其他脚本已执行
    setTimeout(autoInit, 100);
}

// 高亮元素的样式（已添加到 operation_panel.css）
// .xiong-highlight {
//     outline: 2px solid #ff0000 !important;
//     outline-offset: 2px;
//     position: relative;
// }
// .xiong-highlight::before {
//     content: attr(data-index);
//     position: absolute;
//     top: -20px;
//     left: -20px;
//     background: red;
//     color: white;
//     padding: 2px 6px;
//     font-size: 12px;
//     border-radius: 3px;
//     z-index: 9999;
// }
