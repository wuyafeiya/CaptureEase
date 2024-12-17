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
    history: [],
    historyIndex: -1,
    currentTool: null,
    isCornerStylePanelVisible: false,
    isLineWidthPanelVisible: false,
    isArrowStylePanelVisible: false,
    isShapeStylePanelVisible: false,
    isTextStylePanelVisible: false,  // 添加这一行
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
  // 文件大小
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
        this.createDownloadButton(),
        this.createCopyButton()
      ];

      buttons.forEach(button => toolbar.appendChild(button));
      selection.appendChild(toolbar);

      // 确保工具栏样式在添加到 DOM 后设置
      this.setStyle(toolbar);
    },

    setStyle(toolbar) {
      Object.assign(toolbar.style, {
        width: '250px',
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
        const sourceCanvas = document.querySelector('.annotation-canvas');
        const dataURL = sourceCanvas ? sourceCanvas.toDataURL('image/png') : null;
        console.log(dataURL)
        this.capture('captureArea', {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
          sourceCanvas: dataURL
        });
      });
    },

    createCopyButton() {
      const copyButton = document.createElement('button');
      copyButton.className = 'toolbar-button';
      copyButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        复制
      `;

      copyButton.addEventListener('click', async () => {
        console.log('复制按钮被点击');
        const rect = state.selection.getBoundingClientRect();
        const sourceCanvas = document.querySelector('.annotation-canvas');
        const dataURL = sourceCanvas ? sourceCanvas.toDataURL('image/png') : null;
        this.capture('copyArea', {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
          sourceCanvas: dataURL
        });
      });
      return copyButton;
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
      }, async (response) => {
        if (response?.success) {
          if (response.dataURL) {
            const blob = dataURLToBlob(response.dataURL);
            try {
              const clipboardItem = new ClipboardItem({
                [blob.type]: blob
              });
              await navigator.clipboard.write([clipboardItem]);
              console.log('图片已成功复制到剪贴板');
              showToast('已复制到剪贴板');  // 添加这行
            } catch (error) {
              console.error('复制到剪贴板失败:', error);
              showToast('复制失败，请重试');  // 添加这行
            }
          }
        } else {
          console.error(`${action} 失败:`, response?.error);
          showToast('操作失败，请重试');  // 添加这行
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
      // 临时禁用遮罩层的鼠标事件,这样才能获取到下面的元素
      ui.overlay.style.pointerEvents = 'none';

      // 获取鼠标位置下的实际页面元素
      const element = document.elementFromPoint(
        e.clientX,
        e.clientY
      );
      // 重新启用遮罩层的鼠标事件
      ui.overlay.style.pointerEvents = 'auto';

      // 如果获取到的元素:
      // 1. 不是遮罩层本身
      // 2. 不是已经高亮的元素
      // 3. 不是当前选中的元素
      // 则创建新的高亮效果并更新选中状态
      if (element && !element.classList.contains('screenshot-overlay') &&
        !element.classList.contains('element-highlight') &&
        element !== state.selectedElement) {
        highlightManager.create(element);
        state.selectedElement = element;
      }
    }
  }

  // 处理鼠标按下
  // 处理鼠标按下事件
  function handleMouseDown(e) {
    // 如果��罩层不存在或已经选中了区域,则直接返回
    if (!ui.overlay.parentElement || state.isSelected) {
      return;
    }

    // 记录鼠标按下时的坐标
    const mouseDownX = e.clientX;
    const mouseDownY = e.clientY;
    let isDragSelecting = false;

    // 处理拖拽过程中的鼠标移动
    function handleMouseMoveWhileDown(e) {
      const deltaX = Math.abs(e.clientX - mouseDownX);
      const deltaY = Math.abs(e.clientY - mouseDownY);

      // 如果移动距离超过5px,则认为开始拖拽选择
      if (deltaX > 5 || deltaY > 5) {
        isDragSelecting = true;
        ui.hint.classList.add('hidden'); // 隐藏提示

        // 清除之前的高亮
        highlightManager.remove();
        state.selectedElement = null;

        // 如果还没有选区,则创建一个新的选区
        if (!state.selection) {
          state.selection = selectionManager.create();
          addDragListeners(state.selection);
          addResizeHandles(state.selection);
        }

        // 计算选区的位置和大小
        const rect = {
          left: Math.min(mouseDownX, e.clientX),
          top: Math.min(mouseDownY, e.clientY),
          width: Math.abs(e.clientX - mouseDownX),
          height: Math.abs(e.clientY - mouseDownY)
        };

        // 更新选区位置
        selectionManager.updatePosition(rect);
      }
    }

    // 处理鼠标松开
    function handleMouseUp(e) {
      // 移除事件监听
      document.removeEventListener('mousemove', handleMouseMoveWhileDown);
      document.removeEventListener('mouseup', handleMouseUp);

      if (isDragSelecting && state.selection) {
        // 如果是拖拽选择且选区存在
        const rect = state.selection.getBoundingClientRect();
        if (rect.width >= 20 && rect.height >= 20) {
          // 选区尺寸符合要求,标记为已选择并创建工具栏
          state.isSelected = true;
          toolbarManager.create(state.selection);
        } else {
          // 选区太小,移除选区
          if (state.selection.parentElement) {
            state.selection.remove();
          }
          state.selection = null;
        }
      } else if (state.selectedElement) {
        // 如果是点击选择了某个元素
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

    // 添加事件监听
    document.addEventListener('mousemove', handleMouseMoveWhileDown);
    document.addEventListener('mouseup', handleMouseUp);

    // 果已经选中了元素,则阻止事件冒泡
    if (state.selectedElement) {
      state.isSelected = true;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }

  // 处理鼠松开
  function handleMouseUp() {
    if (!ui.overlay.parentElement) {
      cleanup();
      return;
    }
  }

  // 处理按键
  function handleKeyDown(e) {
    // 如果按下 ESC，清理并退出
    if (e.key === 'Escape') {
      cleanup();
      return;
    }

    // 添加复制快捷键处理
    if ((e.metaKey || e.ctrlKey) && e.key === 'c' && state.selection) {
      e.preventDefault(); // 阻止默认复制行为
      
      // 获取当前选区信息
      const rect = state.selection.getBoundingClientRect();
      const sourceCanvas = document.querySelector('.annotation-canvas');
      const dataURL = sourceCanvas ? sourceCanvas.toDataURL('image/png') : null;

      // 调用复制功能
      toolbarManager.capture('copyArea', {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        sourceCanvas: dataURL
      });
    }
  }

  // 处理窗口大小改变
  function handleResize() {
    if (state.selection && state.isSelected) {
      const rect = state.selection.getBoundingClientRect();
      selectionManager.updatePosition(rect);
    }
  }
  function dataURLToBlob(dataURL) {
    // 分离 Data URL 的头部信息和 Base64 编码内容
    const [header, base64Data] = dataURL.split(',');
    const mimeType = header.match(/:(.*?);/)[1]; // 提取 MIME 类型
    const binaryString = atob(base64Data); // 解码 Base64 字符串
    const length = binaryString.length;
    const uint8Array = new Uint8Array(length);

    // 将每个字符的 Unicode 编码转为二进制
    for (let i = 0; i < length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }

    // 创建 Blob
    return new Blob([uint8Array], { type: mimeType });
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

      handle.onpointerdown = function (e) {
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

    // 重置 annotationToolbarManager 的状态
    annotationToolbarManager.state = {
      // 保持默认值
      currentPenWidth: 2,
      currentPenColor: '#ff0000',
      currentEraserWidth: 8,
      currentArrowWidth: 2,
      currentArrowColor: '#ff0000',
      currentCornerStyle: 'round',
      currentShapeStyle: 'stroke',
      currentShapeColor: '#ff0000',
      currentFontFamily: 'Arial',
      currentFontSize: 16,
      currentTextColor: '#ff0000',
      // 重置历史记录和工具状态
      history: [],
      historyIndex: -1,
      currentTool: null,
      // 重置面板显示状态
      isCornerStylePanelVisible: false,
      isLineWidthPanelVisible: false,
      isArrowStylePanelVisible: false,
      isShapeStylePanelVisible: false,
      isTextStylePanelVisible: false,
      // 保持可用选项的数组
      availableCornerStyles: annotationToolbarManager.state.availableCornerStyles,
      availableFonts: annotationToolbarManager.state.availableFonts,
      availableSizes: annotationToolbarManager.state.availableSizes
    };

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


// 添加标注工具栏管理���
const annotationToolbarManager = {
  state: {
    // 通用样式
    currentColor: '#ff0000',
    currentLineWidth: 2,

    // 画笔工具
    currentPenColor: '#ff0000',
    currentPenWidth: 2,

    // 橡皮擦工具
    currentEraserWidth: 2,

    // 箭头工具
    currentArrowColor: '#ff0000',
    currentArrowWidth: 2,
    currentArrowStyle: 'solid',

    // 形状工具
    currentShapeColor: '#ff0000',
    currentShapeWidth: 2,
    currentShapeFillColor: 'transparent',
    currentShapeStyle: 'solid',
    currentCornerStyle: 'sharp',

    // 文字工具
    currentTextColor: '#ff0000',
    currentFontSize: 16,
    currentFontFamily: 'Arial',
    availableFonts: [
      {
        name: 'Arial',
        label: '默认字体',
        type: 'system'
      },
      {
        name: 'CustomFont1',
        label: '手写体',
        type: 'custom',
        url: 'https://excalidraw.nyc3.cdn.digitaloceanspaces.com/oss/fonts/Excalifont/Excalifont-Regular-a88b72a24fb54c9f94e3b5fdaa7481c9.woff2'  // 替换为实际的字体文件URL
      },
      {
        name: 'CustomFont2',
        label: '艺术体',
        type: 'custom',
        url: 'https://excalidraw.nyc3.cdn.digitaloceanspaces.com/oss/fonts/Lilita/Lilita-Regular-i7dPIFZ9Zz-WBtRtedDbYEF8RXi4EwQ.woff2'  // ���换为实际的字体文件URL
      },
      {
        name: 'CustomFont3',
        label: '手写体',
        type: 'custom',
        url: 'https://excalidraw.nyc3.cdn.digitaloceanspaces.com/oss/fonts/CascadiaCode/CascadiaCode-Regular.woff2'
      }
    ],
    availableSizes: [
      { value: 12, label: 'S' },
      { value: 16, label: 'M' },
      { value: 20, label: 'L' },
      { value: 24, label: 'XL' }
    ],

    // 面板显示状态
    isLineWidthPanelVisible: false,
    isArrowStylePanelVisible: false,
    isShapeStylePanelVisible: false,
    isTextStylePanelVisible: false,  // 添加这一行

    // 历史记录
    history: [],
    historyIndex: -1,

    // 当前工具
    currentTool: null
  },

  // 添加字体加载方法
  loadCustomFonts() {
    const style = document.createElement('style');
    const fontFaces = this.state.availableFonts
      .filter(font => font.type === 'custom')
      .map(font => `
        @font-face {
          font-family: '${font.name}';
          src: url('${font.url}') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
      `).join('\n');

    style.textContent = fontFaces;
    document.head.appendChild(style);

    // 预加载字体
    this.state.availableFonts
      .filter(font => font.type === 'custom')
      .forEach(font => {
        const loader = new FontFace(font.name, `url(${font.url})`);
        loader.load().then(loadedFont => {
          document.fonts.add(loadedFont);
          console.log(`Font ${font.name} loaded successfully`);
        }).catch(error => {
          console.error(`Error loading font ${font.name}:`, error);
        });
      });
  },

  create(selection) {
    const toolbar = document.createElement('div');
    toolbar.className = 'annotation-toolbar';

    const tools = [
      {
        id: 'select',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24"><path fill="currentColor" d="M8 13.75L9.975 11h4.25L8 6.1zm7.15 7.625q-.575.275-1.15.063t-.85-.788l-3-6.45l-2.325 3.25q-.425.6-1.125.375t-.7-.95V4.05q0-.625.563-.9t1.062.125l10.1 7.95q.575.425.338 1.1T17.1 13h-4.2l2.975 6.375q.275.575.063 1.15t-.788.85M9.975 11"/></svg>`,
        tooltip: '选择'
      },
      { id: 'pen', icon: '✏️', tooltip: '画笔', hasLineWidth: true },
      {
        id: 'eraser',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 20 20"><path fill="currentColor" d="M11.197 2.44a1.5 1.5 0 0 1 2.121 0l4.243 4.242a1.5 1.5 0 0 1 0 2.121L9.364 17H14.5a.5.5 0 1 1 0 1H7.82a1.5 1.5 0 0 1-1.14-.437L2.437 13.32a1.5 1.5 0 0 1 0-2.121zm1.414.706a.5.5 0 0 0-.707 0L5.538 9.512l4.95 4.95l6.366-6.366a.5.5 0 0 0 0-.707zM9.781 15.17l-4.95-4.95l-1.687 1.687a.5.5 0 0 0 0 .707l4.243 4.243a.5.5 0 0 0 .707 0z"/></svg>`,
        tooltip: '橡皮擦',
        hasLineWidth: true
      },
      { id: 'arrow', icon: '➡️', tooltip: '箭头', hasArrowStyle: true, hasLineWidth: true },
      { id: 'rectangle', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.357 9.3c0-1.68 0-2.52.327-3.162a3 3 0 0 1 1.311-1.311C4.637 4.5 5.477 4.5 7.157 4.5h9.686c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.31 1.311c.328.642.328 1.482.328 3.162v5.4c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311c-.642.327-1.482.327-3.162.327H7.157c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.31-1.311c-.328-.642-.328-1.482-.328-3.162z"/></svg>`, tooltip: '矩形', hasShapeStyle: true },
      { id: 'circle', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10s10-4.47 10-10S17.53 2 12 2m0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8s8 3.58 8 8s-3.58 8-8 8"/></svg>`, tooltip: '椭圆', hasShapeStyle: true },
      { id: 'text', icon: `<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" class="" fill="none" stroke-width="2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="1.5"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><line x1="4" y1="20" x2="7" y2="20"></line><line x1="14" y1="20" x2="21" y2="20"></line><line x1="6.9" y1="15" x2="13.8" y2="15"></line><line x1="10.2" y1="6.3" x2="16" y2="20"></line><polyline points="5 20 11 4 13 4 20 20"></polyline></g></svg>`, tooltip: '���字' },
      { id: 'divider', type: 'divider' },
      { id: 'undo', icon: '↩️', tooltip: '撤销' },
      { id: 'redo', icon: '↪️', tooltip: '重做' },
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

        // 恢复线面板
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

    // 移除所有旧面板
    const oldPanels = selection.querySelectorAll('.line-width-panel, .arrow-style-panel, .shape-style-panel, .text-style-panel');
    oldPanels.forEach(panel => panel.remove());

    // 处理面板显示/隐藏
    if (['pen', 'eraser'].includes(toolId)) {
      // 处理画笔���橡皮擦的线宽面板
      if (previousTool === toolId) {
        this.toggleLineWidthPanel(!this.state.isLineWidthPanelVisible, toolId);
      } else {
        const buttonContainer = selection.querySelector(`[data-tool="${toolId}"]`).parentElement;
        buttonContainer.appendChild(this.createLineWidthPanel(toolId));
        this.toggleLineWidthPanel(true, toolId);
      }
    } else if (toolId === 'arrow') {
      // 处理箭头工具的样式面板
      if (previousTool === toolId) {
        this.toggleArrowStylePanel(!this.state.isArrowStylePanelVisible);
      } else {
        const buttonContainer = selection.querySelector(`[data-tool="${toolId}"]`).parentElement;
        buttonContainer.appendChild(this.createArrowStylePanel());
        this.toggleArrowStylePanel(true);
      }
    } else if (['rectangle', 'circle'].includes(toolId)) {
      // 处理形状工具的样式面板
      if (previousTool === toolId) {
        this.toggleShapeStylePanel(!this.state.isShapeStylePanelVisible);
      } else {
        const buttonContainer = selection.querySelector(`[data-tool="${toolId}"]`).parentElement;
        buttonContainer.appendChild(this.createShapeStylePanel());
        this.toggleShapeStylePanel(true);
      }
    } else if (toolId === 'text') {
      // 处理文字工具的面板显示/隐藏
      if (previousTool === toolId) {
        this.toggleTextStylePanel(!this.state.isTextStylePanelVisible);
      } else {
        const buttonContainer = selection.querySelector(`[data-tool="${toolId}"]`).parentElement;
        buttonContainer.appendChild(this.createTextStylePanel());
        this.toggleTextStylePanel(true);
      }
    } else if (toolId === 'blur') {
      // 处理模糊工具的面板显示/隐藏
      if (previousTool === toolId) {
        this.toggleBlurSettingsPanel(!this.state.isBlurSettingsPanelVisible);
      } else {
        const buttonContainer = selection.querySelector(`[data-tool="${toolId}"]`).parentElement;
        buttonContainer.appendChild(this.createBlurSettingsPanel());
        this.toggleBlurSettingsPanel(true);
      }
    } else {
      // 其他工具：隐藏所有面板
      ['pen', 'eraser'].forEach(t => this.toggleLineWidthPanel(false, t));
      this.toggleArrowStylePanel(false);
      this.toggleShapeStylePanel(false);
      this.toggleTextStylePanel(false);
      this.toggleBlurSettingsPanel(false);
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
      // 其他工具需要启画布事件
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
    const selection = document.querySelector('.selected-element');
    if (!selection) return;

    let canvas = selection.querySelector('.annotation-canvas');
    const isNewCanvas = !canvas;

    if (isNewCanvas) {
      // 只在没有 canvas 时创建新的
      canvas = document.createElement('canvas');
      canvas.className = 'annotation-canvas';
      const rect = selection.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      Object.assign(canvas.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        zIndex: '1000001',
        cursor: 'crosshair'
      });

      // 清空画布
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      selection.appendChild(canvas);
    } else {
      // 如果已有 canvas，只移除旧的事件监听器
      if (canvas.penToolListeners) {
        Object.entries(canvas.penToolListeners).forEach(([event, listener]) => {
          canvas.removeEventListener(event, listener);
        });
      }
      // ... 其他工具的事件监听器移除 ...
      if (canvas.blurToolListeners) {
        Object.entries(canvas.blurToolListeners).forEach(([event, listener]) => {
          canvas.removeEventListener(event, listener);
        });
      }
    }

    const ctx = canvas.getContext('2d');

    // 初始化对应的工具
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
        this.initRectangleTool(canvas, ctx);
        break;
      case 'circle':
        this.initCircleTool(canvas, ctx);
        break;
      case 'text':
        this.initTextTool(canvas, ctx);
        break;
      case 'blur':
        this.initBlurTool(canvas, ctx);
        break;
    }

    // 如果有历史记录，恢复最后的状态
    if (this.state.history.length > 0) {
      const lastState = this.state.history[this.state.historyIndex];
      if (lastState) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = lastState;
      }
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
      color: this.state.currentPenColor,
      lineWidth: this.state.currentPenWidth
    });

    // 初始化画布状态
    ctx.strokeStyle = this.state.currentPenColor;
    ctx.lineWidth = this.state.currentPenWidth;
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

      // 如果移动距离太小，不添加��点
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
      ctx.lineWidth = this.state.currentEraserWidth;  // 擦除宽度稍大
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
      const angle = Math.atan2(toY - fromY, toX - fromX);

      // 设置绘制样式
      ctx.beginPath();
      console.log(this.state)
      console.log('this.state.currentArrowColor', this.state.currentArrowColor);
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

      // 计算箭头两个翼点
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
  initRectangleTool(canvas, ctx) {
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

      const width = currentX - startX;
      const height = currentY - startY;
      const x = width < 0 ? currentX : startX;
      const y = height < 0 ? currentY : startY;
      const absWidth = Math.abs(width);
      const absHeight = Math.abs(height);

      // 根据边角样式绘制矩形
      if (this.state.currentCornerStyle === 'round') {
        const radius = Math.min(10, absWidth / 4, absHeight / 4); // 圆角半径
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + absWidth - radius, y);
        ctx.quadraticCurveTo(x + absWidth, y, x + absWidth, y + radius);
        ctx.lineTo(x + absWidth, y + absHeight - radius);
        ctx.quadraticCurveTo(x + absWidth, y + absHeight, x + absWidth - radius, y + absHeight);
        ctx.lineTo(x + radius, y + absHeight);
        ctx.quadraticCurveTo(x, y + absHeight, x, y + absHeight - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
      } else {
        ctx.beginPath();
        ctx.rect(x, y, absWidth, absHeight);
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

      const input = document.createElement('div');
      input.className = 'annotation-text-input';
      input.contentEditable = true;
      Object.assign(input.style, {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        minWidth: '1px',
        minHeight: '30px',
        padding: '0',
        border: 'none',
        background: 'transparent',
        color: this.state.currentTextColor,
        fontSize: `${this.state.currentFontSize}px`,
        fontFamily: this.state.currentFontFamily,
        outline: 'none',
        caretColor: this.state.currentTextColor,
        whiteSpace: 'pre',
        zIndex: '1000003'
      });

      // 添加闪烁光标动画
      const style = document.createElement('style');
      style.textContent = `
        @keyframes blink {
          0%, 100% { opacity: 1; }
          25%, 75% { opacity: 0; }
        }
        .annotation-text-input:empty:focus::before {
          content: '';
          border-left: 1px solid ${this.state.currentTextColor};
          position: absolute;
          height: ${this.state.currentFontSize}px;
          opacity: 1;
          animation: blink 2s ease-in-out infinite;
          animation-play-state: running;
        }
        .annotation-text-input:not(:empty):focus::before {
          animation-play-state: paused;
          opacity: 0;
        }
      `;
      document.head.appendChild(style);

      canvas.parentElement.appendChild(input);
      input.focus();

      input.onblur = () => {
        if (input.textContent.trim()) {
          ctx.fillStyle = this.state.currentTextColor;
          ctx.font = `${this.state.currentFontSize}px ${this.state.currentFontFamily}`;
          ctx.fillText(input.textContent, x, y + this.state.currentFontSize);
          this.saveState(canvas);
        }
        input.remove();
        style.remove();
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

    // 为不同工具提���不同的线宽选项
    let lineWidths;
    switch (toolId) {
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
        borderRadius: `${width / 2}px`
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
        switch (toolId) {
          case 'eraser':
            this.state.currentEraserWidth = width;
            break;
          case 'arrow':
            this.state.currentArrowWidth = width;
            break;
          case 'pen':
            this.state.currentPenWidth = width;
            break;
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
    colorLabel.style.fontSize = '14px';
    colorLabel.style.marginBottom = '8px';
    colorSection.appendChild(colorLabel);

    // 创建左右布容器
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
        border: '1px solid rgba(255, 255, 255, 0.1)',  // 给所有颜���添加淡色边框
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

    // 创建自定���颜色���择器的包装器
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
    widthLabel.style.fontSize = '14px';
    widthLabel.style.margin = '12px 0 8px';
    widthSection.appendChild(widthLabel);

    const widthOptions = document.createElement('div');
    Object.assign(widthOptions.style, {
      display: 'flex',
      marginBottom: '12px',
      gap: '8px',
    });

    [2, 4, 6].forEach(width => {
      const option = document.createElement('div');
      Object.assign(option.style, {
        width: '32px',
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
        width: '16px',
        height: `${width}px`,
        backgroundColor: '#fff',
        borderRadius: `${width / 2}px`
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
    styleLabel.style.fontSize = '14px';
    styleLabel.style.marginBottom = '8px';
    styleSection.appendChild(styleLabel);

    const styleOptions = document.createElement('div');
    Object.assign(styleOptions.style, {
      display: 'flex',
      gap: '8px'
    });

    const styles = [
      {
        id: 'solid',
        preview: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" stroke-width="2"/>
        </svg>`
      },
      {
        id: 'dashed',
        preview: `<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" class="" fill="none" stroke-width="2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="2"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M5 12h2"></path><path d="M17 12h2"></path><path d="M11 12h2"></path></g></svg>`
      },
      {
        id: 'dotted',
        preview: `<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" class="" fill="none" stroke-width="2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="2"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M4 12v.01"></path><path d="M8 12v.01"></path><path d="M12 12v.01"></path><path d="M16 12v.01"></path><path d="M20 12v.01"></path></g></svg>`
      }
    ];

    styles.forEach(style => {
      const option = document.createElement('div');
      Object.assign(option.style, {
        width: '32px',
        height: '32px',
        backgroundColor: style.id === this.state.currentArrowStyle ? '#666' : '#3c3c3c',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      });

      // 使用 innerHTML 而不是 textContent
      option.innerHTML = style.preview;

      // 确保 SVG 继承父元素的颜色并设置正确的尺寸
      const svg = option.querySelector('svg');
      if (svg) {
        Object.assign(svg.style, {
          color: 'inherit',
          width: '20px',
          height: '20px'
        });
      }

      option.addEventListener('mouseover', () => {
        if (style.id !== this.state.currentArrowStyle) {
          option.style.backgroundColor = '#4c4c4c';
        }
      });

      option.addEventListener('mouseout', () => {
        if (style.id !== this.state.currentArrowStyle) {
          option.style.backgroundColor = '#3c3c3c';
        }
      });

      option.addEventListener('click', () => {
        this.state.currentArrowStyle = style.id;
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
    strokeLabel.style.fontSize = '14px';
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
    fillLabel.style.fontSize = '14px';
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
    widthLabel.style.fontSize = '14px';
    widthLabel.style.marginBottom = '8px';
    widthSection.appendChild(widthLabel);

    const widthOptions = document.createElement('div');
    Object.assign(widthOptions.style, {
      display: 'flex',
      gap: '8px'
    });

    [2, 4, 6].forEach(width => {
      const option = document.createElement('div');
      Object.assign(option.style, {
        width: '32px',
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
        width: '16px',
        height: `${width}px`,
        backgroundColor: '#fff',
        borderRadius: `${width / 2}px`
      });

      option.appendChild(line);
      option.addEventListener('click', () => {
        this.state.currentShapeWidth = width;
        // 只更新直接子元素的宽度选项背景色
        widthOptions.querySelectorAll(':scope > div').forEach(opt => {
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
    styleLabel.style.fontSize = '14px';
    styleSection.appendChild(styleLabel);

    const styleOptions = document.createElement('div');
    Object.assign(styleOptions.style, {
      display: 'flex',
      gap: '8px'
    });

    const styles = [
      {
        id: 'solid',
        preview: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" stroke-width="2"/>
        </svg>`
      },
      {
        id: 'dashed',
        preview: `<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" class="" fill="none" stroke-width="2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="2"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M5 12h2"></path><path d="M17 12h2"></path><path d="M11 12h2"></path></g></svg>`
      },
      {
        id: 'dotted',
        preview: `<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" class="" fill="none" stroke-width="2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="2"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M4 12v.01"></path><path d="M8 12v.01"></path><path d="M12 12v.01"></path><path d="M16 12v.01"></path><path d="M20 12v.01"></path></g></svg>`
      }
    ];

    styles.forEach(style => {
      const option = document.createElement('div');
      Object.assign(option.style, {
        width: '32px',
        height: '32px',
        backgroundColor: style.id === this.state.currentShapeStyle ? '#666' : '#3c3c3c',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      });

      // 设置 SVG 内容
      option.innerHTML = style.preview;

      // 确保 SVG 继承父元素的颜色
      const svg = option.querySelector('svg');
      if (svg) {
        Object.assign(svg.style, {
          color: 'inherit',
          width: '20px',
          height: '20px'
        });
      }

      option.addEventListener('mouseover', () => {
        if (style.id !== this.state.currentShapeStyle) {
          option.style.backgroundColor = '#4c4c4c';
        }
      });

      option.addEventListener('mouseout', () => {
        if (style.id !== this.state.currentShapeStyle) {
          option.style.backgroundColor = '#3c3c3c';
        }
      });

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

    // 只有当前工具是矩形时才添加边角样式部分
    if (this.state.currentTool === 'rectangle') {
      // 在描边宽度部分后面添加边角样式部分
      const cornerSection = document.createElement('div');
      cornerSection.className = 'shape-corner-section';
      cornerSection.style.marginTop = '12px';

      const cornerLabel = document.createElement('div');
      cornerLabel.textContent = '边角样式';
      cornerLabel.style.color = '#fff';
      cornerLabel.style.fontSize = '14px';
      cornerLabel.style.marginBottom = '8px';
      cornerSection.appendChild(cornerLabel);

      const cornerOptions = document.createElement('div');
      Object.assign(cornerOptions.style, {
        display: 'flex',
        gap: '8px'
      });

      const corners = [
        {
          id: 'sharp',
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" stroke-width="2"/>
          </svg>`,
          tooltip: '直角'
        },
        {
          id: 'round',
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16"><path fill="currentColor" d="M4 3.75C4 2.784 4.784 2 5.75 2h.75a.5.5 0 0 1 0 1h-.75a.75.75 0 0 0-.75.75v.75a.5.5 0 0 1-1 0zM8 2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5m5.25-.5c.966 0 1.75.784 1.75 1.75v.75a.5.5 0 0 1-1 0v-.75a.75.75 0 0 0-.75-.75h-.75a.5.5 0 0 1 0-1zM8 11.5a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 0-1h-2a.5.5 0 0 0-.5.5m-2.25.5A1.75 1.75 0 0 1 4 10.25V9.5a.5.5 0 0 1 1 0v.75c0 .414.336.75.75.75h.75a.5.5 0 0 1 0 1zM15 10.25A1.75 1.75 0 0 1 13.25 12h-.75a.5.5 0 0 1 0-1h.75a.75.75 0 0 0 .75-.75V9.5a.5.5 0 0 1 1 0zM4.5 6a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 1 0v-1a.5.5 0 0 0-.5-.5m9.5.5a.5.5 0 0 1 1 0v1a.5.5 0 0 1-1 0zM1 7.411a3.4 3.4 0 0 1 1-2.408v5.249c0 .908.323 1.74.86 2.388a3.74 3.74 0 0 0 2.89 1.361h3.84q.048 0 .094-.002H12a3.4 3.4 0 0 1-2.41 1.002H5.75A4.75 4.75 0 0 1 1 10.251z"/></svg>`,
          tooltip: '圆角'
        }
      ];

      corners.forEach(corner => {
        const option = document.createElement('div');
        Object.assign(option.style, {
          width: '32px',
          height: '32px',
          backgroundColor: corner.id === this.state.currentCornerStyle ? '#666' : '#3c3c3c',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff'
        });

        // 使用 innerHTML 设置 SVG 图标
        option.innerHTML = corner.icon;
        option.title = corner.tooltip;

        // 添加悬停效果
        option.addEventListener('mouseover', () => {
          if (corner.id !== this.state.currentCornerStyle) {
            option.style.backgroundColor = '#4c4c4c';
          }
        });

        option.addEventListener('mouseout', () => {
          if (corner.id !== this.state.currentCornerStyle) {
            option.style.backgroundColor = '#3c3c3c';
          }
        });

        option.addEventListener('click', () => {
          this.state.currentCornerStyle = corner.id;
          cornerOptions.querySelectorAll('div').forEach(opt => {
            opt.style.backgroundColor = '#3c3c3c';
          });
          option.style.backgroundColor = '#666';

          if (this.state.currentTool === 'rectangle') {
            this.initDrawingCanvas(this.state.currentTool);
          }
        });

        cornerOptions.appendChild(option);
      });

      cornerSection.appendChild(cornerOptions);
      panel.appendChild(cornerSection);
    }

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
  },

  // 更新工具状态的辅助方法
  updateToolState(toolId, updates) {
    switch (toolId) {
      case 'pen':
        this.state.currentPenColor = updates.color || this.state.currentPenColor;
        this.state.currentPenWidth = updates.width || this.state.currentPenWidth;
        break;
      case 'eraser':
        this.state.currentEraserWidth = updates.width || this.state.currentEraserWidth;
        break;
      case 'arrow':
        this.state.currentArrowColor = updates.color || this.state.currentArrowColor;
        this.state.currentArrowWidth = updates.width || this.state.currentArrowWidth;
        this.state.currentArrowStyle = updates.style || this.state.currentArrowStyle;
        break;
      case 'rectangle':
      case 'circle':
        this.state.currentShapeColor = updates.color || this.state.currentShapeColor;
        this.state.currentShapeWidth = updates.width || this.state.currentShapeWidth;
        this.state.currentShapeFillColor = updates.fillColor || this.state.currentShapeFillColor;
        this.state.currentShapeStyle = updates.style || this.state.currentShapeStyle;
        if (toolId === 'rectangle') {
          this.state.currentCornerStyle = updates.cornerStyle || this.state.currentCornerStyle;
        }
        break;
      case 'text':
        this.state.currentTextColor = updates.color || this.state.currentTextColor;
        this.state.currentFontSize = updates.fontSize || this.state.currentFontSize;
        this.state.currentFontFamily = updates.fontFamily || this.state.currentFontFamily;
        break;
    }

    // 如果当前工具激活，立即更新画布
    if (this.state.currentTool === toolId) {
      this.initDrawingCanvas(toolId);
    }
  },

  // 在 createShapeStylePanel 方法后添加文字样式面板创建方法
  createTextStylePanel() {
    const panel = document.createElement('div');
    panel.className = 'text-style-panel';
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

    // 1. 文字颜色部分
    const colorSection = document.createElement('div');
    colorSection.className = 'text-color-section';

    const colorLabel = document.createElement('div');
    colorLabel.textContent = '文字颜色';
    colorLabel.style.color = '#fff';
    colorLabel.style.fontSize = '14px';
    colorLabel.style.marginBottom = '8px';
    colorSection.appendChild(colorLabel);

    // 使用���用颜色选择器创建文字颜色选择器
    const colors = ['#ff0000', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3'];
    const colorPicker = this.createColorPicker(colors, 'currentTextColor');
    colorSection.appendChild(colorPicker);
    panel.appendChild(colorSection);

    // 2. 字体选择部分
    const fontSection = document.createElement('div');
    fontSection.className = 'text-font-section';
    fontSection.style.marginTop = '12px';

    const fontLabel = document.createElement('div');
    fontLabel.textContent = '字体';
    fontLabel.style.color = '#fff';
    fontLabel.style.fontSize = '14px';
    fontLabel.style.marginBottom = '8px';
    fontSection.appendChild(fontLabel);

    const fontSelect = document.createElement('div');
    Object.assign(fontSelect.style, {
      display: 'flex',
      gap: '4px'
    });

    // 确保字体已加载
    this.loadCustomFonts();

    this.state.availableFonts.forEach(font => {
      const option = document.createElement('div');
      Object.assign(option.style, {
        width: '32px',
        height: '32px',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: font.name === this.state.currentFontFamily ? '#666' : '#3c3c3c'
      });

      // 添��SVG图标,使用字体预览
      option.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
            font-family="${font.name}" fill="white" font-size="16">A</text>
          </svg>
      `;

      // 添加悬停提示
      option.title = font.label;

      option.addEventListener('mouseover', () => {
        if (font.name !== this.state.currentFontFamily) {
          option.style.backgroundColor = '#4c4c4c';
        }
      });

      option.addEventListener('mouseout', () => {
        if (font.name !== this.state.currentFontFamily) {
          option.style.backgroundColor = '#3c3c3c';
        }
      });

      option.addEventListener('click', () => {
        this.state.currentFontFamily = font.name;
        fontSelect.querySelectorAll('div').forEach(opt => {
          opt.style.backgroundColor = '#3c3c3c';
        });
        option.style.backgroundColor = '#666';

        if (this.state.currentTool === 'text') {
          this.initDrawingCanvas('text');
        }
      });

      fontSelect.appendChild(option);
    });

    fontSection.appendChild(fontSelect);
    panel.appendChild(fontSection);

    // 3. 字体大小部分
    const sizeSection = document.createElement('div');
    sizeSection.className = 'text-size-section';
    sizeSection.style.marginTop = '12px';

    const sizeLabel = document.createElement('div');
    sizeLabel.textContent = '字体大小';
    sizeLabel.style.color = '#fff';
    sizeLabel.style.fontSize = '14px';
    sizeLabel.style.marginBottom = '8px';
    sizeSection.appendChild(sizeLabel);

    const sizeOptions = document.createElement('div');
    Object.assign(sizeOptions.style, {
      display: 'flex',
      gap: '8px'
    });

    this.state.availableSizes.forEach(size => {
      const option = document.createElement('div');
      Object.assign(option.style, {
        width: '32px',
        height: '32px',
        backgroundColor: size.value === this.state.currentFontSize ? '#666' : '#3c3c3c',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '14px'
      });

      option.textContent = size.label;

      option.addEventListener('mouseover', () => {
        if (size.value !== this.state.currentFontSize) {
          option.style.backgroundColor = '#4c4c4c';
        }
      });

      option.addEventListener('mouseout', () => {
        if (size.value !== this.state.currentFontSize) {
          option.style.backgroundColor = '#3c3c3c';
        }
      });

      option.addEventListener('click', () => {
        this.state.currentFontSize = size.value;
        sizeOptions.querySelectorAll('div').forEach(opt => {
          opt.style.backgroundColor = '#3c3c3c';
        });
        option.style.backgroundColor = '#666';

        if (this.state.currentTool === 'text') {
          this.initDrawingCanvas('text');
        }
      });

      sizeOptions.appendChild(option);
    });

    sizeSection.appendChild(sizeOptions);
    panel.appendChild(sizeSection);

    return panel;
  },

  // 添加文字样式面板显示切换方法
  toggleTextStylePanel(show) {
    const panel = document.querySelector('.text-style-panel');
    if (panel) {
      panel.style.display = show ? 'block' : 'none';
    }
  },

  // 添加模糊设置面板
  createBlurSettingsPanel() {
    const panel = document.createElement('div');
    panel.className = 'blur-settings-panel';
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

    // 1. 模糊半径设置
    const radiusSection = document.createElement('div');
    const radiusLabel = document.createElement('div');
    radiusLabel.textContent = '模糊强度';
    radiusLabel.style.color = '#fff';
    radiusLabel.style.marginBottom = '8px';
    radiusSection.appendChild(radiusLabel);

    const radiusOptions = [5, 10, 15, 20];
    const radiusContainer = document.createElement('div');
    Object.assign(radiusContainer.style, {
      display: 'flex',
      gap: '8px'
    });

    radiusOptions.forEach(radius => {
      const option = document.createElement('div');
      Object.assign(option.style, {
        width: '32px',
        height: '32px',
        backgroundColor: radius === this.state.currentBlurRadius ? '#666' : '#3c3c3c',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      });

      option.textContent = radius;

      option.addEventListener('click', () => {
        this.state.currentBlurRadius = radius;
        radiusContainer.querySelectorAll('div').forEach(opt => {
          opt.style.backgroundColor = '#3c3c3c';
        });
        option.style.backgroundColor = '#666';
      });

      radiusContainer.appendChild(option);
    });

    radiusSection.appendChild(radiusContainer);
    panel.appendChild(radiusSection);

    // 2. 笔刷宽度设置
    const widthSection = document.createElement('div');
    widthSection.style.marginTop = '12px';

    const widthLabel = document.createElement('div');
    widthLabel.textContent = '笔刷宽度';
    widthLabel.style.color = '#fff';
    widthLabel.style.marginBottom = '8px';
    widthSection.appendChild(widthLabel);

    const widthOptions = [20, 30, 40, 50];
    const widthContainer = document.createElement('div');
    Object.assign(widthContainer.style, {
      display: 'flex',
      gap: '8px'
    });

    widthOptions.forEach(width => {
      const option = document.createElement('div');
      Object.assign(option.style, {
        width: '32px',
        height: '32px',
        backgroundColor: width === this.state.currentBlurWidth ? '#666' : '#3c3c3c',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      });

      option.textContent = width;

      option.addEventListener('click', () => {
        this.state.currentBlurWidth = width;
        widthContainer.querySelectorAll('div').forEach(opt => {
          opt.style.backgroundColor = '#3c3c3c';
        });
        option.style.backgroundColor = '#666';
      });

      widthContainer.appendChild(option);
    });

    widthSection.appendChild(widthContainer);
    panel.appendChild(widthSection);

    return panel;
  },

  // 添加模糊面板显示切换方法
  toggleBlurSettingsPanel(show) {
    const panel = document.querySelector('.blur-settings-panel');
    if (panel) {
      panel.style.display = show ? 'block' : 'none';
    }
  },

  // 添加模糊工具
  initBlurTool(canvas, ctx) {
    console.log('Initializing blur tool with canvas:', canvas);
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    // 创建临时画布用于存储原始图像
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // 创建模糊效果画布
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = canvas.width;
    blurCanvas.height = canvas.height;
    const blurCtx = blurCanvas.getContext('2d');

    const handleMouseDown = (e) => {
      console.log('Mouse down event triggered');
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;

      // 保存当前画布状态到临时画布
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(canvas, 0, 0);
    };

    const handleMouseMove = (e) => {
      if (!isDrawing) return;

      const rect = canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      // 清除模糊画布
      blurCtx.clearRect(0, 0, blurCanvas.width, blurCanvas.height);

      // 在模糊画布上绘制路径
      blurCtx.beginPath();
      blurCtx.moveTo(lastX, lastY);
      blurCtx.lineTo(currentX, currentY);
      blurCtx.lineWidth = this.state.currentBlurWidth;
      blurCtx.lineCap = 'round';
      blurCtx.strokeStyle = '#fff';
      blurCtx.stroke();

      // 清除主画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制原始图像
      ctx.drawImage(tempCanvas, 0, 0);

      // 使用模糊画布��为蒙版
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(blurCanvas, 0, 0);
      ctx.restore();

      // 绘制模糊效果
      ctx.save();
      ctx.filter = `blur(${this.state.currentBlurRadius}px)`;
      ctx.globalCompositeOperation = 'destination-over';
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();

      // 恢复未模糊的部分
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();

      lastX = currentX;
      lastY = currentY;
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
    canvas.addEventListener('mouseleave', handleMouseUp);

    canvas.blurToolListeners = {
      mousedown: handleMouseDown,
      mousemove: handleMouseMove,
      mouseup: handleMouseUp,
      mouseleave: handleMouseUp
    };
  },
};

function showToast(message) {
  const toast = document.createElement('div');
  Object.assign(toast.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: '14px',
    zIndex: '1000004',
    pointerEvents: 'none'
  });
  toast.textContent = message;
  document.body.appendChild(toast);

  // 2秒后移除提示
  setTimeout(() => {
    toast.remove();
  }, 1000);
}
