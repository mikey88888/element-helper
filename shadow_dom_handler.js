// Shadow DOM 检测和处理 - v10.1 技术架构增强
// 用于检测和提示 Shadow DOM 中的元素定位限制

class ShadowDOMDetector {
    constructor() {
        this.detectedShadowRoots = new Set();
    }

    // 检测元素是否在 Shadow DOM 中
    isInsideShadowDOM(element) {
        if (!element) {
            return { inside: false };
        }

        let current = element;
        let depth = 0;
        const maxDepth = 10; // 防止无限循环

        while (current && current !== document.body && depth < maxDepth) {
            const rootNode = current.getRootNode();

            // 检查是否是 Shadow Root
            if (rootNode instanceof ShadowRoot) {
                return {
                    inside: true,
                    mode: rootNode.mode,
                    host: rootNode.host,
                    depth: depth,
                    accessible: rootNode.mode === 'open'
                };
            }

            current = current.parentElement;
            depth++;
        }

        return { inside: false };
    }

    // 获取 Shadow Host 元素
    getShadowHost(element) {
        const shadowInfo = this.isInsideShadowDOM(element);
        return shadowInfo.inside ? shadowInfo.host : null;
    }

    // 检测 Shadow DOM 是否可访问
    isAccessible(shadowRoot) {
        return shadowRoot && shadowRoot.mode === 'open';
    }

    // 获取元素到 Shadow Host 的路径
    getPathToHost(element) {
        const shadowInfo = this.isInsideShadowDOM(element);
        if (!shadowInfo.inside || !shadowInfo.host) {
            return null;
        }

        const path = [];
        let current = element;

        while (current && current !== shadowInfo.host) {
            if (current.parentElement) {
                const siblings = Array.from(current.parentElement.children);
                const index = siblings.indexOf(current);
                path.unshift(`${current.tagName.toLowerCase()}[${index}]`);
            }
            current = current.parentElement;
        }

        return {
            host: shadowInfo.host,
            path: path.join(' > ')
        };
    }

    // 检测页面上所有的 Shadow DOM
    detectAllShadowRoots() {
        const shadows = [];
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (node) => {
                    // 检查元素是否有 Shadow Root
                    if (node.shadowRoot) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );

        let node;
        while ((node = walker.nextNode())) {
            if (node.shadowRoot) {
                shadows.push({
                    host: node,
                    root: node.shadowRoot,
                    mode: node.shadowRoot.mode,
                    tagName: node.tagName.toLowerCase(),
                    id: node.id || null
                });
            }
        }

        return shadows;
    }

    // 在 Shadow DOM 中查找元素
    findInShadowDOM(shadowRoot, selector) {
        try {
            // 尝试使用 querySelector
            return shadowRoot.querySelector(selector);
        } catch (e) {
            console.error('Failed to query shadow DOM:', e);
            return null;
        }
    }

    // 生成 Shadow DOM 中元素的描述
    generateShadowDOMDescription(element) {
        const shadowInfo = this.isInsideShadowDOM(element);

        if (!shadowInfo.inside) {
            return null;
        }

        let description = {
            context: 'shadow-dom',
            mode: shadowInfo.mode,
            accessible: shadowInfo.accessible,
            warning: null,
            hostInfo: null,
            innerPath: null
        };

        // 检查是否可访问
        if (!shadowInfo.accessible) {
            description.warning = '❌ 元素位于 closed 模式的 Shadow DOM 中，无法直接访问';
            description.hostInfo = `Shadow Host: ${shadowInfo.host.tagName.toLowerCase()}${shadowInfo.host.id ? '#' + shadowInfo.host.id : ''}`;
            return description;
        }

        // Open 模式 Shadow DOM
        description.warning = '⚠️ 元素位于 Shadow DOM 中，标准 XPath 无法直接访问';

        // 获取 Host 元素信息
        const hostXPath = this.getHostXPath(shadowInfo.host);
        description.hostInfo = `Shadow Host: ${hostXPath}`;

        // 获取 Shadow Root 内的路径
        const innerPath = this.getInnerPath(element, shadowInfo.host);
        description.innerPath = innerPath;

        // 生成完整描述
        description.fullDescription = `${description.hostInfo} >> Shadow Root >> ${innerPath}`;

        return description;
    }

    // 获取 Shadow Host 的 XPath
    getHostXPath(hostElement) {
        if (!hostElement) return null;

        if (hostElement.id) {
            return `//*[@id='${hostElement.id}']`;
        }

        // 简单的 tag + index 生成
        let tagName = hostElement.tagName.toLowerCase();
        if (hostElement.parentElement) {
            const siblings = Array.from(hostElement.parentElement.children)
                .filter(el => el.tagName === hostElement.tagName);
            const index = siblings.indexOf(hostElement);
            return `//${tagName}[${index + 1}]`;
        }

        return `//${tagName}`;
    }

    // 获取 Shadow Root 内的路径
    getInnerPath(element, hostElement) {
        if (!element || !hostElement) return null;

        const path = [];
        let current = element;

        // 在 Shadow Root 内向上遍历
        while (current && current.getRootNode() === hostElement.shadowRoot) {
            if (current.parentElement) {
                const siblings = Array.from(current.parentElement.children);
                const index = siblings.indexOf(current);

                const tagName = current.tagName.toLowerCase();
                const idPart = current.id ? `#${current.id}` : '';
                const classPart = current.className ? `.${current.className.toString().split(' ').join('.')}` : '';

                path.unshift(`${tagName}${idPart}${classPart}[${index}]`);
            }

            current = current.parentElement;
        }

        return path.join(' > ');
    }

    // 为用户生成提示信息
    generateUserHint(shadowInfo) {
        if (!shadowInfo.inside) {
            return '';
        }

        let hint = '\n\n⚠️ Shadow DOM 检测\n';

        if (shadowInfo.mode === 'closed') {
            hint += '模式: closed（无法访问）\n';
            hint += '说明: 位于 closed 模式的 Shadow DOM 中，标准定位方法无法访问该元素。\n';
            hint += '建议: 使用 Shadow Host 元素进行定位，或联系开发者修改为 open 模式。';
        } else {
            hint += '模式: open（可访问）\n';
            hint += '说明: 位于 Shadow DOM 中，标准 XPath 无法直接进入。\n';
            hint += '建议: 需要使用 JavaScript 或 Playwright 的 Shadow DOM 支持来定位此元素。';
        }

        return hint;
    }
}

// 导出检测器实例
const shadowDOMDetector = new ShadowDOMDetector();

console.log('[ShadowDOMHandler] Ready - Shadow DOM detection enabled');
