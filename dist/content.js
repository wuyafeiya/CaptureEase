chrome.runtime.onMessage.addListener(((t,n,o)=>{"initScreenshot"===t.action&&function(){if(document.querySelector(".screenshot-overlay"))return;const t={isDrawing:!1,isSelected:!1,isDragSelecting:!1,selection:null,selectedElement:null,highlightElement:null,highlightTimeout:null},n={overlay:function(){const e=document.createElement("div");return e.className="screenshot-overlay",e}(),hint:function(){const e=document.createElement("div");e.className="screenshot-hint",e.innerHTML='\n      <div class="screenshot-hint-text">\n        在此页面上拖拽或单击选择截图区域<br>\n        按 ESC 键取消截图\n      </div>\n    ';const t=document.createElement("button");return t.className="screenshot-hint-button",t.textContent="取消",t.onclick=e=>{e.preventDefault(),e.stopPropagation(),p()},e.appendChild(t),e}(),sizeDisplay:function(){const e=document.createElement("div");return e.className="size-display",Object.assign(e.style,{position:"absolute",left:"0",top:"-30px",background:"rgba(0, 0, 0, 0.7)",color:"white",padding:"4px 8px",borderRadius:"4px",fontSize:"12px",fontFamily:"Arial, sans-serif",zIndex:"1000002",pointerEvents:"none"}),e}()},o={create(e){t.highlightTimeout&&clearTimeout(t.highlightTimeout),t.highlightTimeout=setTimeout((()=>{this.remove();const n=e.getBoundingClientRect();t.highlightElement=document.createElement("div"),t.highlightElement.className="element-highlight",this.updatePosition(t.highlightElement,n),document.body.appendChild(t.highlightElement)}),5)},remove(){t.highlightElement&&(t.highlightElement.remove(),t.highlightElement=null)},updatePosition(e,t){e.style.position="fixed",e.style.left=`${t.left}px`,e.style.top=`${t.top}px`,e.style.width=`${t.width}px`,e.style.height=`${t.height}px`}},i={create:()=>(t.selection=document.createElement("div"),t.selection.className="selected-element",Object.assign(t.selection.style,{position:"fixed",border:"1px solid #1a73e8",backgroundColor:"transparent",boxSizing:"border-box",zIndex:"1000000",overflow:"visible",clipPath:"none",pointerEvents:"auto"}),document.body.appendChild(t.selection),t.selection.appendChild(n.sizeDisplay),h(t.selection),u(t.selection),e.create(t.selection),s.create(t.selection),t.selection),updatePosition(e){if(!t.selection)return;let{left:o,top:i,width:s,height:l}=this.checkBoundary(e);t.selection.style.position="fixed",t.selection.style.left=`${o}px`,t.selection.style.top=`${i}px`,t.selection.style.width=`${s}px`,t.selection.style.height=`${l}px`,n.sizeDisplay.textContent=`${Math.round(s)}×${Math.round(l)}`,this.updateClipPath(o,i,s,l)},checkBoundary(e){let{left:t,top:n,width:o,height:i}=e;const s=document.documentElement.clientWidth,l=document.documentElement.clientHeight;return t<3&&(t=3,o>s-6&&(o=s-6)),t+o>s-50-3&&(t>3?o=s-t-50-3:(t=3,o=s-50-6)),n<3&&(n=3,i>l-60-6&&(i=l-60-6)),n+i+60>l-3&&(n>3?i=l-n-60-3:(n=3,i=l-60-6)),o=Math.max(o,20),i=Math.max(i,20),{left:t,top:n,width:o,height:i}},updateClipPath(e,t,o,i){const s=document.documentElement.clientWidth,l=document.documentElement.clientHeight,a=e/s*100,r=t/l*100,c=o/s*100,d=i/l*100;n.overlay.style.background="rgba(0, 0, 0, 0.5)",n.overlay.style.clipPath=`\n        polygon(\n          0 0, 100% 0, 100% 100%, 0 100%, 0 0,\n          ${a}% ${r}%,\n          ${a}% ${r+d}%,\n          ${a+c}% ${r+d}%,\n          ${a+c}% ${r}%,\n          ${a}% ${r}%\n        )\n      `;const h=document.querySelector(".selected-element");h&&(h.style.clipPath="none",h.style.background="transparent")}},s={create(e){const t=e.querySelector(".toolbar");t&&t.remove();const n=document.createElement("div");n.className="toolbar",[this.createCloseButton(),this.createFullscreenButton(),this.createDownloadButton()].forEach((e=>n.appendChild(e))),e.appendChild(n),this.setStyle(n)},setStyle(e){Object.assign(e.style,{width:"180px",height:"46px",position:"absolute",right:"-1px",bottom:"-60px",whiteSpace:"nowrap",display:"flex",justifyContent:"space-around",alignItems:"center",zIndex:"1000002"})},createCloseButton(){return this.createButton("toolbar-button-cancel","X",p)},createFullscreenButton(){return this.createButton("toolbar-button-visible","全屏",(()=>{this.capture("captureVisible")}))},createDownloadButton(){return this.createButton("toolbar-button","下载",(()=>{const e=t.selection.getBoundingClientRect();this.capture("captureArea",{x:e.left,y:e.top,width:e.width,height:e.height})}))},createButton(e,t,n){const o=document.createElement("button");return o.className=e,o.innerHTML=this.getButtonHTML(t),o.onclick=e=>{e.preventDefault(),e.stopPropagation(),n()},o},getButtonHTML(e){switch(e){case"X":return'\n            <svg width="16" height="16" viewBox="0 0 16 16">\n              <path d="M8 6.586L3.707 2.293 2.293 3.707 6.586 8l-4.293 4.293 1.414 1.414L8 9.414l4.293 4.293 1.414-1.414L9.414 8l4.293-4.293-1.414-1.414L8 6.586z"/>\n            </svg>\n          ';case"全屏":return'\n            <div style="display: flex; align-items: center; justify-content: center;">\n              <svg width="16" height="16" viewBox="0 0 16 16" style="margin-right: 4px;">\n                <path d="M1.5 1h4v1.5h-2.5v2.5h-1.5v-4zm13 0v4h-1.5v-2.5h-2.5v-1.5h4zm-13 13v-4h1.5v2.5h2.5v1.5h-4zm13 0h-4v-1.5h2.5v-2.5h1.5v4z"/>\n              </svg>\n              <span>全屏</span>\n            </div>\n          ';case"下载":return'\n            <div style="display: flex; align-items: center; justify-content: center; fill: white;">\n              <svg width="16" height="16" viewBox="0 0 16 16" style="margin-right: 4px;">\n                <path d="M8 12l-4.5-4.5 1.5-1.5 2 2v-6h2v6l2-2 1.5 1.5-4.5 4.5zm-6 2h12v-2h-12v2z"/>\n              </svg>\n              <span>下载</span>\n            </div>\n          ';default:return e}},capture(e,o=null){n.overlay.style.display="none",t.selection.style.display="none",chrome.runtime.sendMessage({action:e,...o&&{area:o}},(t=>{t?.success?console.log(`${e} 成功`):console.error(`${e} 失败:`,t?.error),p()}))}};function l(e){if(n.overlay.parentElement&&!t.isSelected){n.overlay.style.pointerEvents="none";const i=document.elementFromPoint(e.clientX,e.clientY);n.overlay.style.pointerEvents="auto",!i||i.classList.contains("screenshot-overlay")||i.classList.contains("element-highlight")||i===t.selectedElement||(o.create(i),t.selectedElement=i)}}function a(e){if(!n.overlay.parentElement||t.isSelected)return;const l=e.clientX,a=e.clientY;let r=!1;function c(e){const s=Math.abs(e.clientX-l),c=Math.abs(e.clientY-a);if(s>5||c>5){r=!0,n.hint.classList.add("hidden"),o.remove(),t.selectedElement=null,t.selection||(t.selection=i.create(),h(t.selection),u(t.selection));const s={left:Math.min(l,e.clientX),top:Math.min(a,e.clientY),width:Math.abs(e.clientX-l),height:Math.abs(e.clientY-a)};i.updatePosition(s)}}return document.addEventListener("mousemove",c),document.addEventListener("mouseup",(function e(n){if(document.removeEventListener("mousemove",c),document.removeEventListener("mouseup",e),r&&t.selection){const e=t.selection.getBoundingClientRect();e.width>=20&&e.height>=20?(t.isSelected=!0,s.create(t.selection)):(t.selection.parentElement&&t.selection.remove(),t.selection=null)}else if(t.selectedElement){t.isSelected=!0;const e=t.selectedElement.getBoundingClientRect();t.selection=i.create(),i.updatePosition(e),o.remove(),h(t.selection),u(t.selection),s.create(t.selection)}})),t.selectedElement?(t.isSelected=!0,e.preventDefault(),void e.stopPropagation()):void 0}function r(){n.overlay.parentElement||p()}function c(e){"Escape"===e.key&&p()}function d(){if(t.selection&&t.isSelected){const e=t.selection.getBoundingClientRect();i.updatePosition(e)}}function h(e){e.addEventListener("mousedown",(t=>{if(t.target!==e)return;t.preventDefault(),t.stopPropagation();const n=t.clientX,o=t.clientY,s=e.getBoundingClientRect();function l(e){e.preventDefault(),e.stopPropagation();const t=e.clientX-n,l=e.clientY-o,a={left:s.left+t,top:s.top+l,width:s.width,height:s.height};i.updatePosition(a)}document.addEventListener("mousemove",l),document.addEventListener("mouseup",(function e(){document.removeEventListener("mousemove",l),document.removeEventListener("mouseup",e)}))}))}function u(e){["nw","n","ne","w","e","sw","s","se"].forEach((t=>{const n=document.createElement("div");n.className=`resize-handle ${t}`,n.style.pointerEvents="auto",n.style.zIndex="1000002",e.appendChild(n),n.onpointerdown=function(n){n.preventDefault(),n.stopPropagation();const o=n.clientX,s=n.clientY,l={left:e.offsetLeft,top:e.offsetTop,width:e.offsetWidth,height:e.offsetHeight,right:e.offsetLeft+e.offsetWidth,bottom:e.offsetTop+e.offsetHeight};function a(e){e.preventDefault(),e.stopPropagation();const n=e.clientX-o,a=e.clientY-s;let r={left:l.left,top:l.top,width:l.width,height:l.height};switch(t){case"nw":r.left=l.left+n,r.top=l.top+a,r.width=l.width-n,r.height=l.height-a;break;case"n":r.top=l.top+a,r.height=l.height-a;break;case"ne":r.top=l.top+a,r.width=l.width+n,r.height=l.height-a;break;case"w":r.left=l.left+n,r.width=l.width-n;break;case"e":r.width=l.width+n;break;case"sw":r.left=l.left+n,r.width=l.width-n,r.height=l.height+a;break;case"s":r.height=l.height+a;break;case"se":r.width=l.width+n,r.height=l.height+a}i.updatePosition(r)}function r(){document.removeEventListener("pointermove",a),document.removeEventListener("pointerup",r),document.removeEventListener("mousemove",a),document.removeEventListener("mouseup",r)}document.addEventListener("pointermove",a),document.addEventListener("pointerup",r),document.addEventListener("mousemove",a),document.addEventListener("mouseup",r)}}))}function p(){o.remove(),[n.overlay,t.selection,n.hint].forEach((e=>{e?.parentElement&&e.remove()})),document.removeEventListener("mousemove",l),document.removeEventListener("mousedown",a),document.removeEventListener("mouseup",r),document.removeEventListener("keydown",c),window.removeEventListener("resize",d)}n.overlay.appendChild(n.hint),document.body.appendChild(n.overlay),document.addEventListener("mousemove",l),document.addEventListener("mousedown",a),document.addEventListener("mouseup",r),document.addEventListener("keydown",c),window.addEventListener("resize",d)}()}));const e={state:{currentColor:"#ff0000",currentLineWidth:2,history:[],historyIndex:-1,currentTool:null,isLineWidthPanelVisible:!1},create(e){const t=document.createElement("div");t.className="annotation-toolbar";[{id:"pen",icon:"✏️",tooltip:"画笔"},{id:"eraser",icon:"🧹",tooltip:"橡皮擦"},{id:"arrow",icon:"➡️",tooltip:"箭头"},{id:"rectangle",icon:"⬜",tooltip:"矩形"},{id:"circle",icon:"⭕",tooltip:"椭圆"},{id:"text",icon:"T",tooltip:"文字"},{id:"divider",type:"divider"},{id:"undo",icon:"↩️",tooltip:"撤销"},{id:"redo",icon:"↪️",tooltip:"重做"}].forEach((e=>{if("divider"===e.type){const e=document.createElement("div");e.style.height="1px",e.style.backgroundColor="#444",e.style.margin="4px 0",t.appendChild(e)}else{const n=document.createElement("div");n.className="tool-button-container",n.style.position="relative";const o=this.createToolButton(e);if(n.appendChild(o),"pen"===e.id){const e=this.createLineWidthPanel();n.appendChild(e)}t.appendChild(n)}})),e.appendChild(t),this.setStyle(t),this.handleToolClick("pen")},createLineWidthPanel(){const e=document.createElement("div");e.className="line-width-panel",Object.assign(e.style,{position:"absolute",left:"100%",top:"0",marginLeft:"10px",backgroundColor:"#2c2c2c",borderRadius:"6px",padding:"8px",display:"none",boxShadow:"0 2px 8px rgba(0, 0, 0, 0.15)",zIndex:"1000003"});return[2,4,6,8,10].forEach((t=>{const n=document.createElement("div");n.className="line-width-option",Object.assign(n.style,{width:"100px",height:"24px",display:"flex",alignItems:"center",padding:"4px",cursor:"pointer",borderRadius:"4px",marginBottom:"4px"});const o=document.createElement("div");Object.assign(o.style,{width:"60px",height:`${t}px`,backgroundColor:"#fff",borderRadius:t/2+"px"}),n.appendChild(o),n.addEventListener("mouseover",(()=>{n.style.backgroundColor="#3c3c3c"})),n.addEventListener("mouseout",(()=>{n.style.backgroundColor="transparent"})),n.addEventListener("click",(()=>{this.state.currentLineWidth=t,this.toggleLineWidthPanel(!1),this.state.currentTool&&this.initDrawingCanvas(this.state.currentTool)})),e.appendChild(n)})),e},toggleLineWidthPanel(e){const t=document.querySelector(".line-width-panel");t&&(t.style.display=e?"block":"none",this.state.isLineWidthPanelVisible=e)},createToolButton({id:e,icon:t,tooltip:n}){const o=document.createElement("button");return o.className="annotation-tool-button",o.dataset.tool=e,o.title=n,o.innerHTML=t,Object.assign(o.style,{width:"32px",height:"32px",border:"none",borderRadius:"4px",backgroundColor:"transparent",color:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",padding:"0",margin:"0 auto"}),o.addEventListener("click",(t=>{t.stopPropagation(),"pen"===e?"pen"===this.state.currentTool?this.toggleLineWidthPanel(!this.state.isLineWidthPanelVisible):(this.handleToolClick(e),this.toggleLineWidthPanel(!0)):(this.handleToolClick(e),this.toggleLineWidthPanel(!1))})),o},handleToolClick(e){console.log("Tool clicked:",e);const t=document.querySelector(".selected-element");if(console.log("Selection:",t),!t)return void console.warn("No selection element found");this.state.currentTool=e,console.log("Current tool updated:",this.state.currentTool);if(document.querySelectorAll(".annotation-tool-button").forEach((t=>{t.style.backgroundColor="transparent",t.dataset.tool===e&&(t.style.backgroundColor="#4c4c4c")})),"undo"!==e&&"redo"!==e)this.initDrawingCanvas(e);else{const n=t.querySelector(".annotation-canvas");n&&(n.style.pointerEvents="none","undo"===e?this.undo(n):this.redo(n))}},initDrawingCanvas(e){console.log("Initializing drawing canvas for tool:",e);const t=document.querySelector(".selected-element");if(!t)return void console.warn("No selection element found");let n=t.querySelector(".annotation-canvas");if(console.log("Existing canvas:",n),!n){console.log("Creating new canvas"),n=document.createElement("canvas"),n.className="annotation-canvas",Object.assign(n.style,{position:"absolute",left:"0",top:"0",width:"100%",height:"100%",pointerEvents:"none",zIndex:"1000001",cursor:"crosshair",backgroundColor:"transparent",touchAction:"none",clipPath:"none",mixBlendMode:"normal"});const e=t.getBoundingClientRect();n.width=e.width,n.height=e.height,t.insertBefore(n,t.firstChild),console.log("Canvas created with dimensions:",{width:n.width,height:n.height,style:n.style.cssText})}["pen","eraser","arrow","rectangle","circle","text"].includes(e)?n.style.pointerEvents="auto":n.style.pointerEvents="none",n.penToolListeners&&Object.entries(n.penToolListeners).forEach((([e,t])=>{n.removeEventListener(e,t)}));const o=n.getContext("2d");switch(console.log("Canvas context:",o),console.log("Initializing tool:",e),e){case"pen":this.initPenTool(n,o);break;case"eraser":this.initEraserTool(n,o);break;case"arrow":this.initArrowTool(n,o);break;case"rectangle":this.initRectTool(n,o);break;case"circle":this.initCircleTool(n,o);break;case"text":this.initTextTool(n,o)}},setStyle(e){Object.assign(e.style,{position:"absolute",right:"-60px",top:"0",width:"40px",backgroundColor:"#2c2c2c",borderRadius:"6px",display:"flex",flexDirection:"column",gap:"8px",padding:"8px 4px",zIndex:"1000002",boxShadow:"0 2px 8px rgba(0, 0, 0, 0.15)"})},initPenTool(e,t){console.log("Initializing pen tool with:",{color:this.state.currentColor,lineWidth:this.state.currentLineWidth}),t.strokeStyle=this.state.currentColor,t.lineWidth=this.state.currentLineWidth,t.lineCap="round",t.lineJoin="round",t.globalCompositeOperation="source-over",t.imageSmoothingEnabled=!0;let n=!1,o=0,i=0;const s=s=>{console.log("Mouse down event:",s),n=!0;const l=e.getBoundingClientRect();o=s.clientX-l.left,i=s.clientY-l.top,console.log("Drawing started at:",{lastX:o,lastY:i,color:t.strokeStyle,lineWidth:t.lineWidth})},l=s=>{if(!n)return;const l=e.getBoundingClientRect(),a=s.clientX-l.left,r=s.clientY-l.top;console.log("Drawing:",{currentX:a,currentY:r,color:t.strokeStyle,lineWidth:t.lineWidth}),t.beginPath(),t.moveTo(o,i),t.lineTo(a,r),t.strokeStyle=this.state.currentColor,t.lineWidth=this.state.currentLineWidth,t.lineCap="round",t.lineJoin="round",t.stroke(),o=a,i=r},a=()=>{n&&(console.log("Drawing ended"),n=!1,this.saveState(e))},r=()=>{n&&(console.log("Mouse left canvas while drawing"),n=!1,this.saveState(e))};e.penToolListeners&&Object.entries(e.penToolListeners).forEach((([t,n])=>{e.removeEventListener(t,n)})),console.log("Adding event listeners to canvas"),e.addEventListener("mousedown",s),e.addEventListener("mousemove",l),e.addEventListener("mouseup",a),e.addEventListener("mouseleave",r),e.penToolListeners={mousedown:s,mousemove:l,mouseup:a,mouseleave:r}},saveState(e){if(!e)return;e.getContext("2d")&&(this.state.history=this.state.history.slice(0,this.state.historyIndex+1),this.state.history.push(e.toDataURL()),this.state.historyIndex++,this.updateUndoRedoButtons())},undo(e){this.state.historyIndex>0&&(this.state.historyIndex--,this.loadState(e))},redo(e){this.state.historyIndex<this.state.history.length-1&&(this.state.historyIndex++,this.loadState(e))},loadState(e){if(!e)return;const t=e.getContext("2d");if(t&&this.state.history[this.state.historyIndex]){const n=new Image;n.onload=()=>{t.clearRect(0,0,e.width,e.height),t.drawImage(n,0,0)},n.src=this.state.history[this.state.historyIndex],this.updateUndoRedoButtons()}},updateUndoRedoButtons(){const e=document.querySelector('[data-tool="undo"]'),t=document.querySelector('[data-tool="redo"]');e&&(e.style.opacity=this.state.historyIndex>0?"1":"0.5"),t&&(t.style.opacity=this.state.historyIndex<this.state.history.length-1?"1":"0.5")}};
