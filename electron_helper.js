// =====================================================
// 元素定位助手 v1.6
// - iframe 优先使用 src 路径定位
// - 自动提取 URL 路径部分（去掉 ? 后的参数）
// =====================================================

(function() {
    'use strict';

    let currentElement = null;
    let highlightedElements = [];

    // ========== 有价值的属性列表 ==========
    const VALUABLE_ATTRS = [
        'name', 'type', 'placeholder', 'title', 'alt', 'role', 
        'aria-label', 'data-id', 'data-name', 'data-type', 'data-key',
        'data-field', 'data-action', 'data-testid', 'textname', 'for'
    ];

    // ========== 需要模糊匹配的模式 ==========
    const FUZZY_PATTERNS = [
        /^mini-iframe-\d+$/,
        /^mini-\d+\$.*$/,
        /^ember\d+$/,
        /^ext-gen\d+$/,
        /^ext-comp-\d+$/,
        /^react-\w+-\d+$/,
        /^[a-zA-Z]+-[a-f0-9]{8,}$/i,
    ];

    // ========== 检查值是否需要模糊匹配 ==========
    function needsFuzzyMatch(value) {
        if (!value) return false;
        return FUZZY_PATTERNS.some(p => p.test(value));
    }

    // ========== 提取模糊匹配前缀 ==========
    function extractFuzzyPrefix(value) {
        if (!value) return null;
        let match = value.match(/^([a-zA-Z]+-[a-zA-Z]*-?)\d+$/);
        if (match) return match[1];
        match = value.match(/^([a-zA-Z]+)\d+$/);
        if (match) return match[1];
        match = value.match(/^([a-zA-Z]+-)[a-f0-9]{8,}$/i);
        if (match) return match[1];
        match = value.match(/^([a-zA-Z]+-)\d+\$.*/);
        if (match) return match[1];
        return null;
    }

    // ========== 从 URL 提取路径（去掉参数）==========
    function extractUrlPath(url) {
        if (!url) return null;
        try {
            // 去掉 ? 后面的参数
            let path = url.split('?')[0];
            // 尝试解析 URL 提取路径部分
            try {
                let urlObj = new URL(path, window.location.origin);
                return urlObj.pathname;
            } catch (e) {
                // 如果解析失败，尝试简单提取
                let match = path.match(/https?:\/\/[^\/]+(\/[^\?#]*)/);
                if (match) return match[1];
                // 如果是相对路径
                if (path.startsWith('/')) return path;
            }
            return path;
        } catch (e) {
            return null;
        }
    }

    // ========== 检查是否是有效 ID ==========
    function isValidId(id) {
        if (!id) return false;
        if (id.startsWith('ember')) return false;
        if (/^\d/.test(id)) return false;
        if (/^mini-\d+\$/.test(id)) return false;
        if (/^ext-gen\d+$/.test(id)) return false;
        return true;
    }

    // ========== 获取元素有价值的属性 ==========
    function getValuableAttributes(element) {
        if (!element || !element.attributes) return [];
        
        let attrs = [];
        for (let attrName of VALUABLE_ATTRS) {
            let value = element.getAttribute(attrName);
            if (!value || value.trim() === '') continue;
            if (value.length > 80) continue;
            if (/^[a-f0-9]{8,}$/i.test(value)) continue;
            if (/^\d{10,}$/.test(value)) continue;
            if (value.startsWith('ember')) continue;
            
            attrs.push({ name: attrName, value: value });
            if (attrs.length >= 2) break;
        }
        return attrs;
    }

    // ========== 构建属性选择器 ==========
    function buildAttrSelector(attrs, useFuzzy = true) {
        if (attrs.length === 0) return '';
        
        let result = '';
        for (let attr of attrs) {
            if (useFuzzy && needsFuzzyMatch(attr.value)) {
                let prefix = extractFuzzyPrefix(attr.value);
                if (prefix) {
                    result += `[starts-with(@${attr.name}, "${prefix}")]`;
                    continue;
                }
            }
            result += `[@${attr.name}="${attr.value}"]`;
        }
        return result;
    }

    // ========== 为 iframe 生成特殊的选择器 ==========
    function getIframeSelector(iframe) {
        if (!iframe || iframe.tagName !== 'IFRAME') return null;
        
        // 1. 优先使用 src 路径
        let src = iframe.getAttribute('src');
        if (src) {
            let path = extractUrlPath(src);
            if (path && path.length > 1 && path !== '/') {
                // 使用 contains 匹配路径
                return `iframe[contains(@src, "${path}")]`;
            }
        }
        
        // 2. 其次使用有效的 id
        if (iframe.id && isValidId(iframe.id)) {
            return `iframe[@id="${iframe.id}"]`;
        }
        
        // 3. 使用 name（如果不是动态的）
        let name = iframe.getAttribute('name');
        if (name && !needsFuzzyMatch(name)) {
            return `iframe[@name="${name}"]`;
        }
        
        // 4. 使用 title
        let title = iframe.getAttribute('title');
        if (title) {
            return `iframe[@title="${title}"]`;
        }
        
        // 5. 模糊匹配 name
        if (name && needsFuzzyMatch(name)) {
            let prefix = extractFuzzyPrefix(name);
            if (prefix) {
                return `iframe[starts-with(@name, "${prefix}")]`;
            }
        }
        
        // 6. 返回 null，让调用者使用位置索引
        return null;
    }

    // ========== XPath 生成函数 ==========
    function getXPath(element, includeAttrs = true) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) {
            return '';
        }

        // 特殊处理 iframe
        if (element.tagName === 'IFRAME') {
            let iframeSelector = getIframeSelector(element);
            if (iframeSelector) {
                // 找到父级锚点
                let parent = element.parentNode;
                while (parent && parent.nodeType === Node.ELEMENT_NODE) {
                    if (parent.id && isValidId(parent.id)) {
                        return `//*[@id="${parent.id}"]//${iframeSelector}`;
                    }
                    if (parent.id && needsFuzzyMatch(parent.id)) {
                        let prefix = extractFuzzyPrefix(parent.id);
                        if (prefix) {
                            return `//*[starts-with(@id, "${prefix}")]//${iframeSelector}`;
                        }
                    }
                    parent = parent.parentNode;
                }
                return `//${iframeSelector}`;
            }
        }

        // 优先使用有效的 ID
        if (element.id && isValidId(element.id)) {
            return `//*[@id="${element.id}"]`;
        }

        let paths = [];
        let isFirstElement = true;
        
        for (; element && element.nodeType === Node.ELEMENT_NODE; element = element.parentNode) {
            let tagName = element.tagName.toLowerCase();
            
            // 对于 iframe，使用特殊处理
            if (tagName === 'iframe') {
                let iframeSelector = getIframeSelector(element);
                if (iframeSelector) {
                    paths.unshift(iframeSelector);
                    isFirstElement = false;
                    
                    // 检查父节点 ID
                    if (element.parentNode && element.parentNode.id) {
                        let parentId = element.parentNode.id;
                        if (isValidId(parentId)) {
                            return `//*[@id="${parentId}"]/${paths.join('/')}`;
                        }
                        if (needsFuzzyMatch(parentId)) {
                            let prefix = extractFuzzyPrefix(parentId);
                            if (prefix) {
                                return `//*[starts-with(@id, "${prefix}")]/${paths.join('/')}`;
                            }
                        }
                    }
                    continue;
                }
            }
            
            // 计算同类型兄弟索引
            let index = 0;
            let siblings = element.parentNode ? element.parentNode.children : [];
            for (let i = 0; i < siblings.length; i++) {
                let sibling = siblings[i];
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
                    if (sibling === element) {
                        index++;
                        break;
                    }
                    index++;
                }
            }

            let pathIndex = index > 1 ? `[${index}]` : '';
            
            // 对目标元素添加属性
            let attrSelector = '';
            if (isFirstElement && includeAttrs) {
                let attrs = getValuableAttributes(element);
                attrSelector = buildAttrSelector(attrs, true);
            }
            
            paths.unshift(`${tagName}${pathIndex}${attrSelector}`);
            isFirstElement = false;

            // 检查父节点 ID
            if (element.parentNode && element.parentNode.id) {
                let parentId = element.parentNode.id;
                if (isValidId(parentId)) {
                    return `//*[@id="${parentId}"]/${paths.join('/')}`;
                }
                if (needsFuzzyMatch(parentId)) {
                    let prefix = extractFuzzyPrefix(parentId);
                    if (prefix) {
                        return `//*[starts-with(@id, "${prefix}")]/${paths.join('/')}`;
                    }
                }
            }
        }

        return paths.length ? '//' + paths.join('/') : '';
    }

    // ========== 简短 XPath ==========
    function getShortXPath(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';
        
        // iframe 特殊处理
        if (element.tagName === 'IFRAME') {
            let selector = getIframeSelector(element);
            if (selector) return '//' + selector;
        }
        
        if (element.id && isValidId(element.id)) {
            return `//*[@id="${element.id}"]`;
        }
        
        let tagName = element.tagName.toLowerCase();
        let attrs = getValuableAttributes(element);
        
        if (attrs.length > 0) {
            let nameAttr = attrs.find(a => a.name === 'name');
            if (nameAttr) {
                if (needsFuzzyMatch(nameAttr.value)) {
                    let prefix = extractFuzzyPrefix(nameAttr.value);
                    if (prefix) return `//${tagName}[starts-with(@name, "${prefix}")]`;
                }
                return `//${tagName}[@name="${nameAttr.value}"]`;
            }
            
            let attr = attrs[0];
            if (needsFuzzyMatch(attr.value)) {
                let prefix = extractFuzzyPrefix(attr.value);
                if (prefix) return `//${tagName}[starts-with(@${attr.name}, "${prefix}")]`;
            }
            return `//${tagName}[@${attr.name}="${attr.value}"]`;
        }
        
        return getXPath(element, false);
    }

    // ========== CSS 选择器 ==========
    function getCssSelector(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';
        
        // iframe 特殊处理
        if (element.tagName === 'IFRAME') {
            let src = element.getAttribute('src');
            if (src) {
                let path = extractUrlPath(src);
                if (path && path.length > 1) {
                    return `iframe[src*="${path}"]`;
                }
            }
        }
        
        if (element.id && isValidId(element.id)) {
            return `#${element.id}`;
        }
        
        let tagName = element.tagName.toLowerCase();
        
        let name = element.getAttribute('name');
        if (name && name.trim() && !needsFuzzyMatch(name)) {
            return `${tagName}[name="${name}"]`;
        }
        
        if (element.classList && element.classList.length > 0) {
            let classes = Array.from(element.classList).filter(c => 
                !c.startsWith('ember') && 
                !c.startsWith('mini-') &&
                !/^[a-f0-9]{6,}$/i.test(c)
            );
            if (classes.length > 0) {
                return `${tagName}.${classes.join('.')}`;
            }
        }
        
        let attrs = getValuableAttributes(element);
        if (attrs.length > 0) {
            return `${tagName}[${attrs[0].name}="${attrs[0].value}"]`;
        }
        
        let parent = element.parentNode;
        if (parent) {
            let siblings = Array.from(parent.children).filter(e => e.tagName === element.tagName);
            let index = siblings.indexOf(element) + 1;
            return `${tagName}:nth-of-type(${index})`;
        }
        
        return tagName;
    }

    // ========== 代码生成 ==========
    function generateSeleniumCode(xpath, shortXPath, iframePath) {
        let code = '';
        if (iframePath.length > 0) {
            code += '# 切换到 iframe\n';
            iframePath.forEach((path, i) => {
                code += `driver.switch_to.frame(driver.find_element(By.XPATH, "${path}"))  # 第${i+1}层\n`;
            });
            code += '\n';
        }
        code += `element = driver.find_element(By.XPATH, "${xpath}")\n`;
        if (shortXPath && shortXPath !== xpath) {
            code += `# 简短: driver.find_element(By.XPATH, "${shortXPath}")\n`;
        }
        return code;
    }

    function generatePlaywrightCode(xpath, shortXPath, iframePath) {
        let code = '';
        if (iframePath.length > 0) {
            let locator = 'page';
            iframePath.forEach(path => {
                locator += `.frame_locator("xpath=${path}")`;
            });
            code += `element = ${locator}.locator("xpath=${xpath}")\n`;
        } else {
            code += `element = page.locator("xpath=${xpath}")\n`;
        }
        return code;
    }

    function generateDrissionPageCode(xpath, shortXPath, iframePath) {
        let code = '';
        if (iframePath.length > 0) {
            code += '# 切换到 iframe\n';
            iframePath.forEach((path, i) => {
                code += `page.to_iframe("xpath:${path}")  # 第${i+1}层\n`;
            });
            code += '\n';
        }
        code += `element = page.ele("xpath:${xpath}")\n`;
        if (shortXPath && shortXPath !== xpath) {
            code += `# 简短: page.ele("xpath:${shortXPath}")\n`;
        }
        return code;
    }

    // ========== 复制到剪贴板 ==========
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('✅ 已复制');
        }).catch(() => {
            let ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); showNotification('✅ 已复制'); } 
            catch (e) { showNotification('❌ 失败'); }
            document.body.removeChild(ta);
        });
    }

    // ========== 高亮 ==========
    function highlightElement(el) {
        if (!el || !el.style) { showNotification('⚠️ 无法高亮'); return; }
        clearHighlights();
        el.style.outline = '3px solid #ff0000';
        el.style.outlineOffset = '2px';
        el.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
        highlightedElements.push(el);
    }

    function clearHighlights() {
        highlightedElements.forEach(el => {
            if (el && el.style) {
                el.style.outline = '';
                el.style.outlineOffset = '';
                el.style.backgroundColor = '';
            }
        });
        highlightedElements = [];
    }

    // ========== 更新面板 ==========
    function updatePanelContent(element, iframePath, preXPath, preShortXPath, preCss) {
        try {
            if (!element) return;
            currentElement = element;

            let xpath = preXPath || getXPath(element);
            let shortXPath = preShortXPath || getShortXPath(element);
            let css = preCss || getCssSelector(element);
            let pathArr = iframePath || [];
            let depth = pathArr.length;

            let selCode = generateSeleniumCode(xpath, shortXPath, pathArr);
            let pwCode = generatePlaywrightCode(xpath, shortXPath, pathArr);
            let dpCode = generateDrissionPageCode(xpath, shortXPath, pathArr);

            let panel = document.getElementById('electron-helper-panel');
            if (!panel) return;

            let tagEl = document.getElementById('eh-tagname');
            let iframeEl = document.getElementById('eh-iframe');
            let pathEl = document.getElementById('eh-iframe-path');
            let pathCon = panel.querySelector('.eh-iframe-path-container');
            let xpathEl = document.getElementById('eh-xpath');
            let shortEl = document.getElementById('eh-short-xpath');
            let cssEl = document.getElementById('eh-css');
            let selEl = document.getElementById('eh-selenium');
            let pwEl = document.getElementById('eh-playwright');
            let dpEl = document.getElementById('eh-drissionpage');

            if (!tagEl) return;

            let tagName = (element.tagName || '').toLowerCase();
            tagEl.textContent = tagName || '-';
            
            let isIframe = tagName === 'iframe';
            if (isIframe) {
                iframeEl.innerHTML = `<span style="color:#FF5722">⚠️ 这是 iframe 元素 (当前深度: ${depth})</span>`;
            } else {
                iframeEl.textContent = depth > 0 ? `是 (深度: ${depth})` : '否';
            }

            if (depth > 0 && pathCon) {
                let html = '';
                pathArr.forEach((p, i) => {
                    html += `<div class="eh-path-item">[${i+1}] ${p}</div>`;
                });
                pathEl.innerHTML = html;
                pathCon.style.display = 'block';
            } else if (pathCon) {
                pathCon.style.display = 'none';
            }

            xpathEl.textContent = xpath || '-';
            if (shortEl) shortEl.textContent = (shortXPath && shortXPath !== xpath) ? shortXPath : '(同上)';
            cssEl.textContent = css || '-';
            selEl.textContent = selCode;
            pwEl.textContent = pwCode;
            dpEl.textContent = dpCode;

            window.electronHelper = {
                xpath, shortXPath, css, 
                seleniumCode: selCode, 
                playwrightCode: pwCode, 
                drissionPageCode: dpCode,
                currentElement: element,
                iframePath: pathArr,
                copyXPath: function() { copyToClipboard(this.xpath); },
                copyShortXPath: function() { copyToClipboard(this.shortXPath || this.xpath); },
                copyCss: function() { copyToClipboard(this.css); },
                copySelenium: function() { copyToClipboard(this.seleniumCode); },
                copyPlaywright: function() { copyToClipboard(this.playwrightCode); },
                copyDrissionPage: function() { copyToClipboard(this.drissionPageCode); },
                highlight: function() { highlightElement(this.currentElement); },
                clearHighlight: function() { clearHighlights(); }
            };
        } catch (e) {
            console.error('[元素定位助手]', e);
        }
    }

    // ========== 创建面板 ==========
    function createFloatingPanel() {
        if (document.getElementById('electron-helper-panel')) return;

        let panel = document.createElement('div');
        panel.id = 'electron-helper-panel';
        panel.innerHTML = `
            <div class="eh-header">
                <span class="eh-title">🔍 元素定位助手 v1.6</span>
                <button class="eh-close" onclick="this.parentElement.parentElement.style.display='none'">×</button>
            </div>
            <div class="eh-content">
                <div class="eh-section">
                    <div class="eh-row"><span class="eh-label">标签:</span><span class="eh-value" id="eh-tagname">-</span></div>
                    <div class="eh-row"><span class="eh-label">iframe:</span><span class="eh-value" id="eh-iframe">否</span></div>
                </div>
                <div class="eh-iframe-path-container" style="display:none;">
                    <div class="eh-section-title">📍 iframe 路径:</div>
                    <div id="eh-iframe-path"></div>
                </div>
                <div class="eh-section">
                    <div class="eh-section-title">XPath</div>
                    <div class="eh-code-block"><code id="eh-xpath">-</code></div>
                </div>
                <div class="eh-section">
                    <div class="eh-section-title">简短 XPath</div>
                    <div class="eh-code-block eh-short"><code id="eh-short-xpath">-</code></div>
                </div>
                <div class="eh-section">
                    <div class="eh-section-title">CSS</div>
                    <div class="eh-code-block"><code id="eh-css">-</code></div>
                </div>
                <div class="eh-section">
                    <div class="eh-section-title">Selenium</div>
                    <div class="eh-code-block"><code id="eh-selenium">-</code></div>
                </div>
                <div class="eh-section">
                    <div class="eh-section-title">Playwright</div>
                    <div class="eh-code-block"><code id="eh-playwright">-</code></div>
                </div>
                <div class="eh-section">
                    <div class="eh-section-title">DrissionPage</div>
                    <div class="eh-code-block"><code id="eh-drissionpage">-</code></div>
                </div>
                <div class="eh-buttons">
                    <button onclick="window.electronHelper && window.electronHelper.copyXPath()">📋 XPath</button>
                    <button onclick="window.electronHelper && window.electronHelper.copyShortXPath()">📋 简短</button>
                    <button onclick="window.electronHelper && window.electronHelper.copyCss()">📋 CSS</button>
                    <button onclick="window.electronHelper && window.electronHelper.copySelenium()">📋 Selenium</button>
                    <button onclick="window.electronHelper && window.electronHelper.copyPlaywright()">📋 Playwright</button>
                    <button onclick="window.electronHelper && window.electronHelper.copyDrissionPage()">📋 Drission</button>
                    <button onclick="window.electronHelper && window.electronHelper.highlight()">✨ 高亮</button>
                    <button onclick="window.electronHelper && window.electronHelper.clearHighlight()">❌ 清除</button>
                </div>
                <div class="eh-tip">⌨️ F8=Drission | Alt+1=XPath | Alt+2=简短</div>
            </div>
        `;

        panel.style.cssText = `position:fixed;bottom:20px;right:20px;width:500px;max-height:85vh;overflow-y:auto;background:white;border:2px solid #4CAF50;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);font-family:Consolas,Monaco,monospace;font-size:12px;z-index:2147483647;`;

        document.body.appendChild(panel);
        injectStyles();
        makeDraggable(panel);
    }

    function injectStyles() {
        if (document.getElementById('eh-styles')) return;
        let s = document.createElement('style');
        s.id = 'eh-styles';
        s.textContent = `
            #electron-helper-panel .eh-header{background:linear-gradient(135deg,#4CAF50,#45a049);color:white;padding:10px 15px;border-radius:6px 6px 0 0;display:flex;justify-content:space-between;align-items:center;cursor:move;user-select:none}
            #electron-helper-panel .eh-title{font-weight:bold;font-size:14px}
            #electron-helper-panel .eh-close{background:rgba(255,255,255,0.2);border:none;color:white;width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:18px}
            #electron-helper-panel .eh-content{padding:10px}
            #electron-helper-panel .eh-section{margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:8px}
            #electron-helper-panel .eh-row{display:flex;margin-bottom:4px}
            #electron-helper-panel .eh-label{font-weight:bold;color:#666;min-width:55px}
            #electron-helper-panel .eh-value{color:#333;flex:1;word-break:break-all}
            #electron-helper-panel .eh-section-title{font-weight:bold;color:#4CAF50;margin-bottom:4px;font-size:11px}
            #electron-helper-panel .eh-code-block{background:#f5f5f5;padding:6px;border-radius:4px;border-left:3px solid #4CAF50;max-height:70px;overflow-y:auto}
            #electron-helper-panel .eh-code-block.eh-short{border-left-color:#FF9800;background:#FFF8E1}
            #electron-helper-panel .eh-code-block code{color:#333;white-space:pre-wrap;word-break:break-all;font-size:11px}
            #electron-helper-panel .eh-iframe-path-container{margin-bottom:8px;padding:6px;background:#E3F2FD;border-radius:4px;border-left:3px solid #2196F3}
            #electron-helper-panel .eh-path-item{font-size:10px;color:#1976D2;padding:2px 0;word-break:break-all}
            #electron-helper-panel .eh-buttons{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
            #electron-helper-panel button{background:#4CAF50;color:white;border:none;padding:6px 8px;border-radius:4px;cursor:pointer;font-size:10px}
            #electron-helper-panel button:hover{background:#45a049}
            #electron-helper-panel .eh-tip{margin-top:8px;font-size:10px;color:#999;text-align:center}
        `;
        document.head.appendChild(s);
    }

    function makeDraggable(el) {
        let x=0,y=0,x2=0,y2=0;
        let h = el.querySelector('.eh-header');
        if(h) h.onmousedown = function(e){
            e.preventDefault(); x2=e.clientX; y2=e.clientY;
            document.onmouseup = function(){document.onmouseup=null;document.onmousemove=null};
            document.onmousemove = function(e){
                e.preventDefault();
                x=x2-e.clientX; y=y2-e.clientY; x2=e.clientX; y2=e.clientY;
                el.style.top=(el.offsetTop-y)+"px";
                el.style.left=(el.offsetLeft-x)+"px";
                el.style.bottom='auto'; el.style.right='auto';
            };
        };
    }

    function showNotification(msg) {
        let n = document.createElement('div');
        n.textContent = msg;
        n.style.cssText = 'position:fixed;top:20px;right:20px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:12px 20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:2147483647;font-size:14px';
        document.body.appendChild(n);
        setTimeout(() => { if(n.parentNode) n.parentNode.removeChild(n); }, 1500);
    }

    // ========== 递归注入 iframe ==========
    function injectIntoAllIframes(doc, parentPath) {
        let iframes;
        try { iframes = doc.querySelectorAll('iframe'); } catch(e) { return; }
        
        iframes.forEach(iframe => {
            try {
                let iDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (!iDoc || !iDoc.body) return;
                if (iDoc.getElementById('eh-injected')) return;

                let marker = iDoc.createElement('div');
                marker.id = 'eh-injected';
                marker.style.display = 'none';
                iDoc.body.appendChild(marker);

                let iframeXPath = getXPath(iframe);
                let fullPath = parentPath.concat([iframeXPath]);
                
                console.log(`[元素定位助手] 注入 iframe: ${iframeXPath}`);
                injectScriptToIframe(iDoc, fullPath);

                setTimeout(() => injectIntoAllIframes(iDoc, fullPath), 300);
            } catch (e) {}
        });
    }

    // ========== 注入脚本到 iframe ==========
    function injectScriptToIframe(iDoc, fullPath) {
        let pathJson = JSON.stringify(fullPath);
        
        let script = iDoc.createElement('script');
        script.textContent = `
(function() {
    var IFRAME_PATH = ${pathJson};
    
    var FUZZY = [/^mini-iframe-\\d+$/,/^mini-\\d+\\$.*$/,/^ember\\d+$/,/^ext-gen\\d+$/];
    function needsFuzzy(v) { return v && FUZZY.some(function(p){return p.test(v)}); }
    function extractPrefix(v) {
        if(!v) return null;
        var m = v.match(/^([a-zA-Z]+-[a-zA-Z]*-?)\\d+$/);
        if(m) return m[1];
        m = v.match(/^([a-zA-Z]+)\\d+$/);
        if(m) return m[1];
        m = v.match(/^([a-zA-Z]+-)\d+\\$.*/);
        if(m) return m[1];
        return null;
    }
    function isValidId(id) {
        return id && !id.startsWith('ember') && !/^\\d/.test(id) && !/^mini-\\d+\\$/.test(id);
    }
    function extractUrlPath(url) {
        if(!url) return null;
        var p = url.split('?')[0];
        var m = p.match(/https?:\\/\\/[^\\/]+(\\/[^\\?#]*)/);
        return m ? m[1] : (p.startsWith('/') ? p : null);
    }
    
    function getIframeSelector(el) {
        if(!el || el.tagName !== 'IFRAME') return null;
        var src = el.getAttribute('src');
        if(src) {
            var path = extractUrlPath(src);
            if(path && path.length > 1 && path !== '/') return 'iframe[contains(@src, "' + path + '")]';
        }
        if(el.id && isValidId(el.id)) return 'iframe[@id="' + el.id + '"]';
        var name = el.getAttribute('name');
        if(name && !needsFuzzy(name)) return 'iframe[@name="' + name + '"]';
        var title = el.getAttribute('title');
        if(title) return 'iframe[@title="' + title + '"]';
        if(name && needsFuzzy(name)) {
            var pre = extractPrefix(name);
            if(pre) return 'iframe[starts-with(@name, "' + pre + '")]';
        }
        return null;
    }
    
    var ATTRS = ['name','type','placeholder','title','textname','data-id','data-name'];
    function getAttrs(el) {
        if(!el||!el.attributes) return [];
        var arr = [];
        for(var i=0;i<ATTRS.length;i++){
            var v = el.getAttribute(ATTRS[i]);
            if(v && v.trim() && v.length<=80 && !v.startsWith('ember') && !/^[a-f0-9]{8,}$/i.test(v)){
                arr.push({name:ATTRS[i],value:v});
                if(arr.length>=2) break;
            }
        }
        return arr;
    }
    function buildAttr(attrs) {
        var r = '';
        for(var i=0;i<attrs.length;i++){
            var a = attrs[i];
            if(needsFuzzy(a.value)){
                var p = extractPrefix(a.value);
                if(p){ r += '[starts-with(@'+a.name+', "'+p+'")]'; continue; }
            }
            r += '[@'+a.name+'="'+a.value+'"]';
        }
        return r;
    }
    
    function getXPath(el, withAttr) {
        if(withAttr===undefined) withAttr=true;
        if(!el||el.nodeType!==1) return '';
        
        if(el.tagName==='IFRAME') {
            var sel = getIframeSelector(el);
            if(sel) {
                var p = el.parentNode;
                while(p && p.nodeType===1) {
                    if(p.id && isValidId(p.id)) return '//*[@id="'+p.id+'"]//' + sel;
                    if(p.id && needsFuzzy(p.id)) {
                        var pre = extractPrefix(p.id);
                        if(pre) return '//*[starts-with(@id, "'+pre+'")]//' + sel;
                    }
                    p = p.parentNode;
                }
                return '//' + sel;
            }
        }
        
        if(el.id && isValidId(el.id)) return '//*[@id="'+el.id+'"]';
        
        var paths=[], first=true;
        for(;el&&el.nodeType===1;el=el.parentNode){
            var tag = el.tagName.toLowerCase();
            
            if(tag==='iframe') {
                var iSel = getIframeSelector(el);
                if(iSel) { paths.unshift(iSel); first=false; }
                else {
                    var idx=0, sibs=el.parentNode?el.parentNode.children:[];
                    for(var i=0;i<sibs.length;i++){
                        if(sibs[i].nodeType===1&&sibs[i].tagName===el.tagName){
                            if(sibs[i]===el){idx++;break}
                            idx++;
                        }
                    }
                    paths.unshift(tag+(idx>1?'['+idx+']':''));
                    first=false;
                }
            } else {
                var idx=0, sibs=el.parentNode?el.parentNode.children:[];
                for(var i=0;i<sibs.length;i++){
                    if(sibs[i].nodeType===1&&sibs[i].tagName===el.tagName){
                        if(sibs[i]===el){idx++;break}
                        idx++;
                    }
                }
                var pidx=idx>1?'['+idx+']':'';
                var attr='';
                if(first&&withAttr) attr=buildAttr(getAttrs(el));
                paths.unshift(tag+pidx+attr);
                first=false;
            }
            
            if(el.parentNode&&el.parentNode.id){
                var pid=el.parentNode.id;
                if(isValidId(pid)) return '//*[@id="'+pid+'"]/'+paths.join('/');
                if(needsFuzzy(pid)){
                    var pre=extractPrefix(pid);
                    if(pre) return '//*[starts-with(@id, "'+pre+'")]/'+paths.join('/');
                }
            }
        }
        return paths.length?'//'+paths.join('/'):'';
    }
    
    function getShort(el) {
        if(!el||el.nodeType!==1) return '';
        if(el.tagName==='IFRAME') {
            var sel = getIframeSelector(el);
            if(sel) return '//' + sel;
        }
        if(el.id&&isValidId(el.id)) return '//*[@id="'+el.id+'"]';
        var tag=el.tagName.toLowerCase();
        var attrs=getAttrs(el);
        if(attrs.length>0){
            var a=attrs[0];
            if(needsFuzzy(a.value)){
                var p=extractPrefix(a.value);
                if(p) return '//'+tag+'[starts-with(@'+a.name+', "'+p+'")]';
            }
            return '//'+tag+'[@'+a.name+'="'+a.value+'"]';
        }
        return getXPath(el,false);
    }
    
    function getCss(el) {
        if(!el||el.nodeType!==1) return '';
        if(el.tagName==='IFRAME') {
            var src=el.getAttribute('src');
            if(src) {
                var path=extractUrlPath(src);
                if(path&&path.length>1) return 'iframe[src*="'+path+'"]';
            }
        }
        if(el.id&&isValidId(el.id)) return '#'+el.id;
        var tag=el.tagName.toLowerCase();
        var name=el.getAttribute('name');
        if(name&&name.trim()&&!needsFuzzy(name)) return tag+'[name="'+name+'"]';
        if(el.classList&&el.classList.length){
            var cls=[];
            for(var i=0;i<el.classList.length;i++){
                var c=el.classList[i];
                if(!c.startsWith('ember')&&!c.startsWith('mini-')) cls.push(c);
            }
            if(cls.length) return tag+'.'+cls.join('.');
        }
        return tag;
    }
    
    document.addEventListener('mouseover', function(e){
        var t=e.target;
        if(!t||t.nodeType!==1) return;
        if(t.tagName==='HTML'||t.tagName==='BODY') return;
        if(t.id==='eh-injected') return;
        
        try{
            var top=window;
            while(top.parent!==top) top=top.parent;
            top.postMessage({
                type:'EH_HOVER',
                tagName:t.tagName.toLowerCase(),
                xpath:getXPath(t),
                shortXPath:getShort(t),
                css:getCss(t),
                iframePath:IFRAME_PATH
            },'*');
        }catch(e){}
    },true);
    
    console.log('[元素定位助手] iframe注入完成');
})();
        `;
        
        try { (iDoc.head || iDoc.body).appendChild(script); } catch(e){}
    }

    // ========== 消息监听 ==========
    function setupMessageListener() {
        window.addEventListener('message', function(e) {
            if (!e.data || e.data.type !== 'EH_HOVER') return;
            let d = e.data;
            updatePanelContent(
                { tagName: d.tagName || 'unknown', nodeType: 1 },
                d.iframePath || [],
                d.xpath, d.shortXPath, d.css
            );
        });
    }

    // ========== 事件监听 ==========
    function setupEventListeners() {
        document.addEventListener('mouseover', function(e) {
            if (!e.target) return;
            if (e.target.closest && e.target.closest('#electron-helper-panel')) return;
            if (e.target.nodeType === 1 && e.target.tagName !== 'HTML' && e.target.tagName !== 'BODY') {
                updatePanelContent(e.target, [], null, null, null);
            }
        }, true);

        document.addEventListener('keydown', function(e) {
            if (e.keyCode === 119) { e.preventDefault(); if(window.electronHelper) copyToClipboard(window.electronHelper.drissionPageCode); }
            if (e.altKey && e.keyCode === 49) { e.preventDefault(); if(window.electronHelper) copyToClipboard(window.electronHelper.xpath); }
            if (e.altKey && e.keyCode === 50) { e.preventDefault(); if(window.electronHelper) copyToClipboard(window.electronHelper.shortXPath||window.electronHelper.xpath); }
            if (e.keyCode === 27) clearHighlights();
        });
    }

    // ========== 观察器 ==========
    function setupObserver() {
        setInterval(() => injectIntoAllIframes(document, []), 2000);
        try {
            new MutationObserver(m => {
                if(m.some(x=>Array.from(x.addedNodes).some(n=>n.tagName==='IFRAME'||(n.querySelectorAll&&n.querySelectorAll('iframe').length))))
                    setTimeout(()=>injectIntoAllIframes(document,[]),500);
            }).observe(document.body, {childList:true,subtree:true});
        } catch(e){}
    }

    // ========== 初始化 ==========
    function init() {
        createFloatingPanel();
        setupEventListeners();
        setupMessageListener();
        [500,1500,3000].forEach(t => setTimeout(() => injectIntoAllIframes(document, []), t));
        setupObserver();
        console.log('%c✅ 元素定位助手 v1.6', 'color:#4CAF50;font-size:16px;font-weight:bold');
        console.log('   📍 iframe 现在优先使用 src 路径定位');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
