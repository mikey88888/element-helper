// 骚神库 DP_helper v10.1 增强功能
// 本文件在 content.js 之后加载，添加启停控制和操作面板功能

// 全局变量
var plugin_enabled = true;  // 插件启停状态
var operation_panel = null;

// 鼠标位置全局变量
window.mouseX = 0;
window.mouseY = 0;

// 等待 main_app 创建完成
function initV10_1Features() {
    // 检查首次运行
    checkFirstRun();

    // 加载插件状态
    loadPluginState();

    // 创建操作面板（只在主页面创建）
    // v10.1.2 - 修复 iframe 多悬浮球问题：只在主页面创建面板
    if (window === window.top) {
        try {
            operation_panel = new OperationPanel();
            console.log('v10.1 操作面板已创建');
        } catch (e) {
            console.error('创建操作面板失败:', e);
        }
    } else {
        console.log('[v10_1] In iframe, skipping operation panel creation');
    }

    // 添加增强的键盘监听
    addEnhancedKeyboardListeners();

    // 添加增强的侧边栏功能
    addEnhancedSidebarFeatures();

    // 添加鼠标监听增强
    addEnhancedMouseListeners();

    // 根据启停状态更新UI
    updateUIByPluginState();
}

// 根据启停状态更新UI
function updateUIByPluginState() {
    // 控制原有的信息展示栏
    if (!plugin_enabled) {
        const navbar = document.getElementById('daohanglan');
        if (navbar) {
            navbar.style.display = 'none';
        }
    }
}

// 检查首次运行
function checkFirstRun() {
    chrome.storage.local.get('first_run_v10_1', (result) => {
        if (result.first_run_v10_1 !== false) {
            setTimeout(() => {
                const message = `🎉 欢迎使用骚神库元素定位助手 v10.1！

📌 主要快捷键：
• Alt+E - 启用/禁用插件
• Alt+O - 打开/关闭操作面板
• Alt+1 - 复制智能 XPath

✨ 新功能：
• 智能 XPath 生成（自动识别最佳定位策略）
• 元素选择模式（类似 F12）
• 完整的验证和高亮功能

点击确定开始使用！`;
                alert(message);
                chrome.storage.local.set({ first_run_v10_1: false });
            }, 1000);
        }
    });
}

// 加载插件状态
function loadPluginState() {
    chrome.storage.local.get('plugin_enabled', (result) => {
        if (result.plugin_enabled !== undefined) {
            plugin_enabled = result.plugin_enabled;
        }
    });
}

// 切换插件启停
function togglePlugin() {
    plugin_enabled = !plugin_enabled;
    chrome.storage.local.set({ plugin_enabled: plugin_enabled });

    const message = plugin_enabled ? '✅ 插件已启用' : '❌ 插件已禁用';
    showNotification(message);

    // 更新侧边栏按钮
    updateSidebarButtons();

    // 更新UI状态
    updateUIByPluginState();
}

// 显示通知
function showNotification(message) {
    const notification = $('<div class="xiong-notification">' + message + '</div>');
    $('body').append(notification);
    notification.fadeIn(300);
    setTimeout(() => {
        notification.fadeOut(300, () => notification.remove());
    }, 2000);
}

// 添加增强的键盘监听
function addEnhancedKeyboardListeners() {
    // 移除旧的监听器（如果存在）
    if (window.v10_1_keyboardHandler) {
        $(document).off('keydown', window.v10_1_keyboardHandler);
    }

    // 添加新的监听器 - 优先级最高，使用 capture 模式
    window.v10_1_keyboardHandler = function(event) {
        // Alt+E - 启用/禁用插件（始终有效，不受插件状态影响）
        if (event.altKey && (event.key === 'e' || event.key === 'E')) {
            event.preventDefault();
            event.stopPropagation();
            togglePlugin();
            return false;
        }

        // Alt+O - 打开/关闭操作面板（始终有效）
        if (event.altKey && (event.key === 'o' || event.key === 'O')) {
            event.preventDefault();
            event.stopPropagation();
            if (operation_panel && operation_panel.toggle) {
                operation_panel.toggle();
            } else {
                console.error('操作面板未初始化');
                showNotification('操作面板未初始化，请刷新页面');
            }
            return false;
        }

        // 如果插件未启用，阻止其他快捷键
        if (!plugin_enabled) {
            // F2, F8, F9, Alt+1
            if (event.keyCode === 113 || event.keyCode === 119 || event.keyCode === 120 ||
                (event.keyCode === 49 && event.altKey)) {
                event.preventDefault();
                event.stopPropagation();
                showNotification('插件已禁用，请按 Alt+E 启用');
                return false;
            }
        }
    };

    // 使用 capture 模式确保优先捕获
    $(document).on('keydown', window.v10_1_keyboardHandler);
}

// 添加增强的侧边栏功能
function addEnhancedSidebarFeatures() {
    // 等待侧边栏创建完成
    setTimeout(() => {
        const $menu = $('.xiong-dropdown-menu');
        if ($menu.length > 0) {
            // 检查是否已经添加过
            if ($('#sao_toggle_plugin_v10').length === 0) {
                // 在菜单顶部添加分隔线和启停按钮
                const toggleItem = $('<div id="sao_toggle_plugin_v10" class="xiong-dropdown-item">禁用插件 (Alt+E)</div>');
                const panelItem = $('<div id="sao_open_panel_v10" class="xiong-dropdown-item">打开操作面板 (Alt+O)</div>');
                const divider = $('<hr class="xiong-divider">');

                $menu.prepend(divider);
                $menu.prepend(panelItem);
                $menu.prepend(toggleItem);

                // 绑定事件
                $('#sao_toggle_plugin_v10').click(function() {
                    togglePlugin();
                });

                $('#sao_open_panel_v10').click(function() {
                    if (operation_panel && operation_panel.toggle) {
                        operation_panel.toggle();
                    } else {
                        showNotification('操作面板未初始化，请刷新页面');
                    }
                });
            }
        }
    }, 500);
}

// 更新侧边栏按钮状态
function updateSidebarButtons() {
    const $btn = $('#sao_toggle_plugin_v10');
    if ($btn.length > 0) {
        if (plugin_enabled) {
            $btn.text('禁用插件 (Alt+E)');
        } else {
            $btn.text('启用插件 (Alt+E)');
        }
    }

    // 同步更新 popup 中的开关状态
    chrome.storage.local.get('plugin_enabled', (result) => {
        const enabled = result.plugin_enabled !== undefined ? result.plugin_enabled : true;
        // 这里不能直接访问 popup 的 DOM，但存储已经更新
    });
}

// 添加增强的鼠标监听
function addEnhancedMouseListeners() {
    // 添加鼠标移动监听来更新全局坐标
    document.addEventListener('mousemove', function(event) {
        window.mouseX = event.clientX;
        window.mouseY = event.clientY;
        // v10.1 - 移除自动更新元素信息，改用选择模式
    });
}

// 在 DOM 加载完成后初始化
$(document).ready(function() {
    // 等待一小段时间确保原有代码已经执行
    setTimeout(initV10_1Features, 500);
});
