const n={base:"\n    .screenshot-overlay {\n      position: fixed;\n      top: 0;\n      left: 0;\n      width: 100%;\n      height: 100%;\n      background: rgba(0, 0, 0, 0.5);\n      z-index: 99999;\n      pointer-events: none;\n      display: flex;\n      justify-content: center;\n      align-items: center;\n    }\n  ",hint:'\n    .screenshot-hint {\n      display: flex;\n      flex-direction: column;\n      align-items: center;\n      gap: 12px;\n      color: white;\n      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n      text-align: center;\n      pointer-events: none;\n      user-select: none;\n      transition: opacity 0.3s ease;\n    }\n    \n    .screenshot-hint-text {\n      font-size: 24px;\n      line-height: 1.6;\n      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);\n    }\n    \n    .screenshot-hint.hidden {\n      opacity: 0;\n    }\n  ',buttons:"\n    .screenshot-hint-button {\n      pointer-events: auto;\n      padding: 8px 16px;\n      border: 1px solid white;\n      border-radius: 6px;\n      color: white;\n      font-size: 13px;\n      cursor: pointer;\n      transition: all 0.2s ease;\n      margin-top: 8px;\n      background: transparent;\n      z-index: 10000008;\n      user-select: none;\n      -webkit-appearance: none;\n      -moz-appearance: none;\n      appearance: none;\n    }\n    \n    .screenshot-hint-button:hover {\n      background: rgba(255, 255, 255, 0.1);\n    }\n    \n    .screenshot-hint-button:focus {\n      outline: none;\n      box-shadow: none;\n    }\n  ",selection:"\n    .element-highlight {\n      position: absolute;\n      border: 2px dashed #0095ff !important;\n      background: rgb(0, 149, 255,0.3) !important;\n      pointer-events: none;\n      z-index: 1000000;\n      transition: all 0.15s ease-in-out;\n    }\n    \n    .selected-element {\n      position: absolute;\n      border: 2px dashed #fff !important;\n      z-index: 1000000;\n      cursor: move;\n      pointer-events: auto !important;\n      box-sizing: border-box !important;\n    }\n  ",handles:"\n    .resize-handle {\n      position: absolute;\n      width: 13px;\n      height: 13px;\n      background: #0095ff;\n      border: 1.5px solid #fff;\n      border-radius: 50%;\n      z-index: 1000002;\n      pointer-events: auto !important;\n      touch-action: none;\n      transform-origin: center center;\n    }\n    .resize-handle.nw { cursor: nw-resize; top: -6px; left: -6px; }\n    .resize-handle.ne { cursor: ne-resize; top: -6px; right: -6px; }\n    .resize-handle.sw { cursor: sw-resize; bottom: -6px; left: -6px; }\n    .resize-handle.se { cursor: se-resize; bottom: -6px; right: -6px; }\n    .resize-handle.n { cursor: n-resize; top: -8px; left: 50%; transform: translateX(-50%); }\n    .resize-handle.s { cursor: s-resize; bottom: -8px; left: 50%; transform: translateX(-50%); }\n    .resize-handle.w { cursor: w-resize; left: -8px; top: 50%; transform: translateY(-50%); }\n    .resize-handle.e { cursor: e-resize; right: -8px; top: 50%; transform: translateY(-50%); }\n  ",toolbar:"\n    .toolbar {\n      position: absolute;\n      bottom: -45px;\n      right: -1px;\n      height: 32px;\n      background: #ffffff;\n      border-radius: 6px;\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      padding: 0 4px;\n      gap: 4px;\n      z-index: 1000002;\n      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);\n      border: 1px solid rgba(0, 0, 0, 0.1);\n      opacity: 1;\n      transition: opacity 0.3s ease;\n    }\n    \n    .toolbar.hidden {\n      opacity: 0;\n    }\n    \n    .toolbar-button-visible {\n      background: #eeeeef;\n      color: #000;\n      border: none;\n      font-weight: bold;\n      cursor: pointer;\n      padding: 6px;\n      border-radius: 4px;\n    }\n    \n    .toolbar-button-visible:hover {\n      border: 2px solid #1e61e0;\n    }\n    \n    .toolbar-button {\n      background: #1e61e0;\n      color: white;\n      border: none;\n      cursor: pointer;\n      padding: 6px;\n      border-radius: 4px;\n    }\n    \n    .toolbar-button-cancel {\n      background: #eeeeef;\n      color: #000;\n      border: none;\n      cursor: pointer;\n      padding: 6px;\n      border-radius: 4px;\n    }\n  "},e={async init(n){await this.injectStyles(n.id),await this.injectScript(n.id),await this.sendInitMessage(n.id)},async injectStyles(e){const t=Object.values(n).join("\n");await chrome.scripting.insertCSS({target:{tabId:e},css:t})},async injectScript(n){await chrome.scripting.executeScript({target:{tabId:n},files:["content.js"]})},async sendInitMessage(n){await chrome.tabs.sendMessage(n,{action:"initScreenshot"})},async handleVisibleCapture(n,e){try{const t=(await chrome.storage.local.get("format")).format||"png",r=await chrome.downloads.download({url:n,filename:`visible-screenshot-${Date.now()}.${t}`,saveAs:!0});console.log("下载已开始，ID:",r),e({success:!0})}catch(n){console.error("下载失败:",n),e({success:!1,error:n.message})}},async handleAreaCapture(n,e,t){try{const r=await fetch(n),o=await r.blob(),s=await createImageBitmap(o),a=new OffscreenCanvas(e.width,e.height);a.getContext("2d").drawImage(s,e.x,e.y,e.width,e.height,0,0,e.width,e.height);const i=(await chrome.storage.local.get("format")).format||"png",c=`image/${i}`,l=await a.convertToBlob({type:c}),d=new FileReader;d.onloadend=async()=>{try{const n=await chrome.downloads.download({url:d.result,filename:`screenshot-${Date.now()}.${i}`,saveAs:!0});console.log("下载已开始，ID:",n),t({success:!0})}catch(n){console.error("下载失败:",n),t({success:!1,error:n.message})}},d.onerror=()=>{console.error("读取文件失败"),t({success:!1,error:"读取文件失败"})},d.readAsDataURL(l)}catch(n){console.error("处理过程出错:",n),t({success:!1,error:n.message})}}};async function t(e){await chrome.scripting.insertCSS({target:{tabId:e.id},css:Object.values(n).join("\n")}),await chrome.scripting.executeScript({target:{tabId:e.id},files:["content.js"]}),await chrome.tabs.sendMessage(e.id,{action:"initScreenshot"})}chrome.runtime.onMessage.addListener(((n,r,o)=>(console.log("background 收到消息:",n),"print-shortcut"===n.action?(chrome.tabs.query({active:!0,currentWindow:!0},(async n=>{await t(n[0])})),!0):"captureVisible"===n.action?(chrome.tabs.captureVisibleTab(null,{format:"png"},(n=>{if(chrome.runtime.lastError)return console.error("截图失败:",chrome.runtime.lastError),void o({success:!1,error:chrome.runtime.lastError.message});e.handleVisibleCapture(n,o)})),!0):"captureArea"===n.action?(console.log("开始区域截图，区域:",n.area),chrome.tabs.captureVisibleTab(null,{format:"png"},(t=>{if(chrome.runtime.lastError)return console.error("截图失败:",chrome.runtime.lastError),void o({success:!1,error:chrome.runtime.lastError.message});e.handleAreaCapture(t,n.area,o)})),!0):void 0))),chrome.commands.onCommand.addListener((n=>{"print-shortcut"===n&&(console.log("截图快捷键被触发！"),chrome.tabs.query({active:!0,currentWindow:!0},(async n=>{await t(n[0])})))}));