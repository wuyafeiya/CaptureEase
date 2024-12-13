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
    highlightTimeout: null
  };

  // UI 元素
  const ui = {
    overlay: createOverlay(),
    hint: createHint()
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
      document.body.appendChild(state.selection);
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

      // 更新裁剪区域
      this.updateClipPath(left, top, width, height);
    },

    checkBoundary(rect) {
      let { left, top, width, height } = rect;
      const docWidth = document.documentElement.clientWidth;
      const docHeight = document.documentElement.clientHeight;
      
      if (left < 0) left = 3;
      if (left + width > docWidth) {
        width = docWidth - left - 3;
      }
      if (top < 0) top = 3;
      if (top + height > docHeight) {
        height = docHeight - top - 60;
      }

      return { left, top, width, height };
    },

    updateClipPath(left, top, width, height) {
      // 获取文档的实际宽度和高度（包含滚动条）
      const docWidth = document.documentElement.clientWidth;
      const docHeight = document.documentElement.clientHeight;

      const x = (left / docWidth) * 100;
      const y = (top / docHeight) * 100;
      const w = (width / docWidth) * 100;
      const h = (height / docHeight) * 100;

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
    }
  };

  // 工具栏管理
  const toolbarManager = {
    create(selection) {
      const toolbar = document.createElement('div');
      toolbar.className = 'toolbar';
      this.setStyle(toolbar);
      
      const buttons = [
        this.createCloseButton(),
        this.createFullscreenButton(),
        this.createDownloadButton()
      ];
      
      buttons.forEach(button => toolbar.appendChild(button));
      selection.appendChild(toolbar);
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
        alignItems: 'center'
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
        state.isSelected = true;
        toolbarManager.create(state.selection);
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

  // 处理按��
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

  // 添加拖拽监听器
  function addDragListeners(selection) {
    selection.addEventListener('mousedown', (e) => {
      if (e.target !== selection) return;

      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;
      const startRect = selection.getBoundingClientRect();

      function handleDrag(moveEvent) {
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
      }

      function handleDragEnd() {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
      }

      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
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

          // 设置最小尺寸限制
          const minSize = 20;
          if (newRect.width < minSize) {
            if (pos.includes('w')) {
              newRect.left = startRect.right - minSize;
            }
            newRect.width = minSize;
          }
          if (newRect.height < minSize) {
            if (pos.includes('n')) {
              newRect.top = startRect.bottom - minSize;
            }
            newRect.height = minSize;
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
