// 标注工具栏管理器
window.annotationToolbarManager = {
  init() {
    this.state = window.screenshotState;
    this.ui = window.screenshotUI;
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
      { id: 'rectangle', icon: '⬜', tooltip: '矩形', hasShapeStyle: true, hasCornerStyle: true }, // 添加 hasCornerStyle
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

        // 添加相应的面板
        if (tool.hasLineWidth) {
          const lineWidthPanel = this.createLineWidthPanel(tool.id);
          buttonContainer.appendChild(lineWidthPanel);
        }
        if (tool.hasArrowStyle) {
          const arrowStylePanel = this.createArrowStylePanel();
          buttonContainer.appendChild(arrowStylePanel);
        }
        if (tool.hasShapeStyle) {
          const shapeStylePanel = this.createShapeStylePanel();
          buttonContainer.appendChild(shapeStylePanel);
        }
        if (tool.hasCornerStyle) {
          const cornerStylePanel = this.createCornerStylePanel();
          buttonContainer.appendChild(cornerStylePanel);
        }
        
        toolbar.appendChild(buttonContainer);
      }
    });
    
    selection.appendChild(toolbar);
    this.setStyle(toolbar);
  },

  // ... 其他现有方法保持不变 ...

  createCornerStylePanel() {
    const panel = document.createElement('div');
    panel.className = 'corner-style-panel';
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

    const cornerLabel = document.createElement('div');
    cornerLabel.textContent = '边角样式';
    cornerLabel.style.color = '#fff';
    cornerLabel.style.marginBottom = '8px';
    panel.appendChild(cornerLabel);

    const cornerOptions = document.createElement('div');
    Object.assign(cornerOptions.style, {
      display: 'flex',
      justifyContent: 'space-between'
    });

    const cornerStyles = [
      { id: 'sharp', label: '直角', preview: '▢' },
      { id: 'rounded', label: '圆角', preview: '⬭' }
    ];

    cornerStyles.forEach(style => {
      const option = document.createElement('div');
      Object.assign(option.style, {
        width: '80px',
        height: '32px',
        backgroundColor: style.id === this.state.currentCornerStyle ? '#666' : '#3c3c3c',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '20px'
      });

      option.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <span style="font-size: 20px;">${style.preview}</span>
          <span style="font-size: 12px; margin-top: 2px;">${style.label}</span>
        </div>
      `;

      option.addEventListener('click', () => {
        this.state.currentCornerStyle = style.id;
        cornerOptions.querySelectorAll('div').forEach(opt => {
          opt.style.backgroundColor = '#3c3c3c';
        });
        option.style.backgroundColor = '#666';
      });

      cornerOptions.appendChild(option);
    });

    panel.appendChild(cornerOptions);
    return panel;
  },

  handleToolClick(toolId) {
    console.log('Tool clicked:', toolId);
    const selection = document.querySelector('.selected-element');
    
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
        
        // 重新创建形状样式面板以更新边角样式选项
        const shapeStylePanel = document.querySelector('.shape-style-panel');
        if (shapeStylePanel) {
          const newPanel = this.createShapeStylePanel();
          shapeStylePanel.parentNode.replaceChild(newPanel, shapeStylePanel);
          newPanel.style.display = 'block';
        }
      }
    } else {
      // 其他工具：隐藏所有面板
      ['pen', 'eraser'].forEach(t => this.toggleLineWidthPanel(false, t));
      this.toggleArrowStylePanel(false);
      this.toggleShapeStylePanel(false);
    }

    // 触发工具变化事件
    const toolChangeEvent = new CustomEvent('toolchange', {
      detail: { tool: toolId }
    });
    selection.dispatchEvent(toolChangeEvent);
  },

  toggleCornerStylePanel(show) {
    const panel = document.querySelector('.corner-style-panel');
    if (panel) {
      panel.style.display = show ? 'block' : 'none';
      this.state.isCornerStylePanelVisible = show;
    }
  },

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
      });

      styleOptions.appendChild(option);
    });

    styleSection.appendChild(styleOptions);
    panel.appendChild(styleSection);

    // 5. 添加边角样式部分（仅对矩形工具显示）
    if (this.state.currentTool === 'rectangle') {
      const cornerSection = document.createElement('div');
      cornerSection.className = 'shape-corner-section';
      cornerSection.style.marginTop = '12px';
      
      const cornerLabel = document.createElement('div');
      cornerLabel.textContent = '边角样式';
      cornerLabel.style.color = '#fff';
      cornerLabel.style.marginBottom = '8px';
      cornerSection.appendChild(cornerLabel);

      const cornerOptions = document.createElement('div');
      Object.assign(cornerOptions.style, {
        display: 'flex',
        justifyContent: 'space-between'
      });

      const cornerStyles = [
        { id: 'sharp', label: '直角', preview: '▢' },
        { id: 'rounded', label: '圆角', preview: '⬭' }
      ];

      cornerStyles.forEach(style => {
        const option = document.createElement('div');
        Object.assign(option.style, {
          width: '80px',
          height: '32px',
          backgroundColor: style.id === this.state.currentCornerStyle ? '#666' : '#3c3c3c',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff'
        });

        option.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <span style="font-size: 20px;">${style.preview}</span>
            <span style="font-size: 12px; margin-top: 2px;">${style.label}</span>
          </div>
        `;

        option.addEventListener('click', () => {
          this.state.currentCornerStyle = style.id;
          cornerOptions.querySelectorAll('div').forEach(opt => {
            opt.style.backgroundColor = '#3c3c3c';
          });
          option.style.backgroundColor = '#666';
        });

        cornerOptions.appendChild(option);
      });

      cornerSection.appendChild(cornerOptions);
      panel.appendChild(cornerSection);
    }

    return panel;
  }
}; 
