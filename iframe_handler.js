// Iframe 上下文管理器 - v10.1 技术架构增强
// 用于处理跨域 iframe 中的元素定位

class IframeContextManager {
    constructor() {
        this.frameId = this.getFrameId();
        this.isTopFrame = window === window.top;
        this.framePath = this.getFramePath();
        this.parentFrameId = null;

        // 如果在 iframe 中，注册到 background
        if (!this.isTopFrame) {
            this.registerFrame();
        }
    }

    // 获取当前 frame 的唯一标识
    getFrameId() {
        // 尝试获取 frame 的 id 或 name
        if (window.frameElement) {
            return window.frameElement.id ||
                   window.frameElement.name ||
                   `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        return 'top-frame';
    }

    // 获取 frame 层级路径（用于 RPA 工具通用描述）
    getFramePath() {
        if (this.isTopFrame) {
            return 'top';
        }

        const path = [];
        let current = window;

        // 向上遍历所有父级 frame
        while (current !== current.top) {
            const frameElement = current.frameElement;
            if (!frameElement) break;

            // 获取 frame 在父级中的索引
            const parent = frameElement.parentElement;
            if (parent) {
                const allFrames = Array.from(parent.querySelectorAll('iframe, frame'));
                const index = allFrames.indexOf(frameElement);

                // 获取 frame 的 title 或 name 作为描述
                const title = frameElement.title || frameElement.name || `iframe[${index}]`;
                path.unshift(title);
            }

            current = current.parent;
        }

        return path.length > 0 ? path.join(' > ') : 'top';
    }

    // 获取 frame 的 XPath 定位器
    getFrameXPath() {
        if (this.isTopFrame) {
            return null;
        }

        const path = [];
        let current = window;

        while (current !== current.top) {
            const frameElement = current.frameElement;
            if (!frameElement) break;

            const parent = frameElement.parentElement;
            if (parent) {
                const allFrames = Array.from(parent.querySelectorAll('iframe, frame'));
                const index = allFrames.indexOf(frameElement);

                // 生成 frame 的 XPath
                if (frameElement.id) {
                    path.unshift(`//iframe[@id='${frameElement.id}']`);
                } else if (frameElement.name) {
                    path.unshift(`//iframe[@name='${frameElement.name}']`);
                } else {
                    path.unshift(`//iframe[${index + 1}]`);
                }
            }

            current = current.parent;
        }

        return path.length > 0 ? path.join(' > ') : null;
    }

    // 注册当前 frame 到 background
    registerFrame() {
        try {
            chrome.runtime.sendMessage({
                type: 'REGISTER_IFRAME',
                frameId: this.frameId,
                framePath: this.framePath,
                frameXPath: this.getFrameXPath(),
                url: window.location.href
            });
        } catch (e) {
            console.warn('Failed to register iframe:', e);
        }
    }

    // 向 background 发送消息
    sendMessageToBackground(message) {
        try {
            chrome.runtime.sendMessage({
                type: 'IFRAME_MESSAGE',
                frameId: this.frameId,
                framePath: this.framePath,
                isTopFrame: this.isTopFrame,
                url: window.location.href,
                ...message
            });
        } catch (e) {
            console.warn('Failed to send message to background:', e);
        }
    }

    // 在当前 frame 中查找元素
    findElement(xpath) {
        try {
            const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            return result.singleNodeValue;
        } catch (e) {
            console.error('Failed to find element:', e);
            return null;
        }
    }

    // 在当前 frame 中高亮元素
    highlightElement(element) {
        if (!element) return;

        // 移除之前的高亮
        this.removeHighlight(element);

        // 添加高亮类
        element.classList.add('xiong-iframe-highlight');

        // 添加高亮标记
        const marker = document.createElement('div');
        marker.className = 'xiong-iframe-highlight-marker';
        marker.style.cssText = `
            position: absolute;
            border: 3px solid #ff0000 !important;
            outline-offset: 2px;
            pointer-events: none;
            z-index: 999999;
            animation: iframeHighlightPulse 1s ease-in-out infinite;
        `;

        const rect = element.getBoundingClientRect();
        marker.style.top = (rect.top + window.scrollY) + 'px';
        marker.style.left = (rect.left + window.scrollX) + 'px';
        marker.style.width = rect.width + 'px';
        marker.style.height = rect.height + 'px';

        document.body.appendChild(marker);

        // 3秒后自动移除
        setTimeout(() => {
            this.removeHighlight(element);
            if (marker.parentNode) {
                marker.parentNode.removeChild(marker);
            }
        }, 3000);
    }

    // 移除高亮
    removeHighlight(element) {
        if (element) {
            element.classList.remove('xiong-iframe-highlight');
        }
        // 移除所有高亮标记
        document.querySelectorAll('.xiong-iframe-highlight-marker').forEach(marker => {
            if (marker.parentNode) {
                marker.parentNode.removeChild(marker);
            }
        });
    }

    // 获取元素信息
    getElementInfo(element) {
        if (!element) return null;

        const info = {
            tag: element.tagName.toLowerCase(),
            id: element.id || null,
            className: element.className || null,
            text: element.textContent?.trim().substring(0, 50) || null,
            xpath: null,
            frameContext: {
                frameId: this.frameId,
                framePath: this.framePath,
                frameXPath: this.getFrameXPath(),
                isTopFrame: this.isTopFrame
            }
        };

        return info;
    }
}

// 在 iframe 中添加高亮样式
if (!document.getElementById('xiong-iframe-styles')) {
    const style = document.createElement('style');
    style.id = 'xiong-iframe-styles';
    style.textContent = `
        @keyframes iframeHighlightPulse {
            0%, 100% {
                border-color: #ff0000;
            }
            50% {
                border-color: #ff6b6b;
            }
        }

        .xiong-iframe-highlight {
            position: relative !important;
        }

        .xiong-iframe-highlight-marker {
            box-sizing: border-box !important;
        }
    `;
    document.head.appendChild(style);
}

// 初始化 iframe 上下文管理器
const iframeContextManager = new IframeContextManager();

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FIND_ELEMENT_IN_IFRAME') {
        const element = iframeContextManager.findElement(message.xpath);
        if (element) {
            sendResponse({
                success: true,
                frameId: iframeContextManager.frameId,
                framePath: iframeContextManager.framePath,
                info: iframeContextManager.getElementInfo(element)
            });

            // 高亮元素
            iframeContextManager.highlightElement(element);
        } else {
            sendResponse({
                success: false,
                frameId: iframeContextManager.frameId,
                error: 'Element not found'
            });
        }
    } else if (message.type === 'HIGHLIGHT_ELEMENT_IN_IFRAME') {
        const element = iframeContextManager.findElement(message.xpath);
        iframeContextManager.highlightElement(element);
        sendResponse({ success: true });
    }

    return true; // 保持消息通道打开
});

console.log('[IframeHandler] Ready - Frame:', iframeContextManager.framePath);
