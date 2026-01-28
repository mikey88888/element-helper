function set_on() {
    chrome.storage.local.set({ show_div: '显示' }, function () {
        console.log('Data saved.');
    });

    // 读取数据
    chrome.storage.local.get('show_div', function (result) {
        
        document.getElementById('ceshi').innerHTML = '->' + result.show_div;
        document.getElementById('on1').innerHTML = '关闭信息展示栏';
        document.getElementById('on1').style.backgroundColor = 'red'
        // console.log(result.show_div);

    });

}
function set_off() {
    chrome.storage.local.set({ show_div: '隐藏' }, function () {
        console.log('Data saved.');
    });

    // 读取数据
    chrome.storage.local.get('show_div', function (result) {
        
        document.getElementById('ceshi').innerHTML = '->' + result.show_div;
        document.getElementById('on1').innerHTML = '开启信息展示栏';
        document.getElementById('on1').style.backgroundColor = 'green'
        // console.log(result.show_div);

    });

}

function toggleSwitch() {
    // 切换开关状态
    var checkBox = document.getElementById("kaiguan1");
    if (checkBox.checked) {        
        
        set_off();
    } else {       
        
        set_on();
    }
}
function toggleSwitch_button() {
        // 切换开关状态

    if (document.getElementById('ceshi').innerHTML.includes('显示')) {

        set_off();
        
    } else {
        set_on();
        
    }
}
function scan_finger_print(){
    window.open("https://ip77.net/", "_blank");
}
function open_video_website(){
    window.open("https://space.bilibili.com/308704191/channel/collectiondetail?sid=1947582", "_blank");
}
function open_chaxun_website(){
    let info=document.getElementById('search_input').value;
    window.open("https://drissionpage.cn/search?q="+info, "_blank");
}

// v10.1 新增：插件启停控制功能
function set_plugin_on() {
    chrome.storage.local.set({ plugin_enabled: true }, function () {
        console.log('Plugin enabled.');
        updatePluginSwitchUI(true);
    });
}

function set_plugin_off() {
    chrome.storage.local.set({ plugin_enabled: false }, function () {
        console.log('Plugin disabled.');
        updatePluginSwitchUI(false);
    });
}

function updatePluginSwitchUI(enabled) {
    const switchEl = document.getElementById('plugin_enabled_switch');
    if (switchEl) {
        switchEl.checked = enabled;
    }
}

function initPluginSwitch() {
    // 读取插件启停状态
    chrome.storage.local.get('plugin_enabled', function (result) {
        const enabled = result.plugin_enabled !== undefined ? result.plugin_enabled : true;
        updatePluginSwitchUI(enabled);
    });

    // 绑定开关事件
    const switchEl = document.getElementById('plugin_enabled_switch');
    if (switchEl) {
        switchEl.addEventListener('change', function() {
            if (this.checked) {
                set_plugin_on();
            } else {
                set_plugin_off();
            }
        });
    }
}

// 初始化所有开关
function initAllSwitches() {
    // 原有的超级按钮开关初始化
    var checkBox = document.getElementById("kaiguan2");
    chrome.storage.local.get('show_div', function (result) {
        if (result.show_div === '隐藏') {
            checkBox.checked = false;
        } else {
            checkBox.checked = true;
        }
        document.getElementById('ceshi').innerHTML = '->' + result.show_div;
        if (result.show_div === '显示') {
            document.getElementById('on1').innerHTML = '关闭信息展示栏';
            document.getElementById('on1').style.backgroundColor = 'red'
        } else {
            document.getElementById('on1').innerHTML = '开启信息展示栏';
            document.getElementById('on1').style.backgroundColor = 'green'
        }
    });

    checkBox.addEventListener('change', function() {
        toggleSwitch_button();
    });

    // v10.1 新增：初始化插件启停开关
    initPluginSwitch();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initAllSwitches();
});

// 获取 on1 按钮元素并添加点击事件监听器




document.getElementById('on1').addEventListener('click', scan_finger_print);
document.getElementById('jiaocheng').addEventListener('click', open_video_website);
document.getElementById('search').addEventListener('click', open_chaxun_website);






