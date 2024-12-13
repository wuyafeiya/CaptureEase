// CSS 样式管理
const styles = {
  // 基础样式
  base: `
    .screenshot-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 99999;
      pointer-events: none;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  `,

  // 提示框样式
  hint: `
    .screenshot-hint {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      text-align: center;
      pointer-events: none;
      user-select: none;
      transition: opacity 0.3s ease;
    }
    
    .screenshot-hint-text {
      font-size: 24px;
      line-height: 1.6;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }
    
    .screenshot-hint.hidden {
      opacity: 0;
    }
  `,

  // 按钮样式
  buttons: `
    .screenshot-hint-button {
      pointer-events: auto;
      padding: 8px 16px;
      border: 1px solid white;
      border-radius: 6px;
      color: white;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 8px;
      background: transparent;
      z-index: 10000008;
      user-select: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
    }
    
    .screenshot-hint-button:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    
    .screenshot-hint-button:focus {
      outline: none;
      box-shadow: none;
    }
  `,

  // 高亮和选择框样式
  selection: `
    .element-highlight {
      position: absolute;
      border: 2px dashed #0095ff !important;
      background: rgb(0, 149, 255,0.3) !important;
      pointer-events: none;
      z-index: 1000000;
      transition: all 0.15s ease-in-out;
    }
    
    .selected-element {
      position: absolute;
      border: 2px dashed #fff !important;
      z-index: 1000000;
      cursor: move;
      pointer-events: auto !important;
      box-sizing: border-box !important;
    }
  `,

  // 控制点样式
  handles: `
    .resize-handle {
      position: absolute;
      width: 13px;
      height: 13px;
      background: #0095ff;
      border: 1.5px solid #fff;
      border-radius: 50%;
      z-index: 1000002;
      pointer-events: auto !important;
      touch-action: none;
      transform-origin: center center;
    }
    .resize-handle.nw { cursor: nw-resize; top: -6px; left: -6px; }
    .resize-handle.ne { cursor: ne-resize; top: -6px; right: -6px; }
    .resize-handle.sw { cursor: sw-resize; bottom: -6px; left: -6px; }
    .resize-handle.se { cursor: se-resize; bottom: -6px; right: -6px; }
    .resize-handle.n { cursor: n-resize; top: -8px; left: 50%; transform: translateX(-50%); }
    .resize-handle.s { cursor: s-resize; bottom: -8px; left: 50%; transform: translateX(-50%); }
    .resize-handle.w { cursor: w-resize; left: -8px; top: 50%; transform: translateY(-50%); }
    .resize-handle.e { cursor: e-resize; right: -8px; top: 50%; transform: translateY(-50%); }
  `,

  // 工具栏样式
  toolbar: `
    .toolbar {
      position: absolute;
      bottom: -45px;
      right: -1px;
      height: 32px;
      background: #ffffff;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 4px;
      gap: 4px;
      z-index: 1000002;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      border: 1px solid rgba(0, 0, 0, 0.1);
      opacity: 1;
      transition: opacity 0.3s ease;
    }
    
    .toolbar.hidden {
      opacity: 0;
    }
    
    .toolbar-button-visible {
      background: #eeeeef;
      color: #000;
      border: none;
      font-weight: bold;
      cursor: pointer;
      padding: 6px;
      border-radius: 4px;
    }
    
    .toolbar-button-visible:hover {
      border: 2px solid #1e61e0;
    }
    
    .toolbar-button {
      background: #1e61e0;
      color: white;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: 4px;
    }
    
    .toolbar-button-cancel {
      background: #eeeeef;
      color: #000;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: 4px;
    }
  `
};

// 截图功能管理
const screenshotManager = {
  // 初始化截图工具
  async init(tab) {
    await this.injectStyles(tab.id);
    await this.injectScript(tab.id);
    await this.sendInitMessage(tab.id);
  },

  // 注入样式
  async injectStyles(tabId) {
    const allStyles = Object.values(styles).join('\n');
    await chrome.scripting.insertCSS({
      target: { tabId },
      css: allStyles
    });
  },

  // 注入脚本
  async injectScript(tabId) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
  },

  // 发送初始化消息
  async sendInitMessage(tabId) {
    await chrome.tabs.sendMessage(tabId, { action: 'initScreenshot' });
  },

  // 处理可视区域截图
  async handleVisibleCapture(dataUrl, sendResponse) {
    try {
      // 获取保存的图片格式设置
      const format = await chrome.storage.local.get('format');
      const imageFormat = format.format || 'png';
      
      const downloadId = await chrome.downloads.download({
        url: dataUrl,
        filename: `visible-screenshot-${Date.now()}.${imageFormat}`,
        saveAs: true
      });
      console.log('下载已开始，ID:', downloadId);
      sendResponse({ success: true });
    } catch (error) {
      console.error('下载失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  },

  // 处理区域截图
  async handleAreaCapture(dataUrl, area, sendResponse) {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);
      
      const canvas = new OffscreenCanvas(area.width, area.height);
      const ctx = canvas.getContext('2d');
      
      ctx.drawImage(imageBitmap,
        area.x, area.y,
        area.width, area.height,
        0, 0,
        area.width, area.height
      );

      // 获取保存的图片格式设置
      const format = await chrome.storage.local.get('format');
      const imageFormat = format.format || 'png';
      const mimeType = `image/${imageFormat}`;

      const croppedBlob = await canvas.convertToBlob({ type: mimeType });
      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          const downloadId = await chrome.downloads.download({
            url: reader.result,
            filename: `screenshot-${Date.now()}.${imageFormat}`,
            saveAs: true
          });
          console.log('下载已开始，ID:', downloadId);
          sendResponse({ success: true });
        } catch (error) {
          console.error('下载失败:', error);
          sendResponse({ success: false, error: error.message });
        }
      };

      reader.onerror = () => {
        console.error('读取文件失败');
        sendResponse({ success: false, error: '读取文件失败' });
      };

      reader.readAsDataURL(croppedBlob);
    } catch (error) {
      console.error('处理过程出错:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
};

// 在 background.js 中添加一个函数来处理截图初始化
async function initScreenshot(tab) {
  await chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    css: Object.values(styles).join('\n')
  });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });

  await chrome.tabs.sendMessage(tab.id, { action: 'initScreenshot' });
}

// 修改消息监听部分
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('background 收到消息:', request);

  if (request.action === 'print-shortcut') {
    // 处理来自 popup 的截图初始化请求
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      await initScreenshot(tabs[0]);
    });
    return true;
  }

  if (request.action === 'captureVisible') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('截图失败:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      screenshotManager.handleVisibleCapture(dataUrl, sendResponse);
    });
    return true;
  }

  if (request.action === 'captureArea') {
    console.log('开始区域截图，区域:', request.area);
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('截图失败:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      screenshotManager.handleAreaCapture(dataUrl, request.area, sendResponse);
    });
    return true;
  }
});

// 监听快捷键
chrome.commands.onCommand.addListener((command) => {
  if (command === "print-shortcut") {
    console.log("截图快捷键被触发！");
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      await initScreenshot(tabs[0]);
    });
  }
});
