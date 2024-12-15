function initScreenshotTool() {
  if (document.querySelector('.screenshot-overlay')) return;

  // 状态管理
  const state = {
    isDrawing: false,
    isSelected: false,
    isDragSelecting: false,
    selection: null,
    selectedElement: null,
    highlightElement: null,
    highlightTimeout: null,
    currentColor: '#ff0000',
    currentLineWidth: 2,
    currentArrowWidth: 2,
    history: [],
    historyIndex: -1,
    currentTool: null,
    isLineWidthPanelVisible: false,
    currentArrowStyle: 'solid',
    currentArrowColor: '#ff0000',  // 箭头默认颜色
    currentShapeColor: '#ff0000',    // 形状描边颜色
    currentShapeWidth: 2,            // 形状描边宽度
    currentShapeFillColor: 'transparent',  // 形状填充颜色
    currentShapeStyle: 'solid',      // 形状边框样式：solid, dashed, dotted
  };

  // UI 元素
  const ui = {
    overlay: createOverlay(),
    hint: createHint(),
    sizeDisplay: createSizeDisplay()
  };

  // 创建基础 UI
  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'screenshot-overlay';
    return overlay;
  }

  function createHint() {
    const hint = document.createElement('div');
    hint.className = 'screenshot-hint';
    hint.innerHTML = `
      <div class="screenshot-hint-text">
        在此页面上拖拽或单击选择截图区域<br>
        按 ESC 键取消截图
      </div>
    `;
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'screenshot-hint-button';
    cancelButton.textContent = '取消';
    cancelButton.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      cleanup();
    };
    hint.appendChild(cancelButton);
    return hint;
  }

  function createSizeDisplay() {
    const sizeDisplay = document.createElement('div');
    sizeDisplay.className = 'size-display';
    Object.assign(sizeDisplay.style, {
      position: 'absolute',
      left: '0',
      top: '-30px',
      background: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      zIndex: '1000002',
      pointerEvents: 'none'
    });
    return sizeDisplay;
  }

  // 高亮管理
  const highlightManager = {
    create(element) {
      if (state.highlightTimeout) {
        clearTimeout(state.highlightTimeout);
      }

      state.highlightTimeout = setTimeout(() => {
        this.remove();
        const rect = element.getBoundingClientRect();
        state.highlightElement = document.createElement('div');
        state.highlightElement.className = 'element-highlight';
        this.updatePosition(state.highlightElement, rect);
        document.body.appendChild(state.highlightElement);
      }, 5);
    },

    remove() {
      if (state.highlightElement) {
        state.highlightElement.remove();
        state.highlightElement = null;
      }
    },

    updatePosition(element, rect) {
      element.style.position = 'fixed';
      element.style.left = `${rect.left}px`;
      element.style.top = `${rect.top}px`;
      element.style.width = `${rect.width}px`;
      element.style.height = `${rect.height}px`;
    }
  };

  // 选区管理
  const selectionManager = {
    create() {
      state.selection = document.createElement('div');
      state.selection.className = 'selected-element';
      
      Object.assign(state.selection.style, {
        position: 'fixed',
        border: '1px solid #1a73e8',
        backgroundColor: 'transparent',
        boxSizing: 'border-box',
        zIndex: '1000000',
        overflow: 'visible',
        clipPath: 'none',
        pointerEvents: 'auto'
      });
      
      document.body.appendChild(state.selection);
      state.selection.appendChild(ui.sizeDisplay);
      
      // 添加拖动和调整大小的功能
      addDragListeners(state.selection);
      addResizeHandles(state.selection);
      
      // 添加标注工具栏
      annotationToolbarManager.create(state.selection);
      
      // 添加底部工具栏
      toolbarManager.create(state.selection);
      
      return state.selection;
    },

    updatePosition(rect) {
      if (!state.selection) return;
      
      // 边界检测
      let { left, top, width, height } = this.checkBoundary(rect);
      
      state.selection.style.position = 'fixed';
      state.selection.style.left = `${left}px`;
      state.selection.style.top = `${top}px`;
      state.selection.style.width = `${width}px`;
      state.selection.style.height = `${height}px`;

      // 更新尺寸显示
      ui.sizeDisplay.textContent = `${Math.round(width)}×${Math.round(height)}`;

      // 更新裁剪区域
      this.updateClipPath(left, top, width, height);
    },

    checkBoundary(rect) {
      let { left, top, width, height } = rect;
      const docWidth = document.documentElement.clientWidth;
      const docHeight = document.documentElement.clientHeight;
      const minMargin = 3; // 最小边距
      const toolbarWidth = 50; // 标注工具栏宽度
      const bottomToolbarHeight = 60; // 底部工具栏高度
      
      // 左边界检测
      if (left < minMargin) {
        left = minMargin;
        if (width > docWidth - minMargin * 2) {
          width = docWidth - minMargin * 2;
        }
      }
      
      // 右边界检测（具栏预留空间）
      if (left + width > docWidth - toolbarWidth - minMargin) {
        if (left > minMargin) {
          width = docWidth - left - toolbarWidth - minMargin;
        } else {
          left = minMargin;
          width = docWidth - toolbarWidth - minMargin * 2;
        }
      }
      
      // 上边界检测
      if (top < minMargin) {
        top = minMargin;
        if (height > docHeight - bottomToolbarHeight - minMargin * 2) {
          height = docHeight - bottomToolbarHeight - minMargin * 2;
        }
      }
      
      // 下边界检测（需要为底部工具栏预留空间）
      if (top + height + bottomToolbarHeight > docHeight - minMargin) {
        if (top > minMargin) {
          height = docHeight - top - bottomToolbarHeight - minMargin;
        } else {
          top = minMargin;
          height = docHeight - bottomToolbarHeight - minMargin * 2;
        }
      }
      
      // 确保最小尺寸
      const minSize = 20;
      width = Math.max(width, minSize);
      height = Math.max(height, minSize);

      return { left, top, width, height };
    },

    updateClipPath(left, top, width, height) {
      const docWidth = document.documentElement.clientWidth;
      const docHeight = document.documentElement.clientHeight;

      const x = (left / docWidth) * 100;
      const y = (top / docHeight) * 100;
      const w = (width / docWidth) * 100;
      const h = (height / docHeight) * 100;

      ui.overlay.style.background = `rgba(0, 0, 0, 0.5)`;
      ui.overlay.style.clipPath = `
        polygon(
          0 0, 100% 0, 100% 100%, 0 100%, 0 0,
          ${x}% ${y}%,
          ${x}% ${y + h}%,
          ${x + w}% ${y + h}%,
          ${x + w}% ${y}%,
          ${x}% ${y}%
        )
      `;

      const selection = document.querySelector('.selected-element');
      if (selection) {
        selection.style.clipPath = 'none';
        selection.style.background = 'transparent';
      }
    }
  };

  // 工具栏管理
  const toolbarManager = {
    create(selection) {
      // 先移除已存在的工具栏
      const existingToolbar = selection.querySelector('.toolbar');
      if (existingToolbar) {
        existingToolbar.remove();
      }

      const toolbar = document.createElement('div');
      toolbar.className = 'toolbar';
      
      const buttons = [
        this.createCloseButton(),
        this.createFullscreenButton(),
        this.createDownloadButton()
      ];
      
      buttons.forEach(button => toolbar.appendChild(button));
      selection.appendChild(toolbar);
      
      // 确保工具栏样式在添加到 DOM 后设置
      this.setStyle(toolbar);
    },

    setStyle(toolbar) {
      Object.assign(toolbar.style, {
        width: '180px',
        height: '46px',
        position: 'absolute',
        right: '-1px',
        bottom: '-60px',
        whiteSpace: 'nowrap',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: '1000002'
      });
    },

    createCloseButton() {
      return this.createButton('toolbar-button-cancel', 'X', cleanup);
    },

    createFullscreenButton() {
      return this.createButton('toolbar-button-visible', '全屏', () => {
        this.capture('captureVisible');
      });
    },

    createDownloadButton() {
      return this.createButton('toolbar-button', '下载', () => {
        const rect = state.selection.getBoundingClientRect();
        this.capture('captureArea', {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        });
      });
    },

    createButton(className, text, onClick) {
      const button = document.createElement('button');
      button.className = className;
      button.innerHTML = this.getButtonHTML(text);
      button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      };
      return button;
    },

    getButtonHTML(text) {
      switch (text) {
        case 'X':
          return `
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M8 6.586L3.707 2.293 2.293 3.707 6.586 8l-4.293 4.293 1.414 1.414L8 9.414l4.293 4.293 1.414-1.414L9.414 8l4.293-4.293-1.414-1.414L8 6.586z"/>
            </svg>
          `;
        case '全屏':
          return `
            <div style="display: flex; align-items: center; justify-content: center;">
              <svg width="16" height="16" viewBox="0 0 16 16" style="margin-right: 4px;">
                <path d="M1.5 1h4v1.5h-2.5v2.5h-1.5v-4zm13 0v4h-1.5v-2.5h-2.5v-1.5h4zm-13 13v-4h1.5v2.5h2.5v1.5h-4zm13 0h-4v-1.5h2.5v-2.5h1.5v4z"/>
              </svg>
              <span>全屏</span>
            </div>
          `;
        case '下载':
          return `
            <div style="display: flex; align-items: center; justify-content: center; fill: white;">
              <svg width="16" height="16" viewBox="0 0 16 16" style="margin-right: 4px;">
                <path d="M8 12l-4.5-4.5 1.5-1.5 2 2v-6h2v6l2-2 1.5 1.5-4.5 4.5zm-6 2h12v-2h-12v2z"/>
              </svg>
              <span>下载</span>
            </div>
          `;
        default:
          return text;
      }
    },

    capture(action, area = null) {
      ui.overlay.style.display = 'none';
      state.selection.style.display = 'none';
      
      chrome.runtime.sendMessage({
        action,
        ...(area && { area })
      }, (response) => {
        if (response?.success) {
          console.log(`${action} 成功`);
        } else {
          console.error(`${action} 失败:`, response?.error);
        }
        cleanup();
      });
    }
  };

  // 事件处理
  function initEvents() {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
  }

  // 处理鼠标移动
  function handleMouseMove(e) {
    if (!ui.overlay.parentElement || state.isSelected) {
      return;
    }

    if (state.isDrawing) {
      // 拖拽选择逻辑
      const currentX = e.clientX;
      const currentY = e.clientY;

      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      state.selection.style.left = left + 'px';
      state.selection.style.top = top + 'px';
      state.selection.style.width = width + 'px';
      state.selection.style.height = height + 'px';
    } else {
      ui.overlay.style.pointerEvents = 'none';
      const element = document.elementFromPoint(
        e.clientX,
        e.clientY
      );
      ui.overlay.style.pointerEvents = 'auto';

      if (element && !element.classList.contains('screenshot-overlay') &&
        !element.classList.contains('element-highlight') &&
        element !== state.selectedElement) {
        highlightManager.create(element);
        state.selectedElement = element;
      }
    }
  }

  // 处理鼠标按下
  function handleMouseDown(e) {
    if (!ui.overlay.parentElement || state.isSelected) {
      return;
    }

    const mouseDownX = e.clientX;
    const mouseDownY = e.clientY;
    let isDragSelecting = false;

    function handleMouseMoveWhileDown(e) {
      const deltaX = Math.abs(e.clientX - mouseDownX);
      const deltaY = Math.abs(e.clientY - mouseDownY);
      
      if (deltaX > 5 || deltaY > 5) {
        isDragSelecting = true;
        ui.hint.classList.add('hidden');
        
        highlightManager.remove();
        state.selectedElement = null;
        
        if (!state.selection) {
          state.selection = selectionManager.create();
          addDragListeners(state.selection);
          addResizeHandles(state.selection);
        }

        const rect = {
          left: Math.min(mouseDownX, e.clientX),
          top: Math.min(mouseDownY, e.clientY),
          width: Math.abs(e.clientX - mouseDownX),
          height: Math.abs(e.clientY - mouseDownY)
        };

        selectionManager.updatePosition(rect);
      }
    }

    function handleMouseUp(e) {
      document.removeEventListener('mousemove', handleMouseMoveWhileDown);
      document.removeEventListener('mouseup', handleMouseUp);

      if (isDragSelecting && state.selection) {
        const rect = state.selection.getBoundingClientRect();
        if (rect.width >= 20 && rect.height >= 20) {
          state.isSelected = true;
          toolbarManager.create(state.selection);
        } else {
          if (state.selection.parentElement) {
            state.selection.remove();
          }
          state.selection = null;
        }
      } else if (state.selectedElement) {
        state.isSelected = true;
        const rect = state.selectedElement.getBoundingClientRect();
        state.selection = selectionManager.create();
        selectionManager.updatePosition(rect);
        highlightManager.remove();
        addDragListeners(state.selection);
        addResizeHandles(state.selection);
        toolbarManager.create(state.selection);
      }
    }

    document.addEventListener('mousemove', handleMouseMoveWhileDown);
    document.addEventListener('mouseup', handleMouseUp);

    if (state.selectedElement) {
      state.isSelected = true;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }

  // 处理鼠标松开
  function handleMouseUp() {
    if (!ui.overlay.parentElement) {
      cleanup();
      return;
    }
  }

  // 处理按键
  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      cleanup();
    }
  }

  // 处理窗口大小改变
  function handleResize() {
    if (state.selection && state.isSelected) {
      const rect = state.selection.getBoundingClientRect();
      selectionManager.updatePosition(rect);
    }
  }

  // 添加拖拽监听
  function addDragListeners(selection) {
    // 创建一个专门用于拖动的区域
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    Object.assign(dragHandle.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      cursor: 'move',  // 默认显示移动光标
      zIndex: '1000000',
      pointerEvents: 'auto'  // 默认启用拖动
    });
    
    // 将拖动区域插入到最底层
    selection.insertBefore(dragHandle, selection.firstChild);

    dragHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // 禁用所有画布的事件
      const canvas = selection.querySelector('.annotation-canvas');
      if (canvas) {
        canvas.style.pointerEvents = 'none';
      }

      const startX = e.clientX;
      const startY = e.clientY;
      const startRect = selection.getBoundingClientRect();

      const handleMouseMove = (moveEvent) => {
        moveEvent.preventDefault();
        moveEvent.stopPropagation();

        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        const rect = {
          left: startRect.left + deltaX,
          top: startRect.top + deltaY,
          width: startRect.width,
          height: startRect.height
        };

        selectionManager.updatePosition(rect);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });

    // 监听工具变化
    selection.addEventListener('toolchange', (e) => {
      const isSelectTool = e.detail.tool === 'select';
      const isDrawingTool = ['pen', 'eraser', 'arrow', 'rectangle', 'circle', 'text'].includes(e.detail.tool);
      
      // 如果是选择工具或者没有选择任何工具，启用拖动
      if (isSelectTool || !e.detail.tool) {
        dragHandle.style.pointerEvents = 'auto';
        dragHandle.style.cursor = 'move';
      } else if (isDrawingTool) {
        // 如果是绘图工具，禁用拖动
        dragHandle.style.pointerEvents = 'none';
        dragHandle.style.cursor = 'default';
      }
    });
  }

  // 添加调整大小的控制点
  function addResizeHandles(selection) {
    const handles = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
    handles.forEach(pos => {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${pos}`;
      handle.style.pointerEvents = 'auto';
      handle.style.zIndex = '1000002';
      selection.appendChild(handle);
      
      handle.onpointerdown = function(e) {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startRect = {
          left: selection.offsetLeft,
          top: selection.offsetTop,
          width: selection.offsetWidth,
          height: selection.offsetHeight,
          right: selection.offsetLeft + selection.offsetWidth,
          bottom: selection.offsetTop + selection.offsetHeight
        };

        function handleResize(moveEvent) {
          moveEvent.preventDefault();
          moveEvent.stopPropagation();

          const deltaX = moveEvent.clientX - startX;
          const deltaY = moveEvent.clientY - startY;
          let newRect = {
            left: startRect.left,
            top: startRect.top,
            width: startRect.width,
            height: startRect.height
          };

          // 根据不同的控制点位置调整大小
          switch (pos) {
            case 'nw':
              newRect.left = startRect.left + deltaX;
              newRect.top = startRect.top + deltaY;
              newRect.width = startRect.width - deltaX;
              newRect.height = startRect.height - deltaY;
              break;
            case 'n':
              newRect.top = startRect.top + deltaY;
              newRect.height = startRect.height - deltaY;
              break;
            case 'ne':
              newRect.top = startRect.top + deltaY;
              newRect.width = startRect.width + deltaX;
              newRect.height = startRect.height - deltaY;
              break;
            case 'w':
              newRect.left = startRect.left + deltaX;
              newRect.width = startRect.width - deltaX;
              break;
            case 'e':
              newRect.width = startRect.width + deltaX;
              break;
            case 'sw':
              newRect.left = startRect.left + deltaX;
              newRect.width = startRect.width - deltaX;
              newRect.height = startRect.height + deltaY;
              break;
            case 's':
              newRect.height = startRect.height + deltaY;
              break;
            case 'se':
              newRect.width = startRect.width + deltaX;
              newRect.height = startRect.height + deltaY;
              break;
          }

          selectionManager.updatePosition(newRect);
        }

        function handleMouseUp() {
          document.removeEventListener('pointermove', handleResize);
          document.removeEventListener('pointerup', handleMouseUp);
          document.removeEventListener('mousemove', handleResize);
          document.removeEventListener('mouseup', handleMouseUp);
        }

        document.addEventListener('pointermove', handleResize);
        document.addEventListener('pointerup', handleMouseUp);
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', handleMouseUp);
      };
    });
  }

  // 清理函数
  function cleanup() {
    highlightManager.remove();
    [ui.overlay, state.selection, ui.hint].forEach(element => {
      if (element?.parentElement) {
        element.remove();
      }
    });
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('resize', handleResize);
  }

  // 初始化
  ui.overlay.appendChild(ui.hint);
  document.body.appendChild(ui.overlay);
  initEvents();
}

// 监听来自 background.js 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'initScreenshot') {
    initScreenshotTool();
  }
}); 

// 截图前先隐藏控制点
async function captureScreenshot() {
  // 临时隐藏所有控制点
  const handles = document.querySelectorAll('.resize-handle');
  handles.forEach(handle => {
    handle.style.display = 'none';
  });

  try {
    // 等待一小段时间确保 DOM 更新
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 执行截图操作
    const canvas = await html2canvas(selectedElement, {
      backgroundColor: null,
      useCORS: true,
    });
    
    // 截图完成后恢复控制点显示
    handles.forEach(handle => {
      handle.style.display = 'block';
    });

    return canvas;
  } catch (error) {
    // ���生错误时也要恢复控制点显示
    handles.forEach(handle => {
      handle.style.display = 'block';
    });
    throw error;
  }
}

// 添加标注工具栏管理器
const annotationToolbarManager = {
  state: {
    currentColor: '#ff0000',
    currentLineWidth: 2,
    currentArrowWidth: 2,
    history: [],
    historyIndex: -1,
    currentTool: null,
    isLineWidthPanelVisible: false,
    currentArrowStyle: 'solid'
  },

  create(selection) {
    const toolbar = document.createElement('div');
    toolbar.className = 'annotation-toolbar';
    
    const tools = [
      { 
        id: 'select', 
        icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M7.07 8.83l-3.75 3.75a1 1 0 0 0 0 1.41l8.25 8.25a1 1 0 0 0 1.41 0l3.75-3.75a1 1 0 0 0 0-1.41l-8.25-8.25a1 1 0 0 0-1.41 0zM21 3.77L17.23 0 8.86 8.37l3.77 3.77L21 3.77z"/>
        </svg>`, 
        tooltip: '选择' 
      },
      { id: 'pen', icon: '✏️', tooltip: '画笔', hasLineWidth: true },
      { 
        id: 'eraser', 
        icon: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none">
          <path d="M20 20H7.31722L16.4445 10.8727C17.421 9.89515 17.4221 8.32819 16.4467 7.34934L14.4109 5.31357C13.4333 4.33601 11.8663 4.33601 10.8887 5.31357L4 12.2023V15.0001L3 19.0001L7 20.0001L7.31722 20H20" 
            stroke-width="2" 
            stroke-linecap="round" 
            stroke-linejoin="round"/>
        </svg>`, 
        tooltip: '橡皮擦',
        hasLineWidth: true 
      },
      { id: 'arrow', icon: '➡️', tooltip: '箭头', hasArrowStyle: true, hasLineWidth: true },
      { id: 'rectangle', icon: '⬜', tooltip: '矩形', hasShapeStyle: true },
      { id: 'circle', icon: '⭕', tooltip: '椭圆', hasShapeStyle: true },
      { id: 'text', icon: 'T', tooltip: '文字' },
      { id: 'divider', type: 'divider' },
      { id: 'undo', icon: '↩️', tooltip: '撤销' },
      { id: 'redo', icon: '↪️', tooltip: '重做' }
    ];
    
    tools.forEach(tool => {
      if (tool.type === 'divider') {
        const divider = document.createElement('div');
        divider.style.height = '1px';
        divider.style.backgroundColor = '#444';
        divider.style.margin = '4px 0';
        toolbar.appendChild(divider);
      } else {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'tool-button-container';
        buttonContainer.style.position = 'relative';
        
        const button = this.createToolButton(tool);
        buttonContainer.appendChild(button);
        
        // 恢复线���面板
        if (tool.hasLineWidth) {
          const lineWidthPanel = this.createLineWidthPanel(tool.id);
          buttonContainer.appendChild(lineWidthPanel);
        }
        
        // 恢复箭头样式面板
        if (tool.hasArrowStyle) {
          const arrowStylePanel = this.createArrowStylePanel();
          buttonContainer.appendChild(arrowStylePanel);
        }
        
        // 形状样式面板
        if (tool.hasShapeStyle) {
          const shapeStylePanel = this.createShapeStylePanel();
          buttonContainer.appendChild(shapeStylePanel);
        }
        
        toolbar.appendChild(buttonContainer);
      }
    });
    
    selection.appendChild(toolbar);
    this.setStyle(toolbar);
  },

  // 修改工具按钮创建逻辑
  createToolButton({ id, icon, tooltip }) {
    const button = document.createElement('button');
    button.className = 'annotation-tool-button';
    button.dataset.tool = id;
    button.title = tooltip;
    button.innerHTML = icon;
    
    Object.assign(button.style, {
      width: '32px',
      height: '32px',
      border: 'none',
      borderRadius: '4px',
      backgroundColor: 'transparent',
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      padding: '0',
      margin: '0 auto'
    });

    // 简化点击事件处理，统一使用 handleToolClick
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleToolClick(id);
    });

    return button;
  },

  // 修改工具点击处理
  handleToolClick(toolId) {
    console.log('Tool clicked:', toolId);
    const selection = document.querySelector('.selected-element');
    console.log('Selection:', selection);
    
    if (!selection) {
      console.warn('No selection element found');
      return;
    }

    const previousTool = this.state.currentTool;
    this.state.currentTool = toolId;
    
    // 更新按钮高亮状态
    const allButtons = document.querySelectorAll('.annotation-tool-button');
    allButtons.forEach(btn => {
      btn.style.backgroundColor = 'transparent';
      if (btn.dataset.tool === toolId) {
        btn.style.backgroundColor = '#4c4c4c';
      }
    });

    // 处理面板显示/隐藏
    if (['pen', 'eraser'].includes(toolId)) {
      // 处理画笔和橡皮擦的线宽面板
      if (previousTool === toolId) {
        this.toggleLineWidthPanel(!this.state.isLineWidthPanelVisible, toolId);
      } else {
        // 隐藏其他工具的面板
        ['pen', 'eraser'].forEach(t => {
          if (t !== toolId) this.toggleLineWidthPanel(false, t);
        });
        this.toggleArrowStylePanel(false);
        this.toggleShapeStylePanel(false);
        // 显示当前工具的面板
        this.toggleLineWidthPanel(true, toolId);
      }
    } else if (toolId === 'arrow') {
      // 处理箭头工具的样式面板
      if (previousTool === toolId) {
        this.toggleArrowStylePanel(!this.state.isArrowStylePanelVisible);
      } else {
        // 隐藏其他面板
        ['pen', 'eraser'].forEach(t => this.toggleLineWidthPanel(false, t));
        this.toggleShapeStylePanel(false);
        // 显示箭头样式面板
        this.toggleArrowStylePanel(true);
      }
    } else if (['rectangle', 'circle'].includes(toolId)) {
      // 处理形状工具的样式面板
      if (previousTool === toolId) {
        this.toggleShapeStylePanel(!this.state.isShapeStylePanelVisible);
      } else {
        // 隐藏其他面板
        ['pen', 'eraser'].forEach(t => this.toggleLineWidthPanel(false, t));
        this.toggleArrowStylePanel(false);
        // 显示形状样式面板
        this.toggleShapeStylePanel(true);
      }
    } else {
      // 其他工具：隐藏所有面板
      ['pen', 'eraser'].forEach(t => this.toggleLineWidthPanel(false, t));
      this.toggleArrowStylePanel(false);
      this.toggleShapeStylePanel(false);
    }

    // 处理撤销/重做
    if (toolId === 'undo' || toolId === 'redo') {
      const canvas = selection.querySelector('.annotation-canvas');
      if (canvas) {
        canvas.style.pointerEvents = 'none';
        if (toolId === 'undo') {
          this.undo(canvas);
        } else {
          this.redo(canvas);
        }
      }
      return;
    }

    // 初始化对应的绘图功能
    this.initDrawingCanvas(toolId);

    // 触发工具变化事件
    const toolChangeEvent = new CustomEvent('toolchange', {
      detail: { tool: toolId }
    });
    selection.dispatchEvent(toolChangeEvent);

    // 处理选择工具的特殊逻辑
    if (toolId === 'select') {
      // 启用拖动区域
      const dragHandle = selection.querySelector('.drag-handle');
      if (dragHandle) {
        dragHandle.style.pointerEvents = 'auto';
        dragHandle.style.cursor = 'move';
      }
      // 禁用画布事件
      const canvas = selection.querySelector('.annotation-canvas');
      if (canvas) {
        canvas.style.pointerEvents = 'none';
      }
    } else {
      // 非选工具时，禁用拖动
      const dragHandle = selection.querySelector('.drag-handle');
      if (dragHandle) {
        dragHandle.style.pointerEvents = 'none';
        dragHandle.style.cursor = 'default';
      }
      // 其他工具需要启��画布事件
      if (['pen', 'eraser', 'arrow', 'rectangle', 'circle', 'text'].includes(toolId)) {
        const canvas = selection.querySelector('.annotation-canvas');
        if (canvas) {
          canvas.style.pointerEvents = 'auto';
        }
      }
    }
  },

  // 修改画布初始化
  initDrawingCanvas(toolId) {
    console.log('Initializing drawing canvas for tool:', toolId);
    const selection = document.querySelector('.selected-element');
    if (!selection) {
      console.warn('No selection element found');
      return;
    }

    // 获取或创建画布
    let canvas = selection.querySelector('.annotation-canvas');
    console.log('Existing canvas:', canvas);

    // 如果已存在画布，移除所有旧的事件监听器
    if (canvas) {
      // 移除所有工具的事件监听器
      ['penToolListeners', 'eraserToolListeners', 'arrowToolListeners', 
       'rectToolListeners', 'circleToolListeners', 'textToolListeners'].forEach(listenerType => {
        if (canvas[listenerType]) {
          Object.entries(canvas[listenerType]).forEach(([event, listener]) => {
            canvas.removeEventListener(event, listener);
          });
          canvas[listenerType] = null;
        }
      });
      
      // 置画布状态
      canvas.style.pointerEvents = 'auto';
      const ctx = canvas.getContext('2d');
      ctx.globalCompositeOperation = 'source-over';
    } else {
      // 创建新画布
      canvas = document.createElement('canvas');
      canvas.className = 'annotation-canvas';
      Object.assign(canvas.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        zIndex: '999999',
        cursor: 'crosshair',
        backgroundColor: 'transparent',
        touchAction: 'none',
        clipPath: 'none',
        mixBlendMode: 'normal'
      });
      
      const rect = selection.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      selection.insertBefore(canvas, selection.firstChild);
    }

    const ctx = canvas.getContext('2d');
    console.log('Canvas context:', ctx);

    // 根据工具型设置不同的绘图处理器
    console.log('Initializing tool:', toolId);
    switch (toolId) {
      case 'pen':
        this.initPenTool(canvas, ctx);
        break;
      case 'eraser':
        this.initEraserTool(canvas, ctx);
        break;
      case 'arrow':
        this.initArrowTool(canvas, ctx);
        break;
      case 'rectangle':
        this.initRectTool(canvas, ctx);
        break;
      case 'circle':
        this.initCircleTool(canvas, ctx);
        break;
      case 'text':
        this.initTextTool(canvas, ctx);
        break;
      default:
        canvas.style.pointerEvents = 'none';
        break;
    }
  },

  setStyle(toolbar) {
    Object.assign(toolbar.style, {
      position: 'absolute',
      right: '-60px',
      top: '0',
      width: '40px',
      backgroundColor: '#2c2c2c',
      borderRadius: '6px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '8px 4px',
      zIndex: '1000002',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
    });
  },

  // 添加画笔工具实现
  initPenTool(canvas, ctx) {
    console.log('Initializing pen tool with:', {
      color: this.state.currentColor,
      lineWidth: this.state.currentLineWidth
    });
    
    // 初始化画布状态
    ctx.strokeStyle = this.state.currentColor;
    ctx.lineWidth = this.state.currentLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;
    
    let isDrawing = false;
    let lastPoint = null;
    let points = [];

    const getDistance = (p1, p2) => {
      return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    };

    const getMidPoint = (p1, p2) => {
      return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
      };
    };

    const drawSmoothLine = (points) => {
      if (points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      // 使用二次贝塞尔曲线
      for (let i = 1; i < points.length - 1; i++) {
        const midPoint = getMidPoint(points[i], points[i + 1]);
        ctx.quadraticCurveTo(points[i].x, points[i].y, midPoint.x, midPoint.y);
      }

      // 连接最后一个点
      const lastPoint = points[points.length - 1];
      ctx.lineTo(lastPoint.x, lastPoint.y);
      ctx.stroke();
    };

    const handleMouseDown = (e) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      lastPoint = { x, y };
      points = [lastPoint];
    };

    const handleMouseMove = (e) => {
      if (!isDrawing) return;
      
      const rect = canvas.getBoundingClientRect();
      const currentPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      // 计算与上一点的距离
      const distance = getDistance(lastPoint, currentPoint);
      
      // 如果移动距离太小，不添加新点
      if (distance < 2) return;

      points.push(currentPoint);
      
      // 保存最近的几个点用于平滑
      if (points.length > 5) {
        points = points.slice(-5);
      }

      // 绘制当前线段
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(currentPoint.x, currentPoint.y);
      ctx.stroke();
      
      lastPoint = currentPoint;
    };

    const handleMouseUp = () => {
      if (isDrawing) {
        isDrawing = false;
        this.saveState(canvas);
        points = [];
        lastPoint = null;
      }
    };

    const handleMouseLeave = () => {
      if (isDrawing) {
        isDrawing = false;
        this.saveState(canvas);
        points = [];
        lastPoint = null;
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    canvas.penToolListeners = {
      mousedown: handleMouseDown,
      mousemove: handleMouseMove,
      mouseup: handleMouseUp,
      mouseleave: handleMouseLeave
    };
  },

  // 添加撤销/重做相关方法
  saveState(canvas) {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 删除当前位置之后的历史记录
    this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
    // 保存当前状态
    this.state.history.push(canvas.toDataURL());
    this.state.historyIndex++;
    this.updateUndoRedoButtons();
  },

  undo(canvas) {
    if (this.state.historyIndex > 0) {
      this.state.historyIndex--;
      this.loadState(canvas);
    }
  },

  redo(canvas) {
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.historyIndex++;
      this.loadState(canvas);
    }
  },

  loadState(canvas) {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (this.state.history[this.state.historyIndex]) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = this.state.history[this.state.historyIndex];
      this.updateUndoRedoButtons();
    }
  },

  updateUndoRedoButtons() {
    const undoButton = document.querySelector('[data-tool="undo"]');
    const redoButton = document.querySelector('[data-tool="redo"]');
    
    if (undoButton) {
      undoButton.style.opacity = this.state.historyIndex > 0 ? '1' : '0.5';
    }
    if (redoButton) {
      redoButton.style.opacity = 
        this.state.historyIndex < this.state.history.length - 1 ? '1' : '0.5';
    }
  },

  // 橡皮擦工具
  initEraserTool(canvas, ctx) {
    console.log('Initializing eraser tool');
    let isErasing = false;
    let lastX = 0;
    let lastY = 0;

    const handleMouseDown = (e) => {
      isErasing = true;
      const rect = canvas.getBoundingClientRect();
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
      
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = this.state.currentLineWidth * 2;  // 擦除宽度稍大
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    const handleMouseMove = (e) => {
      if (!isErasing) return;
      
      const rect = canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
      
      lastX = currentX;
      lastY = currentY;
    };

    const handleMouseUp = () => {
      if (isErasing) {
        isErasing = false;
        ctx.globalCompositeOperation = 'source-over';
        this.saveState(canvas);
      }
    };

    const handleMouseLeave = () => {
      if (isErasing) {
        isErasing = false;
        ctx.globalCompositeOperation = 'source-over';
        this.saveState(canvas);
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    canvas.eraserToolListeners = {
      mousedown: handleMouseDown,
      mousemove: handleMouseMove,
      mouseup: handleMouseUp,
      mouseleave: handleMouseLeave
    };
  },

  // 箭头工具
  initArrowTool(canvas, ctx) {
    console.log('Initializing arrow tool');
    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let tempCanvas = document.createElement('canvas'); // 创建临时画布
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    let tempCtx = tempCanvas.getContext('2d');

    const drawArrow = (fromX, fromY, toX, toY) => {
      // 计算箭头大小，根据线段长度动态调整
      const length = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
      const headLength = Math.min(20, length / 3);  // 箭头长度
      const headWidth = headLength * 0.8;  // 箭宽度
      const angle = Math.atan2(toY - fromY, toX - fromX);

      // 设置绘制样式
      ctx.beginPath();
      ctx.strokeStyle = this.state.currentArrowColor;
      ctx.lineWidth = this.state.currentArrowWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 设置虚线样式
      switch (this.state.currentArrowStyle) {
        case 'dashed':
          ctx.setLineDash([8, 8]);
          break;
        case 'denseDashed':
          ctx.setLineDash([4, 4]);
          break;
        default:
          ctx.setLineDash([]);
          break;
      }

      // 绘制完整的箭头路径（箭身和箭头）
      ctx.beginPath();
      
      // 绘制箭身
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      
      // 计算箭头��两个翼点
      const leftWingX = toX - headLength * Math.cos(angle - Math.PI / 6);
      const leftWingY = toY - headLength * Math.sin(angle - Math.PI / 6);
      const rightWingX = toX - headLength * Math.cos(angle + Math.PI / 6);
      const rightWingY = toY - headLength * Math.sin(angle + Math.PI / 6);

      // 绘制箭头
      ctx.moveTo(toX, toY);  // 箭头尖端
      ctx.lineTo(leftWingX, leftWingY);  // 左翼
      ctx.moveTo(toX, toY);  // 重新回到尖端
      ctx.lineTo(rightWingX, rightWingY); // 右翼

      // 一次性绘制整个路径
      ctx.stroke();
      
      // 重置虚线设置
      ctx.setLineDash([]);
    };

    const handleMouseDown = (e) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      // 保存当前画布状态到临时画布
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(canvas, 0, 0);
    };

    const handleMouseMove = (e) => {
      if (!isDrawing) return;
      
      const rect = canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      // 先清除画布，然后重绘之前的内容
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, 0, 0);
      
      // 绘制当前箭头
      drawArrow(startX, startY, currentX, currentY);
    };

    const handleMouseUp = () => {
      if (isDrawing) {
        isDrawing = false;
        this.saveState(canvas);
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    canvas.arrowToolListeners = {
      mousedown: handleMouseDown,
      mousemove: handleMouseMove,
      mouseup: handleMouseUp
    };
  },

  // 矩形工具
  initRectTool(canvas, ctx) {
    console.log('Initializing rectangle tool');
    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    let tempCtx = tempCanvas.getContext('2d');

    const handleMouseDown = (e) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(canvas, 0, 0);
    };

    const handleMouseMove = (e) => {
      if (!isDrawing) return;
      
      const rect = canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, 0, 0);
      
      ctx.beginPath();
      ctx.strokeStyle = this.state.currentShapeColor;
      ctx.fillStyle = this.state.currentShapeFillColor;
      ctx.lineWidth = this.state.currentShapeWidth;
      
      // 设置边框样式
      switch (this.state.currentShapeStyle) {
        case 'dashed':
          ctx.setLineDash([8, 8]);
          break;
        case 'dotted':
          ctx.setLineDash([2, 2]);
          break;
        default:
          ctx.setLineDash([]);
      }
      
      // 如果有填充色且不是透明，先填充
      if (this.state.currentShapeFillColor !== 'transparent') {
        ctx.fillRect(startX, startY, currentX - startX, currentY - startY);
      }
      // 绘制边框
      ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
      ctx.setLineDash([]); // 重置虚线设置
    };

    const handleMouseUp = () => {
      if (isDrawing) {
        isDrawing = false;
        this.saveState(canvas);
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    canvas.rectToolListeners = {
      mousedown: handleMouseDown,
      mousemove: handleMouseMove,
      mouseup: handleMouseUp
    };
  },

  // 椭圆工具
  initCircleTool(canvas, ctx) {
    console.log('Initializing circle tool');
    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    let tempCtx = tempCanvas.getContext('2d');

    const handleMouseDown = (e) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(canvas, 0, 0);
    };

    const handleMouseMove = (e) => {
      if (!isDrawing) return;
      
      const rect = canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, 0, 0);
      
      const radiusX = Math.abs(currentX - startX) / 2;
      const radiusY = Math.abs(currentY - startY) / 2;
      const centerX = startX + (currentX - startX) / 2;
      const centerY = startY + (currentY - startY) / 2;
      
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      
      ctx.strokeStyle = this.state.currentShapeColor;
      ctx.fillStyle = this.state.currentShapeFillColor;
      ctx.lineWidth = this.state.currentShapeWidth;
      
      // 设置边框样式
      switch (this.state.currentShapeStyle) {
        case 'dashed':
          ctx.setLineDash([8, 8]);
          break;
        case 'dotted':
          ctx.setLineDash([2, 2]);
          break;
        default:
          ctx.setLineDash([]);
      }
      
      // 如果有填充色且不是透明，先填充
      if (this.state.currentShapeFillColor !== 'transparent') {
        ctx.fill();
      }
      // 绘制边框
      ctx.stroke();
      ctx.setLineDash([]); // 重置虚线设置
    };

    const handleMouseUp = () => {
      if (isDrawing) {
        isDrawing = false;
        this.saveState(canvas);
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    canvas.circleToolListeners = {
      mousedown: handleMouseDown,
      mousemove: handleMouseMove,
      mouseup: handleMouseUp
    };
  },

  // 文字工具
  initTextTool(canvas, ctx) {
    console.log('Initializing text tool');
    
    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const input = document.createElement('textarea');
      input.className = 'annotation-text-input';
      Object.assign(input.style, {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        minWidth: '100px',
        minHeight: '24px',
        padding: '4px',
        border: '1px solid ' + this.state.currentColor,
        background: 'transparent',
        color: this.state.currentColor,
        fontSize: '16px',
        outline: 'none',
        resize: 'both',
        overflow: 'hidden',
        zIndex: '1000003'
      });
      
      canvas.parentElement.appendChild(input);
      input.focus();
      
      input.onblur = () => {
        if (input.value.trim()) {
          ctx.font = '16px Arial';
          ctx.fillStyle = this.state.currentColor;
          ctx.fillText(input.value, x, y + 16);
          this.saveState(canvas);
        }
        input.remove();
      };
      
      input.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          input.blur();
        }
      };
    };

    canvas.addEventListener('click', handleClick);
    canvas.textToolListeners = {
      click: handleClick
    };
  },

  // 修改线宽面板显示状态
  toggleLineWidthPanel(show, toolId) {
    const panel = document.querySelector(`.${toolId}-width-panel`);
    if (panel) {
      panel.style.display = show ? 'block' : 'none';
      this.state.isLineWidthPanelVisible = show;
    }
  },

  // 创建线宽选择面板
  createLineWidthPanel(toolId) {
    const panel = document.createElement('div');
    panel.className = `line-width-panel ${toolId}-width-panel`;
    Object.assign(panel.style, {
      position: 'absolute',
      left: '100%',
      top: '0',
      marginLeft: '10px',
      backgroundColor: '#2c2c2c',
      borderRadius: '6px',
      padding: '8px',
      display: 'none',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      zIndex: '1000003'
    });

    // 为不同工具提供不同的线宽选项
    let lineWidths;
    switch(toolId) {
      case 'eraser':
        lineWidths = [4, 8, 12, 16, 20]; // 橡皮擦的线宽选项
        break;
      case 'arrow':
        lineWidths = [2, 4, 6, 8, 10];   // 箭头的线宽选项
        break;
      default:
        lineWidths = [2, 4, 6, 8, 10];   // 画笔的线宽选项
    }

    lineWidths.forEach(width => {
      const option = document.createElement('div');
      Object.assign(option.style, {
        width: '100px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        cursor: 'pointer',
        borderRadius: '4px',
        marginBottom: '4px'
      });

      // 添加预览线条
      const preview = document.createElement('div');
      Object.assign(preview.style, {
        width: '60px',
        height: `${width}px`,
        backgroundColor: toolId === 'eraser' ? '#666' : '#fff',
        borderRadius: `${width/2}px`
      });
      option.appendChild(preview);

      option.addEventListener('mouseover', () => {
        option.style.backgroundColor = '#3c3c3c';
      });
      option.addEventListener('mouseout', () => {
        option.style.backgroundColor = 'transparent';
      });
      option.addEventListener('click', () => {
        // 根据工具类型设置不同的线宽
        if (toolId === 'arrow') {
          this.state.currentArrowWidth = width;
        } else {
          this.state.currentLineWidth = width;
        }
        this.toggleLineWidthPanel(false, toolId);
        if (this.state.currentTool) {
          this.initDrawingCanvas(this.state.currentTool);
        }
      });

      panel.appendChild(option);
    });

    return panel;
  },

  // 添加箭头样式面板创建方法
  createArrowStylePanel() {
    const panel = document.createElement('div');
    panel.className = 'arrow-style-panel';
    Object.assign(panel.style, {
      position: 'absolute',
      left: '100%',
      top: '0',
      marginLeft: '10px',
      backgroundColor: '#2c2c2c',
      borderRadius: '6px',
      padding: '12px',
      display: 'none',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      zIndex: '1000003',
      width: '180px'
    });

    // 1. 颜色选择部分
    const colorSection = document.createElement('div');
    colorSection.className = 'arrow-color-section';
    
    const colorLabel = document.createElement('div');
    colorLabel.textContent = '描边颜色';
    colorLabel.style.color = '#fff';
    colorLabel.style.marginBottom = '8px';
    colorSection.appendChild(colorLabel);

    // 创建左右布���容器
    const colorContainer = document.createElement('div');
    Object.assign(colorContainer.style, {
      display: 'flex',
      gap: '8px',  // 左右间距
      alignItems: 'flex-start'
    });

    // 左侧预设颜色网格
    const colorGrid = document.createElement('div');
    Object.assign(colorGrid.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',  // 改为4列
      gap: '4px',
      flex: '1'  // 占据剩余空间
    });

    const colors = [
      '#ff0000', '#ff9800', '#ffeb3b', '#4caf50', 
      '#2196f3', '#9c27b0', '#000000', '#ffffff'
    ];

    colors.forEach(color => {
      const colorBox = document.createElement('div');
      Object.assign(colorBox.style, {
        width: '20px',
        height: '20px',
        backgroundColor: color,
        borderRadius: '4px',
        cursor: 'pointer',
        border: '1px solid rgba(255, 255, 255, 0.1)',  // 给所有颜色添加淡色边框
        boxSizing: 'border-box'  // 确保边框不会改变盒子大小
      });

      colorBox.className = 'color-box';
      colorBox.addEventListener('click', () => {
        this.state.currentArrowColor = color;
        // 更新所有颜色框的选中状态
        colorContainer.querySelectorAll('.color-box').forEach(box => {
          box.style.outline = 'none';
        });
        colorBox.style.outline = '2px solid #fff';
        colorBox.style.outlineOffset = '1px';
        
        // 更新颜色选择器的背景色
        customColorWrapper.style.backgroundColor = color;
        customColorPicker.value = color;
        
        if (this.state.currentTool === 'arrow') {
          this.initDrawingCanvas('arrow');
        }
      });

      if (color === this.state.currentArrowColor) {
        colorBox.style.outline = '2px solid #fff';
        colorBox.style.outlineOffset = '1px';
      }

      colorGrid.appendChild(colorBox);
    });

    // 右侧分隔线和自定义颜色选择器
    const rightSection = document.createElement('div');
    Object.assign(rightSection.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    });

    // 添加垂直分隔线
    const divider = document.createElement('div');
    Object.assign(divider.style, {
      width: '1px',
      height: '44px',  // 与颜色网格高度匹配
      backgroundColor: '#444'
    });

    // 创建自定义颜色选择器的包装器
    const customColorWrapper = document.createElement('div');
    Object.assign(customColorWrapper.style, {
      width: '20px',
      height: '20px',
      backgroundColor: this.state.currentArrowColor,
      borderRadius: '4px',
      cursor: 'pointer',
      position: 'relative',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxSizing: 'border-box'
    });

    // 创建隐藏的颜色选择器
    const customColorPicker = document.createElement('input');
    customColorPicker.type = 'color';
    customColorPicker.value = this.state.currentArrowColor;
    Object.assign(customColorPicker.style, {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      opacity: 0,
      cursor: 'pointer'
    });

    // 添加事件监听
    customColorPicker.addEventListener('change', (e) => {
      const newColor = e.target.value;
      this.state.currentArrowColor = newColor;
      customColorWrapper.style.backgroundColor = newColor;
      
      // 更新所有颜色框的选中状态
      colorContainer.querySelectorAll('.color-box').forEach(box => {
        box.style.outline = 'none';
        // 如果预设颜色中有匹配的，也要更新其选中状态
        if (box.style.backgroundColor === newColor) {
          box.style.outline = '2px solid #fff';
          box.style.outlineOffset = '1px';
        }
      });

      if (this.state.currentTool === 'arrow') {
        this.initDrawingCanvas('arrow');
      }
    });

    // 将颜色选择器添加到包装器中
    customColorWrapper.appendChild(customColorPicker);

    rightSection.appendChild(divider);
    rightSection.appendChild(customColorWrapper);
    colorContainer.appendChild(colorGrid);
    colorContainer.appendChild(rightSection);
    colorSection.appendChild(colorContainer);
    panel.appendChild(colorSection);

    // 2. 线宽选择部分
    const widthSection = document.createElement('div');
    widthSection.className = 'arrow-width-section';
    
    const widthLabel = document.createElement('div');
    widthLabel.textContent = '描边宽度';
    widthLabel.style.color = '#fff';
    widthLabel.style.margin = '12px 0 8px';
    widthSection.appendChild(widthLabel);

    const widthOptions = document.createElement('div');
    Object.assign(widthOptions.style, {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '12px'
    });

    [2, 4, 6].forEach(width => {
      const option = document.createElement('div');
      Object.assign(option.style, {
        width: '50px',
        height: '32px',
        backgroundColor: '#3c3c3c',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      });

      const line = document.createElement('div');
      Object.assign(line.style, {
        width: '30px',
        height: `${width}px`,
        backgroundColor: '#fff',
        borderRadius: `${width/2}px`
      });

      option.appendChild(line);
      option.addEventListener('click', () => {
        this.state.currentArrowWidth = width;
        // 更新选中状态
        widthOptions.querySelectorAll('.width-option').forEach(opt => {
          opt.style.backgroundColor = '#3c3c3c';
        });
        option.style.backgroundColor = '#666';
        
        if (this.state.currentTool === 'arrow') {
          this.initDrawingCanvas('arrow');
        }
      });

      option.className = 'width-option';
      if (width === this.state.currentArrowWidth) {
        option.style.backgroundColor = '#666';
      }

      widthOptions.appendChild(option);
    });

    widthSection.appendChild(widthOptions);
    panel.appendChild(widthSection);

    // 3. 边框样式部分
    const styleSection = document.createElement('div');
    styleSection.className = 'arrow-style-section';
    
    const styleLabel = document.createElement('div');
    styleLabel.textContent = '边框样式';
    styleLabel.style.color = '#fff';
    styleLabel.style.marginBottom = '8px';
    styleSection.appendChild(styleLabel);

    const styleOptions = document.createElement('div');
    Object.assign(styleOptions.style, {
      display: 'flex',
      justifyContent: 'space-between'
    });

    const styles = [
      { id: 'solid', preview: '━' },
      { id: 'dashed', preview: '┅' },
      { id: 'dotted', preview: '┈' }
    ];

    styles.forEach(style => {
      const option = document.createElement('div');
      Object.assign(option.style, {
        width: '50px',
        height: '32px',
        backgroundColor: style.id === this.state.currentArrowStyle ? '#666' : '#3c3c3c',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '20px'
      });

      option.textContent = style.preview;
      option.addEventListener('click', () => {
        this.state.currentArrowStyle = style.id;
        // 更新选中状态
        styleOptions.querySelectorAll('div').forEach(opt => {
          opt.style.backgroundColor = '#3c3c3c';
        });
        option.style.backgroundColor = '#666';
        
        if (this.state.currentTool === 'arrow') {
          this.initDrawingCanvas('arrow');
        }
      });

      styleOptions.appendChild(option);
    });

    styleSection.appendChild(styleOptions);
    panel.appendChild(styleSection);

    return panel;
  },

  // 添加箭头样式面板显示切换方法
  toggleArrowStylePanel(show) {
    const panel = document.querySelector('.arrow-style-panel');
    if (panel) {
      panel.style.display = show ? 'block' : 'none';
    }
  },

  // 添加形状样式面板创建方法
  createShapeStylePanel() {
    const panel = document.createElement('div');
    panel.className = 'shape-style-panel';
    Object.assign(panel.style, {
      position: 'absolute',
      left: '100%',
      top: '0',
      marginLeft: '10px',
      backgroundColor: '#2c2c2c',
      borderRadius: '6px',
      padding: '12px',
      display: 'none',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      zIndex: '1000003',
      width: '180px'
    });

    // 1. 描边颜色部分
    const strokeSection = document.createElement('div');
    strokeSection.className = 'shape-stroke-section';
    
    const strokeLabel = document.createElement('div');
    strokeLabel.textContent = '描边颜色';
    strokeLabel.style.color = '#fff';
    strokeLabel.style.marginBottom = '8px';
    strokeSection.appendChild(strokeLabel);

    // 使用通用颜色选择器创建描边颜色选择器
    const strokeColors = ['#ff0000', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3'];
    const strokeColorPicker = this.createColorPicker(strokeColors, 'currentShapeColor');
    strokeSection.appendChild(strokeColorPicker);
    panel.appendChild(strokeSection);

    // 2. 背景颜色部分
    const fillSection = document.createElement('div');
    fillSection.className = 'shape-fill-section';
    fillSection.style.marginTop = '12px';
    
    const fillLabel = document.createElement('div');
    fillLabel.textContent = '背景颜色';
    fillLabel.style.color = '#fff';
    fillLabel.style.marginBottom = '8px';
    fillSection.appendChild(fillLabel);

    // 使用通用颜色选择器创建背景颜色选择器，第一个是透明色
    const fillColors = ['transparent', '#ff0000', '#ff9800', '#ffeb3b', '#4caf50'];
    const fillColorPicker = this.createColorPicker(fillColors, 'currentShapeFillColor');
    fillSection.appendChild(fillColorPicker);
    panel.appendChild(fillSection);

    // 3. 描边宽度部分
    const widthSection = document.createElement('div');
    widthSection.className = 'shape-width-section';
    widthSection.style.marginTop = '12px';
    
    const widthLabel = document.createElement('div');
    widthLabel.textContent = '描边宽度';
    widthLabel.style.color = '#fff';
    widthLabel.style.marginBottom = '8px';
    widthSection.appendChild(widthLabel);

    const widthOptions = document.createElement('div');
    Object.assign(widthOptions.style, {
      display: 'flex',
      justifyContent: 'space-between'
    });

    [2, 4, 6].forEach(width => {
      const option = document.createElement('div');
      Object.assign(option.style, {
        width: '50px',
        height: '32px',
        backgroundColor: width === this.state.currentShapeWidth ? '#666' : '#3c3c3c',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      });

      const line = document.createElement('div');
      Object.assign(line.style, {
        width: '30px',
        height: `${width}px`,
        backgroundColor: '#fff',
        borderRadius: `${width/2}px`
      });

      option.appendChild(line);
      option.addEventListener('click', () => {
        this.state.currentShapeWidth = width;
        widthOptions.querySelectorAll('div').forEach(opt => {
          opt.style.backgroundColor = '#3c3c3c';
        });
        option.style.backgroundColor = '#666';
        
        if (['rectangle', 'circle'].includes(this.state.currentTool)) {
          this.initDrawingCanvas(this.state.currentTool);
        }
      });

      widthOptions.appendChild(option);
    });

    widthSection.appendChild(widthOptions);
    panel.appendChild(widthSection);

    // 4. 边框样式部分
    const styleSection = document.createElement('div');
    styleSection.className = 'shape-style-section';
    styleSection.style.marginTop = '12px';
    
    const styleLabel = document.createElement('div');
    styleLabel.textContent = '边框样式';
    styleLabel.style.color = '#fff';
    styleLabel.style.marginBottom = '8px';
    styleSection.appendChild(styleLabel);

    const styleOptions = document.createElement('div');
    Object.assign(styleOptions.style, {
      display: 'flex',
      justifyContent: 'space-between'
    });

    const styles = [
      { id: 'solid', preview: '━' },
      { id: 'dashed', preview: '┅' },
      { id: 'dotted', preview: '┈' }
    ];

    styles.forEach(style => {
      const option = document.createElement('div');
      Object.assign(option.style, {
        width: '50px',
        height: '32px',
        backgroundColor: style.id === this.state.currentShapeStyle ? '#666' : '#3c3c3c',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '20px'
      });

      option.textContent = style.preview;
      option.addEventListener('click', () => {
        this.state.currentShapeStyle = style.id;
        styleOptions.querySelectorAll('div').forEach(opt => {
          opt.style.backgroundColor = '#3c3c3c';
        });
        option.style.backgroundColor = '#666';
        
        if (['rectangle', 'circle'].includes(this.state.currentTool)) {
          this.initDrawingCanvas(this.state.currentTool);
        }
      });

      styleOptions.appendChild(option);
    });

    styleSection.appendChild(styleOptions);
    panel.appendChild(styleSection);

    return panel;
  },

  // 添加形状样式面板显示切换方法
  toggleShapeStylePanel(show) {
    const panel = document.querySelector('.shape-style-panel');
    if (panel) {
        panel.style.display = show ? 'block' : 'none';
    }
  },

  // 添加颜色选择器创建辅助方法
  createColorPicker(colors, stateKey) {
    const container = document.createElement('div');
    Object.assign(container.style, {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    });

    // 创建颜色网格
    const colorGrid = document.createElement('div');
    Object.assign(colorGrid.style, {
      display: 'flex',
      gap: '4px',
      flex: 1
    });

    colors.forEach(color => {
      const colorBox = document.createElement('div');
      Object.assign(colorBox.style, {
        width: '24px',
        height: '24px',
        borderRadius: '4px',
        cursor: 'pointer',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxSizing: 'border-box'
      });

      if (color === 'transparent') {
        // 创建透明色的特殊显示
        colorBox.style.background = 'linear-gradient(45deg, #ccc 25%, transparent 25%), ' +
          'linear-gradient(-45deg, #ccc 25%, transparent 25%), ' +
          'linear-gradient(45deg, transparent 75%, #ccc 75%), ' +
          'linear-gradient(-45deg, transparent 75%, #ccc 75%)';
        colorBox.style.backgroundSize = '8px 8px';
        colorBox.style.backgroundPosition = '0 0, 0 4px, 4px -4px, -4px 0px';
        colorBox.style.backgroundColor = 'white';
      } else {
        colorBox.style.backgroundColor = color;
      }

      colorBox.addEventListener('click', () => {
        this.state[stateKey] = color;
        container.querySelectorAll('.color-box').forEach(box => {
          box.style.outline = 'none';
        });
        colorBox.style.outline = '2px solid #fff';
        colorBox.style.outlineOffset = '1px';
        
        if (['rectangle', 'circle'].includes(this.state.currentTool)) {
          this.initDrawingCanvas(this.state.currentTool);
        }
      });

      if (color === this.state[stateKey]) {
        colorBox.style.outline = '2px solid #fff';
        colorBox.style.outlineOffset = '1px';
      }

      colorBox.className = 'color-box';
      colorGrid.appendChild(colorBox);
    });

    // 添加自定义颜色选择器
    const customColorPicker = document.createElement('input');
    customColorPicker.type = 'color';
    customColorPicker.value = this.state[stateKey] === 'transparent' ? '#ffffff' : this.state[stateKey];
    Object.assign(customColorPicker.style, {
      width: '24px',
      height: '24px',
      padding: '0',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '4px',
      cursor: 'pointer',
      backgroundColor: 'transparent'
    });

    customColorPicker.addEventListener('change', (e) => {
      this.state[stateKey] = e.target.value;
      container.querySelectorAll('.color-box').forEach(box => {
        box.style.outline = 'none';
      });
      
      if (['rectangle', 'circle'].includes(this.state.currentTool)) {
        this.initDrawingCanvas(this.state.currentTool);
      }
    });

    container.appendChild(colorGrid);
    container.appendChild(customColorPicker);
    return container;
  }
};
