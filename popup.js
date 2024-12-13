// 在文件开头添加
console.log('Popup script loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded');
});

// 存储管理
const storage = {
  async get(key) {
    return new Promise(resolve => {
      chrome.storage.local.get(key, result => resolve(result[key]));
    });
  },

  async set(key, value) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }
};

// 设置管理
const settings = {
  async init() {
    // 获取当前实际的快捷键设置
    chrome.commands.getAll((commands) => {
      const screenshotCommand = commands.find(cmd => cmd.name === 'print-shortcut');
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      
      if (screenshotCommand && screenshotCommand.shortcut) {
        document.getElementById('shortcut').value = screenshotCommand.shortcut;
      } else {
        // 如果没有设置快捷键，显示默认值
        document.getElementById('shortcut').value = isMac ? 'Command+Shift+S' : 'Ctrl+Shift+S';
      }
    });

    // 添加快捷键修改按钮事件
    document.getElementById('editShortcut').addEventListener('click', () => {
      chrome.tabs.create({
        url: 'chrome://extensions/shortcuts',
      });
      window.close();
    });
  }
};

// 快速操作管理
const actions = {
  init() {
    // 全屏截图
    document.getElementById('fullscreen').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'captureVisible' });
      window.close();
    });

    // 选区截图
    document.getElementById('area').addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        try {
          chrome.runtime.sendMessage({ 
            action: 'print-shortcut'
          });
          window.close();
        } catch (error) {
          console.error('初始化截图失败:', error);
        }
      });
    });
  }
};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await settings.init();
  actions.init();
}); 
