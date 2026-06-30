(() => {
  'use strict';

  const APP_VERSION = '1.0.0';
  const STORAGE_KEY = 'photoprint-studio-pro:v1';
  const MAX_HISTORY = 20;
  const CSS_PX_PER_INCH = 96;
  const MM_PER_INCH = 25.4;
  const DEFAULT_DPI = 300;

  const passportPresets = {
    indian: { id: 'indian', name: 'Indian Passport', width: 35, height: 45, unit: 'mm' },
    us: { id: 'us', name: 'US Passport', width: 2, height: 2, unit: 'in' },
    visa: { id: 'visa', name: 'Visa', width: 35, height: 45, unit: 'mm' },
    id: { id: 'id', name: 'ID Card', width: 54, height: 86, unit: 'mm' },
    stamp: { id: 'stamp', name: 'Stamp Size', width: 22, height: 22, unit: 'mm' },
    custom: { id: 'custom', name: 'Custom', width: 35, height: 45, unit: 'mm' }
  };

  const paperSizes = {
    photo_4x6: { id: 'photo_4x6', name: '4×6 (4R)', width: 4, height: 6, unit: 'in' },
    photo_5x7: { id: 'photo_5x7', name: '5×7', width: 5, height: 7, unit: 'in' },
    photo_6x8: { id: 'photo_6x8', name: '6×8', width: 6, height: 8, unit: 'in' },
    photo_8x10: { id: 'photo_8x10', name: '8×10', width: 8, height: 10, unit: 'in' },
    a5: { id: 'a5', name: 'A5', width: 148, height: 210, unit: 'mm' },
    a4: { id: 'a4', name: 'A4', width: 210, height: 297, unit: 'mm' },
    a3: { id: 'a3', name: 'A3', width: 297, height: 420, unit: 'mm' },
    a2: { id: 'a2', name: 'A2', width: 420, height: 594, unit: 'mm' },
    a1: { id: 'a1', name: 'A1', width: 594, height: 841, unit: 'mm' },
    letter: { id: 'letter', name: 'Letter', width: 8.5, height: 11, unit: 'in' },
    legal: { id: 'legal', name: 'Legal', width: 8.5, height: 14, unit: 'in' },
    tabloid: { id: 'tabloid', name: 'Tabloid', width: 11, height: 17, unit: 'in' },
    executive: { id: 'executive', name: 'Executive', width: 7.25, height: 10.5, unit: 'in' },
    custom: { id: 'custom', name: 'Custom', width: 210, height: 297, unit: 'mm' }
  };

  const defaultSettings = {
    theme: 'system',
    language: 'en',
    measurementUnit: 'mm',
    defaultPaperSize: 'a4',
    defaultPassportSize: 'indian',
    defaultGap: 4,
    defaultMargin: 6,
    defaultPadding: 2,
    gapX: 4,
    gapY: 4,
    margin: 6,
    safeMargin: 5,
    cutMargin: 3,
    layoutMode: 'auto',
    autoCenter: true,
    autoFill: true,
    equalSpacing: true,
    snapGrid: true,
    highDpi: true,
    dpi: DEFAULT_DPI,
    quality: 0.95,
    showRulers: true,
    showBoundary: true,
    showCutMarks: true,
    showBleed: false,
    showCropMarks: true,
    highContrast: false,
    autosave: true,
    animations: true,
    paperWidth: 210,
    paperHeight: 297,
    paperUnit: 'mm',
    pageRotation: 'portrait',
    exportFormat: 'pdf',
    defaultBorder: 0,
    defaultBorderColor: '#ffffff',
    defaultRounded: 0,
    defaultBackground: '#ffffff'
  };

  const state = {
    settings: loadStoredState()?.settings || { ...defaultSettings },
    customPresets: loadStoredState()?.customPresets || [],
    images: loadStoredState()?.images || [],
    selectedIds: new Set(loadStoredState()?.selectedIds || []),
    currentPageIndex: loadStoredState()?.currentPageIndex || 0,
    zoom: 100,
    clipboard: null,
    history: [],
    future: [],
    previewPages: [],
    renderQueued: false,
    dragging: null,
    modalResolve: null,
    activeTheme: 'system'
  };

  const els = {};
  const canvas = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheElements();
    mergeCustomPresets();
    populateSelects();
    bindEvents();
    hydrateForm();
    applyTheme();
    applyHighContrast();
    syncUiFromState();
    scheduleRender('init');
    showToast('Ready', 'PhotoPrint Studio Pro is running entirely in the browser.', 'success');
  }

  function cacheElements() {
    const ids = [
      'themeToggle', 'clearAllBtn', 'selectAllBtn', 'generateLayoutBtn', 'fileInput', 'imageList', 'imageCountLabel',
      'previewViewport', 'previewCanvasWrap', 'sheetCanvas', 'interactionLayer', 'rulerX', 'rulerY', 'previewMeta',
      'pageIndicator', 'resolutionLabel', 'pageSizeLabel', 'safetyLabel', 'prevPageBtn', 'nextPageBtn',
      'showRulersToggle', 'showBoundaryToggle', 'showCutMarksToggle', 'showBleedToggle', 'showCropMarksToggle',
      'passportPresetSelect', 'paperSizeSelect', 'paperWidthInput', 'paperHeightInput', 'measurementUnitSelect',
      'layoutModeSelect', 'gapXInput', 'gapYInput', 'defaultMarginInput', 'defaultPaddingInput', 'safeMarginInput',
      'cutMarginInput', 'autoCenterToggle', 'autoFillToggle', 'equalSpacingToggle', 'snapGridToggle', 'highDpiToggle',
      'dpiSelect', 'qualitySelect', 'exportPngBtn', 'exportJpegBtn', 'exportPdfBtn', 'exportSvgBtn',
      'languageSelect', 'themeSelect', 'defaultPaperSizeSelect', 'defaultPassportSizeSelect', 'defaultGapInput',
      'defaultPageMarginInput', 'autosaveToggle', 'animationsToggle', 'highContrastToggle', 'resetSettingsBtn',
      'printGuideBtn', 'savePresetBtn', 'printBtn', 'toastHost', 'modalBackdrop', 'modalTitle', 'modalText', 'modalInput',
      'modalCancelBtn', 'modalConfirmBtn'
    ];
    ids.forEach((id) => { els[id] = document.getElementById(id); });
    canvas.sheet = els.sheetCanvas;
    canvas.rulerX = els.rulerX;
    canvas.rulerY = els.rulerY;
    canvas.sheetCtx = canvas.sheet.getContext('2d');
    canvas.rulerXCtx = canvas.rulerX.getContext('2d');
    canvas.rulerYCtx = canvas.rulerY.getContext('2d');
  }

  function populateSelects() {
    fillSelect(els.passportPresetSelect, passportPresets, state.settings.defaultPassportSize);
    fillSelect(els.defaultPassportSizeSelect, passportPresets, state.settings.defaultPassportSize);
    fillSelect(els.paperSizeSelect, paperSizes, state.settings.defaultPaperSize);
    fillSelect(els.defaultPaperSizeSelect, paperSizes, state.settings.defaultPaperSize);
  }

  function mergeCustomPresets() {
    state.customPresets.forEach((preset) => {
      passportPresets[preset.id] = preset;
    });
  }

  function fillSelect(select, source, selectedId) {
    if (!select) return;
    select.innerHTML = '';
    Object.values(source).forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name;
      if (item.id === selectedId) option.selected = true;
      select.appendChild(option);
    });
  }

  function bindEvents() {
    els.themeToggle.addEventListener('click', toggleTheme);
    els.paperSizeSelect.addEventListener('change', () => {
      const paper = paperSizes[els.paperSizeSelect.value];
      if (paper) {
        state.settings.defaultPaperSize = paper.id;
        setPaperSizeFromPreset(paper.id);
        persist();
        scheduleRender('paper-size');
      }
    });

    els.passportPresetSelect.addEventListener('change', () => {
      const preset = passportPresets[els.passportPresetSelect.value];
      if (!preset) return;
      state.settings.defaultPassportSize = preset.id;
      if (state.images.length) {
        state.images.forEach((img) => {
          img.width = preset.width;
          img.height = preset.height;
          img.unit = preset.unit;
          normalizeImageAspect(img);
        });
        pushHistory('preset-change');
        syncUiFromState();
        scheduleRender('preset-change');
      }
      persist();
    });

    els.fileInput.addEventListener('change', (event) => handleFiles(event.target.files));
    els.uploadZone = document.getElementById('uploadZone');
    setupDropZone(els.uploadZone);

    els.clearAllBtn.addEventListener('click', clearAllImages);
    els.selectAllBtn.addEventListener('click', selectAllImages);
    els.generateLayoutBtn.addEventListener('click', () => {
      scheduleRender('generate-layout');
      showToast('Layout Generated', 'Photos were packed to maximize the current page.', 'success');
    });

    els.prevPageBtn.addEventListener('click', () => movePage(-1));
    els.nextPageBtn.addEventListener('click', () => movePage(1));

    document.querySelectorAll('.zoom-btn').forEach((button) => {
      button.addEventListener('click', () => setZoom(button.dataset.zoom));
    });

    ['showRulersToggle', 'showBoundaryToggle', 'showCutMarksToggle', 'showBleedToggle', 'showCropMarksToggle']
      .forEach((id) => {
        els[id].addEventListener('change', () => {
          const map = {
            showRulersToggle: 'showRulers',
            showBoundaryToggle: 'showBoundary',
            showCutMarksToggle: 'showCutMarks',
            showBleedToggle: 'showBleed',
            showCropMarksToggle: 'showCropMarks'
          };
          state.settings[map[id]] = els[id].checked;
          persist();
          scheduleRender(id);
        });
      });

    els.measurementUnitSelect.addEventListener('change', () => {
      state.settings.measurementUnit = els.measurementUnitSelect.value;
      syncUiFromState();
      persist();
      scheduleRender('unit');
    });

    els.layoutModeSelect.addEventListener('change', () => {
      state.settings.layoutMode = els.layoutModeSelect.value;
      persist();
      scheduleRender('layout-mode');
    });

    ['gapXInput', 'gapYInput', 'defaultMarginInput', 'defaultPaddingInput', 'safeMarginInput', 'cutMarginInput', 'paperWidthInput', 'paperHeightInput', 'defaultGapInput', 'defaultPageMarginInput']
      .forEach((id) => {
        els[id].addEventListener('input', () => {
          updateSettingsFromForm();
          persist();
          scheduleRender(id);
        });
      });

    ['autoCenterToggle', 'autoFillToggle', 'equalSpacingToggle', 'snapGridToggle', 'highDpiToggle', 'autosaveToggle', 'animationsToggle', 'highContrastToggle']
      .forEach((id) => {
        els[id].addEventListener('change', () => {
          updateSettingsFromForm();
          persist();
          applyHighContrast();
          scheduleRender(id);
        });
      });

    els.dpiSelect.addEventListener('change', () => {
      state.settings.dpi = Number(els.dpiSelect.value);
      persist();
      scheduleRender('dpi');
    });

    els.qualitySelect.addEventListener('change', () => {
      state.settings.quality = Number(els.qualitySelect.value);
      persist();
    });

    els.languageSelect.addEventListener('change', () => {
      state.settings.language = els.languageSelect.value;
      persist();
    });

    els.themeSelect.addEventListener('change', () => {
      state.settings.theme = els.themeSelect.value;
      applyTheme();
      persist();
      scheduleRender('theme');
    });

    els.defaultPaperSizeSelect.addEventListener('change', () => {
      state.settings.defaultPaperSize = els.defaultPaperSizeSelect.value;
      setPaperSizeFromPreset(state.settings.defaultPaperSize);
      persist();
      scheduleRender('default-paper');
    });

    els.defaultPassportSizeSelect.addEventListener('change', () => {
      state.settings.defaultPassportSize = els.defaultPassportSizeSelect.value;
      const preset = passportPresets[state.settings.defaultPassportSize];
      if (preset) {
        state.images.forEach((img) => {
          if (!img.width || !img.height) {
            img.width = preset.width;
            img.height = preset.height;
            img.unit = preset.unit;
          }
        });
      }
      persist();
      scheduleRender('default-passport');
    });

    els.resetSettingsBtn.addEventListener('click', resetSettings);
    els.savePresetBtn.addEventListener('click', openPresetModal);
    els.printGuideBtn.addEventListener('click', () => document.querySelector('.print-guide').scrollIntoView({ behavior: 'smooth', block: 'start' }));
    els.printBtn.addEventListener('click', printSheet);

    els.exportPngBtn.addEventListener('click', () => exportImage('png'));
    els.exportJpegBtn.addEventListener('click', () => exportImage('jpeg'));
    els.exportPdfBtn.addEventListener('click', exportPdf);
    els.exportSvgBtn.addEventListener('click', exportSvg);

    els.modalCancelBtn.addEventListener('click', closePresetModal);
    els.modalConfirmBtn.addEventListener('click', savePresetFromModal);
    els.modalBackdrop.addEventListener('click', (event) => {
      if (event.target === els.modalBackdrop) closePresetModal();
    });

    document.querySelectorAll('.nav-pill').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.nav-pill').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        const target = button.dataset.navTarget;
        if (target === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
        if (target === 'preview') els.previewViewport.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (target === 'settings') document.getElementById('settings').scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (target === 'help') document.getElementById('help').scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (target === 'about') document.getElementById('about').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    document.addEventListener('paste', handlePaste);
    document.addEventListener('keydown', handleKeyboardShortcuts);
    window.addEventListener('resize', scheduleRender);
    window.addEventListener('beforeunload', persist);
    els.previewViewport.addEventListener('scroll', () => renderRulers());
    els.previewViewport.addEventListener('pointerdown', handlePreviewPointerDown);
    els.previewViewport.addEventListener('pointermove', handlePreviewPointerMove);
    els.previewViewport.addEventListener('pointerup', handlePreviewPointerUp);
    els.previewViewport.addEventListener('pointercancel', handlePreviewPointerUp);
  }

  function setupDropZone(dropZone) {
    if (!dropZone) return;
    ['dragenter', 'dragover'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropZone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropZone.classList.remove('dragover');
      });
    });
    dropZone.addEventListener('drop', (event) => handleFiles(event.dataTransfer.files));
  }

  function hydrateForm() {
    setPaperSizeFromPreset(state.settings.defaultPaperSize);
    Object.keys(state.settings).forEach((key) => {
      if (key in defaultSettings) {
        state.settings[key] = state.settings[key] ?? defaultSettings[key];
      }
    });
    if (!state.settings.dpi) state.settings.dpi = DEFAULT_DPI;
    state.activeTheme = state.settings.theme;
  }

  function syncUiFromState() {
    els.themeSelect.value = state.settings.theme;
    els.measurementUnitSelect.value = state.settings.measurementUnit;
    els.defaultPaperSizeSelect.value = state.settings.defaultPaperSize;
    els.defaultPassportSizeSelect.value = state.settings.defaultPassportSize;
    els.paperSizeSelect.value = state.settings.defaultPaperSize;
    els.passportPresetSelect.value = state.settings.defaultPassportSize;
    els.layoutModeSelect.value = state.settings.layoutMode;
    els.gapXInput.value = state.settings.gapX;
    els.gapYInput.value = state.settings.gapY;
    els.defaultMarginInput.value = state.settings.margin;
    els.defaultPaddingInput.value = state.settings.defaultPadding;
    els.safeMarginInput.value = state.settings.safeMargin;
    els.cutMarginInput.value = state.settings.cutMargin;
    els.autoCenterToggle.checked = state.settings.autoCenter;
    els.autoFillToggle.checked = state.settings.autoFill;
    els.equalSpacingToggle.checked = state.settings.equalSpacing;
    els.snapGridToggle.checked = state.settings.snapGrid;
    els.highDpiToggle.checked = state.settings.highDpi;
    els.dpiSelect.value = String(state.settings.dpi);
    els.qualitySelect.value = String(state.settings.quality);
    els.languageSelect.value = state.settings.language;
    els.autosaveToggle.checked = state.settings.autosave;
    els.animationsToggle.checked = state.settings.animations;
    els.highContrastToggle.checked = state.settings.highContrast;
    els.showRulersToggle.checked = state.settings.showRulers;
    els.showBoundaryToggle.checked = state.settings.showBoundary;
    els.showCutMarksToggle.checked = state.settings.showCutMarks;
    els.showBleedToggle.checked = state.settings.showBleed;
    els.showCropMarksToggle.checked = state.settings.showCropMarks;
    els.paperWidthInput.value = numberFormat(settingsToUnit(state.settings.paperWidth, state.settings.paperUnit, state.settings.measurementUnit));
    els.paperHeightInput.value = numberFormat(settingsToUnit(state.settings.paperHeight, state.settings.paperUnit, state.settings.measurementUnit));
    els.defaultGapInput.value = state.settings.defaultGap;
    els.defaultPageMarginInput.value = state.settings.defaultMargin;
    updateMetaLabels();
    renderImageList();
  }

  function updateSettingsFromForm() {
    state.settings.measurementUnit = els.measurementUnitSelect.value;
    state.settings.layoutMode = els.layoutModeSelect.value;
    state.settings.gapX = parseNumber(els.gapXInput.value, state.settings.gapX);
    state.settings.gapY = parseNumber(els.gapYInput.value, state.settings.gapY);
    state.settings.margin = parseNumber(els.defaultMarginInput.value, state.settings.margin);
    state.settings.defaultPadding = parseNumber(els.defaultPaddingInput.value, state.settings.defaultPadding);
    state.settings.safeMargin = parseNumber(els.safeMarginInput.value, state.settings.safeMargin);
    state.settings.cutMargin = parseNumber(els.cutMarginInput.value, state.settings.cutMargin);
    state.settings.autoCenter = els.autoCenterToggle.checked;
    state.settings.autoFill = els.autoFillToggle.checked;
    state.settings.equalSpacing = els.equalSpacingToggle.checked;
    state.settings.snapGrid = els.snapGridToggle.checked;
    state.settings.highDpi = els.highDpiToggle.checked;
    state.settings.autosave = els.autosaveToggle.checked;
    state.settings.animations = els.animationsToggle.checked;
    state.settings.highContrast = els.highContrastToggle.checked;
    state.settings.dpi = Number(els.dpiSelect.value);
    state.settings.quality = Number(els.qualitySelect.value);
    state.settings.language = els.languageSelect.value;
    state.settings.theme = els.themeSelect.value;
    state.settings.defaultPaperSize = els.defaultPaperSizeSelect.value;
    state.settings.defaultPassportSize = els.defaultPassportSizeSelect.value;
    state.settings.defaultGap = parseNumber(els.defaultGapInput.value, state.settings.defaultGap);
    state.settings.defaultMargin = parseNumber(els.defaultPageMarginInput.value, state.settings.defaultMargin);
    const paper = paperSizes[state.settings.defaultPaperSize] || paperSizes.a4;
    state.settings.paperUnit = paper.unit;
    state.settings.paperWidth = paper.width;
    state.settings.paperHeight = paper.height;
    state.settings.pageRotation = 'portrait';
  }

  function resetSettings() {
    state.settings = { ...defaultSettings };
    state.settings.paperWidth = paperSizes[state.settings.defaultPaperSize].width;
    state.settings.paperHeight = paperSizes[state.settings.defaultPaperSize].height;
    state.settings.paperUnit = paperSizes[state.settings.defaultPaperSize].unit;
    syncUiFromState();
    applyTheme();
    applyHighContrast();
    persist();
    scheduleRender('reset-settings');
    showToast('Settings Reset', 'Preferences returned to their default values.', 'success');
  }

  function setPaperSizeFromPreset(paperId) {
    const preset = paperSizes[paperId];
    if (!preset) return;
    state.settings.paperUnit = preset.unit;
    state.settings.paperWidth = preset.width;
    state.settings.paperHeight = preset.height;
    els.paperWidthInput.value = numberFormat(settingsToUnit(preset.width, preset.unit, state.settings.measurementUnit));
    els.paperHeightInput.value = numberFormat(settingsToUnit(preset.height, preset.unit, state.settings.measurementUnit));
    updateMetaLabels();
  }

  function toggleTheme() {
    const current = state.settings.theme;
    state.settings.theme = current === 'dark' ? 'light' : 'dark';
    els.themeSelect.value = state.settings.theme;
    applyTheme();
    persist();
    scheduleRender('theme-toggle');
  }

  function applyTheme() {
    const theme = state.settings.theme;
    let effective = theme;
    if (theme === 'system') {
      effective = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.dataset.theme = effective;
    state.activeTheme = effective;
  }

  function applyHighContrast() {
    document.body.classList.toggle('high-contrast', state.settings.highContrast);
  }

  function handleFiles(fileList) {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/') || /\.(heic|heif|bmp)$/i.test(file.name));
    if (!files.length) return;
    files.forEach((file) => loadFile(file));
    showToast('Image Uploaded', `${files.length} image${files.length > 1 ? 's' : ''} added to the project.`, 'success');
  }

  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const preset = passportPresets[state.settings.defaultPassportSize] || passportPresets.indian;
        state.images.unshift({
          id: cryptoId(),
          fileName: file.name.replace(/\.[^.]+$/, '') || file.name,
          originalName: file.name,
          dataUrl: reader.result,
          sourceImage: image,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          width: preset.width,
          height: preset.height,
          unit: preset.unit,
          copies: 1,
          aspectLocked: true,
          border: state.settings.defaultBorder,
          borderColor: state.settings.defaultBorderColor,
          rounded: state.settings.defaultRounded,
          backgroundColor: state.settings.defaultBackground,
          padding: state.settings.defaultPadding,
          margin: state.settings.defaultMargin,
          rotation: 0,
          opacity: 1,
          shadow: true,
          brightness: 0,
          contrast: 0,
          saturation: 0,
          sharpness: 0,
          grayscale: 0,
          sepia: 0,
          flipH: false,
          flipV: false,
          manualX: null,
          manualY: null,
          selected: false,
          renderCache: null
        });
        pushHistory('upload');
        syncUiFromState();
        scheduleRender('file-loaded');
        persist();
      };
      image.onerror = () => showToast('Unsupported File', `Could not load ${file.name}.`, 'error');
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function handlePaste(event) {
    const items = event.clipboardData?.items ? Array.from(event.clipboardData.items) : [];
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        handleFiles([file]);
        event.preventDefault();
        return;
      }
    }
    if (state.clipboard?.images?.length) {
      event.preventDefault();
      pasteClipboardImages();
    }
  }

  function handleKeyboardShortcuts(event) {
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      selectAllImages();
    }
    if (mod && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      duplicateSelectedImages();
    }
    if (mod && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      copySelectedImages();
    }
    if (mod && event.key.toLowerCase() === 'v' && !event.shiftKey) {
      if (state.clipboard?.images?.length) {
        event.preventDefault();
        pasteClipboardImages();
      }
    }
    if (mod && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
    }
    if (mod && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redo();
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      deleteSelectedImages();
    }
    if (mod && event.key === 'p') {
      event.preventDefault();
      printSheet();
    }
    if (event.key === 'Escape') {
      state.selectedIds.clear();
      renderImageList();
      scheduleRender('escape');
    }
  }

  function selectAllImages() {
    state.selectedIds = new Set(state.images.map((image) => image.id));
    renderImageList();
    scheduleRender('select-all');
  }

  function clearAllImages() {
    if (!state.images.length) return;
    pushHistory('clear');
    state.images = [];
    state.selectedIds.clear();
    state.currentPageIndex = 0;
    renderImageList();
    scheduleRender('clear-all');
    persist();
    showToast('Image Deleted', 'All uploaded images were removed.', 'success');
  }

  function deleteSelectedImages() {
    if (!state.selectedIds.size) return;
    pushHistory('delete');
    state.images = state.images.filter((image) => !state.selectedIds.has(image.id));
    state.selectedIds.clear();
    renderImageList();
    scheduleRender('delete');
    persist();
    showToast('Image Deleted', 'Selected photos were removed.', 'success');
  }

  function duplicateSelectedImages() {
    if (!state.selectedIds.size) return;
    pushHistory('duplicate');
    const copies = state.images.filter((image) => state.selectedIds.has(image.id)).map((image) => ({
      ...deepClone(image),
      id: cryptoId(),
      fileName: `${image.fileName}-copy`,
      selected: true
    }));
    state.images = [...copies, ...state.images];
    state.selectedIds = new Set(copies.map((copy) => copy.id));
    renderImageList();
    scheduleRender('duplicate');
    persist();
    showToast('Image Duplicated', `${copies.length} image${copies.length > 1 ? 's were' : ' was'} duplicated.`, 'success');
  }

  function copySelectedImages() {
    const payload = state.images.filter((image) => state.selectedIds.has(image.id)).map((image) => deepClone(image));
    if (!payload.length) return;
    state.clipboard = { images: payload };
    showToast('Copied', `${payload.length} image${payload.length > 1 ? 's' : ''} copied to clipboard buffer.`, 'success');
  }

  function pasteClipboardImages() {
    if (!state.clipboard?.images?.length) return;
    pushHistory('paste');
    const pasted = state.clipboard.images.map((image) => ({
      ...deepClone(image),
      id: cryptoId(),
      fileName: `${image.fileName}-paste`,
      manualX: image.manualX == null ? null : image.manualX + 10,
      manualY: image.manualY == null ? null : image.manualY + 10,
      selected: true
    }));
    state.images = [...pasted, ...state.images];
    state.selectedIds = new Set(pasted.map((image) => image.id));
    renderImageList();
    scheduleRender('paste');
    persist();
    showToast('Pasted', `${pasted.length} image${pasted.length > 1 ? 's' : ''} pasted.`, 'success');
  }

  function renderImageList() {
    els.imageList.innerHTML = '';
    els.imageCountLabel.textContent = `${state.images.length} image${state.images.length === 1 ? '' : 's'}`;
    if (!state.images.length) {
      const empty = document.createElement('div');
      empty.className = 'panel-section';
      empty.textContent = 'No photos uploaded yet.';
      els.imageList.appendChild(empty);
      return;
    }

    state.images.forEach((image, index) => {
      const card = document.createElement('article');
      card.className = `image-card${state.selectedIds.has(image.id) ? ' selected' : ''}`;
      card.dataset.id = image.id;
      card.tabIndex = 0;
      card.setAttribute('aria-label', `Image card ${image.fileName}`);

      const header = document.createElement('div');
      header.className = 'card-header';
      header.innerHTML = `
        <img class="thumb" src="${image.dataUrl}" alt="${escapeHtml(image.fileName)} preview" />
        <div>
          <div class="card-title-row">
            <input class="inline-name" data-field="fileName" data-id="${image.id}" value="${escapeHtmlAttr(image.fileName)}" aria-label="Rename image" />
          </div>
          <div class="help-copy"><p>${escapeHtml(image.originalName || image.fileName)}</p></div>
        </div>
        <button class="ghost-button remove-btn" data-action="delete" data-id="${image.id}" type="button">Delete</button>
      `;
      card.appendChild(header);

      const actions = document.createElement('div');
      actions.className = 'mini-actions';
      actions.innerHTML = `
        <button data-action="duplicate" data-id="${image.id}" type="button">Duplicate</button>
        <button data-action="rotate-left" data-id="${image.id}" type="button">⟲</button>
        <button data-action="rotate-right" data-id="${image.id}" type="button">⟳</button>
        <button data-action="reset" data-id="${image.id}" type="button">Reset</button>
        <button data-action="flip-h" data-id="${image.id}" type="button">Flip H</button>
        <button data-action="flip-v" data-id="${image.id}" type="button">Flip V</button>
        <button data-action="select" data-id="${image.id}" type="button">Select</button>
        <button data-action="copy" data-id="${image.id}" type="button">Copy</button>
      `;
      card.appendChild(actions);

      const form = document.createElement('div');
      form.className = 'form-grid two-col';
      form.innerHTML = `
        <label><span>Copies</span><input type="number" min="1" step="1" data-field="copies" data-id="${image.id}" value="${image.copies}" /></label>
        <label><span>Width</span><input type="number" min="1" step="0.1" data-field="width" data-id="${image.id}" value="${image.width}" /></label>
        <label><span>Height</span><input type="number" min="1" step="0.1" data-field="height" data-id="${image.id}" value="${image.height}" /></label>
        <label><span>Units</span>
          <select data-field="unit" data-id="${image.id}">
            <option value="mm" ${image.unit === 'mm' ? 'selected' : ''}>Millimeters</option>
            <option value="cm" ${image.unit === 'cm' ? 'selected' : ''}>Centimeters</option>
            <option value="in" ${image.unit === 'in' ? 'selected' : ''}>Inches</option>
            <option value="px" ${image.unit === 'px' ? 'selected' : ''}>Pixels</option>
          </select>
        </label>
      `;
      card.appendChild(form);

      const switches = document.createElement('div');
      switches.className = 'inline-switches';
      switches.innerHTML = `
        <label><input type="checkbox" data-field="aspectLocked" data-id="${image.id}" ${image.aspectLocked ? 'checked' : ''} /> Lock Aspect Ratio</label>
        <label><input type="checkbox" data-field="shadow" data-id="${image.id}" ${image.shadow ? 'checked' : ''} /> Shadow</label>
      `;
      card.appendChild(switches);

      const advanced = document.createElement('div');
      advanced.className = 'form-grid two-col';
      advanced.innerHTML = `
        <label><span>Border</span><input type="number" min="0" step="0.1" data-field="border" data-id="${image.id}" value="${image.border}" /></label>
        <label><span>Border Color</span><input type="color" data-field="borderColor" data-id="${image.id}" value="${image.borderColor}" /></label>
        <label><span>Rounded Corners</span><input type="number" min="0" step="0.5" data-field="rounded" data-id="${image.id}" value="${image.rounded}" /></label>
        <label><span>Background</span><input type="color" data-field="backgroundColor" data-id="${image.id}" value="${image.backgroundColor}" /></label>
        <label><span>Padding</span><input type="number" min="0" step="0.1" data-field="padding" data-id="${image.id}" value="${image.padding}" /></label>
        <label><span>Margin</span><input type="number" min="0" step="0.1" data-field="margin" data-id="${image.id}" value="${image.margin}" /></label>
        <label><span>Rotation</span><input type="number" min="-360" max="360" step="1" data-field="rotation" data-id="${image.id}" value="${image.rotation}" /></label>
        <label><span>Opacity</span><input type="range" min="0.1" max="1" step="0.01" data-field="opacity" data-id="${image.id}" value="${image.opacity}" /></label>
      `;
      card.appendChild(advanced);

      const sliders = document.createElement('div');
      sliders.className = 'form-grid';
      sliders.innerHTML = `
        <label><span>Brightness</span><input type="range" min="-100" max="100" step="1" data-field="brightness" data-id="${image.id}" value="${image.brightness}" /></label>
        <label><span>Contrast</span><input type="range" min="-100" max="100" step="1" data-field="contrast" data-id="${image.id}" value="${image.contrast}" /></label>
        <label><span>Saturation</span><input type="range" min="-100" max="100" step="1" data-field="saturation" data-id="${image.id}" value="${image.saturation}" /></label>
        <label><span>Sharpness</span><input type="range" min="0" max="100" step="1" data-field="sharpness" data-id="${image.id}" value="${image.sharpness}" /></label>
        <label><span>Grayscale</span><input type="range" min="0" max="100" step="1" data-field="grayscale" data-id="${image.id}" value="${image.grayscale}" /></label>
        <label><span>Sepia</span><input type="range" min="0" max="100" step="1" data-field="sepia" data-id="${image.id}" value="${image.sepia}" /></label>
      `;
      card.appendChild(sliders);

      card.addEventListener('click', (event) => {
        const target = event.target;
        const action = target?.dataset?.action;
        if (action) {
          handleCardAction(action, image.id);
          return;
        }
        if (target.closest('input, select, button')) return;
        if (event.shiftKey) {
          toggleSelected(image.id, true);
        } else {
          toggleSelected(image.id, false);
        }
      });

      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleSelected(image.id, false);
        }
      });

      card.querySelectorAll('[data-field]').forEach((control) => {
        control.addEventListener('input', () => updateImageField(image.id, control.dataset.field, control.type === 'checkbox' ? control.checked : control.value));
      });
      card.querySelectorAll('.remove-btn').forEach((button) => {
        button.addEventListener('click', () => handleCardAction('delete', image.id));
      });

      els.imageList.appendChild(card);
    });
  }

  function handleCardAction(action, id) {
    const image = state.images.find((item) => item.id === id);
    if (!image && action !== 'select') return;
    switch (action) {
      case 'delete':
        pushHistory('delete-one');
        state.images = state.images.filter((item) => item.id !== id);
        state.selectedIds.delete(id);
        renderImageList();
        scheduleRender('delete-one');
        persist();
        showToast('Image Deleted', 'The selected image was removed.', 'success');
        break;
      case 'duplicate':
        pushHistory('duplicate-one');
        state.images.unshift({ ...deepClone(image), id: cryptoId(), fileName: `${image.fileName}-copy`, selected: true });
        state.selectedIds = new Set([state.images[0].id]);
        renderImageList();
        scheduleRender('duplicate-one');
        persist();
        break;
      case 'rotate-left':
        pushHistory('rotate-left');
        image.rotation = (Number(image.rotation) - 90) % 360;
        renderImageList();
        scheduleRender('rotate-left');
        persist();
        break;
      case 'rotate-right':
        pushHistory('rotate-right');
        image.rotation = (Number(image.rotation) + 90) % 360;
        renderImageList();
        scheduleRender('rotate-right');
        persist();
        break;
      case 'flip-h':
        pushHistory('flip-h');
        image.flipH = !image.flipH;
        renderImageList();
        scheduleRender('flip-h');
        persist();
        break;
      case 'flip-v':
        pushHistory('flip-v');
        image.flipV = !image.flipV;
        renderImageList();
        scheduleRender('flip-v');
        persist();
        break;
      case 'reset':
        pushHistory('reset-image');
        resetImage(image);
        renderImageList();
        scheduleRender('reset-image');
        persist();
        break;
      case 'select':
        toggleSelected(id, false);
        break;
      case 'copy':
        state.selectedIds = new Set([id]);
        copySelectedImages();
        break;
      default:
        break;
    }
  }

  function toggleSelected(id, additive) {
    if (!additive) state.selectedIds.clear();
    if (state.selectedIds.has(id) && additive) state.selectedIds.delete(id); else state.selectedIds.add(id);
    renderImageList();
    scheduleRender('selection');
  }

  function updateImageField(id, field, value) {
    const image = state.images.find((item) => item.id === id);
    if (!image) return;
    pushHistory(`field-${field}`);
    if (field === 'fileName') {
      image.fileName = String(value).trim() || image.fileName;
    } else if (['copies', 'width', 'height', 'border', 'rounded', 'padding', 'margin', 'rotation', 'opacity', 'brightness', 'contrast', 'saturation', 'sharpness', 'grayscale', 'sepia'].includes(field)) {
      image[field] = Number(value);
    } else if (field === 'unit') {
      const previousUnit = image.unit;
      image.width = mmToUnit(unitToMm(image.width, previousUnit), value);
      image.height = mmToUnit(unitToMm(image.height, previousUnit), value);
      image.unit = value;
    } else if (field === 'aspectLocked' || field === 'shadow') {
      image[field] = Boolean(value);
    } else if (field === 'borderColor' || field === 'backgroundColor') {
      image[field] = value;
    } else if (field === 'flipH' || field === 'flipV') {
      image[field] = Boolean(value);
    }
    if (field === 'width' && image.aspectLocked) {
      image.height = calculateLockedDimension(image.width, image, 'height');
    }
    if (field === 'height' && image.aspectLocked) {
      image.width = calculateLockedDimension(image.height, image, 'width');
    }
    renderImageList();
    scheduleRender(`update-${field}`);
    persist();
  }

  function normalizeImageAspect(image) {
    if (!image.aspectLocked || !image.naturalWidth || !image.naturalHeight) return;
    const aspect = image.naturalHeight / image.naturalWidth;
    if (image.width && !image.height) {
      image.height = Number((image.width * aspect).toFixed(2));
    } else if (image.height && !image.width) {
      image.width = Number((image.height / aspect).toFixed(2));
    }
  }

  function calculateLockedDimension(referenceValue, image, dimension) {
    const aspect = image.naturalHeight / image.naturalWidth;
    const numeric = Number(referenceValue) || 0;
    if (!numeric) return dimension === 'width' ? image.width : image.height;
    if (dimension === 'height') {
      return Number((numeric * aspect).toFixed(2));
    }
    return Number((numeric / aspect).toFixed(2));
  }

  function toUnitValue(value, fromUnit, mode, image) {
    if (mode === 'ratio') {
      const source = unitToMm(value, fromUnit);
      const aspect = image.naturalHeight / image.naturalWidth;
      return mmToUnit(source * aspect, fromUnit);
    }
    return value;
  }

  function resetImage(image) {
    const preset = passportPresets[state.settings.defaultPassportSize] || passportPresets.indian;
    Object.assign(image, {
      width: preset.width,
      height: preset.height,
      unit: preset.unit,
      copies: 1,
      aspectLocked: true,
      border: state.settings.defaultBorder,
      borderColor: state.settings.defaultBorderColor,
      rounded: state.settings.defaultRounded,
      backgroundColor: state.settings.defaultBackground,
      padding: state.settings.defaultPadding,
      margin: state.settings.defaultMargin,
      rotation: 0,
      opacity: 1,
      shadow: true,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      sharpness: 0,
      grayscale: 0,
      sepia: 0,
      flipH: false,
      flipV: false,
      manualX: null,
      manualY: null
    });
  }

  function updateMetaLabels() {
    const paper = getPaperSizeMm();
    const preset = passportPresets[state.settings.defaultPassportSize] || passportPresets.indian;
    els.pageSizeLabel.textContent = `${paper.name} · ${formatDimension(paper.width)} × ${formatDimension(paper.height)}`;
    els.resolutionLabel.textContent = `${state.settings.dpi} DPI mode`;
    els.safetyLabel.textContent = `Passport size ${preset.name} ready for actual-size printing`;
  }

  function getPaperSizeMm() {
    const paper = paperSizes[state.settings.defaultPaperSize] || paperSizes.a4;
    return {
      name: paper.name,
      width: unitToMm(paper.width, paper.unit),
      height: unitToMm(paper.height, paper.unit)
    };
  }

  function getExportPaperPx(dpi = state.settings.dpi) {
    const paper = getPaperSizeMm();
    return {
      width: mmToPx(paper.width, dpi),
      height: mmToPx(paper.height, dpi),
      widthMm: paper.width,
      heightMm: paper.height
    };
  }

  function scheduleRender() {
    if (state.renderQueued) return;
    state.renderQueued = true;
    requestAnimationFrame(() => {
      state.renderQueued = false;
      renderAll();
    });
  }

  function renderAll() {
    updateSettingsFromForm();
    updateMetaLabels();
    const paperPx = getExportPaperPx(state.settings.highDpi ? state.settings.dpi : 96);
    renderSheet(paperPx.width, paperPx.height, state.settings.highDpi ? state.settings.dpi : 96);
    renderRulers();
    renderInteractionBoxes();
  }

  function renderSheet(widthPx, heightPx, dpi) {
    const ctx = canvas.sheetCtx;
    const dpr = window.devicePixelRatio || 1;
    canvas.sheet.width = Math.round(widthPx * dpr);
    canvas.sheet.height = Math.round(heightPx * dpr);
    canvas.sheet.style.width = `${widthPx / dpi * MM_PER_INCH}mm`;
    canvas.sheet.style.height = `${heightPx / dpi * MM_PER_INCH}mm`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.sheet.width, canvas.sheet.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    const pages = generateLayoutPages(widthPx, heightPx, dpi);
    state.previewPages = pages;
    const pageIndex = clamp(state.currentPageIndex, 0, Math.max(0, pages.length - 1));
    state.currentPageIndex = pageIndex;
    els.pageIndicator.textContent = `Page ${pageIndex + 1} / ${Math.max(1, pages.length)}`;
    els.previewMeta.textContent = pages.length ? `${pages[pageIndex].items.length} placed item${pages[pageIndex].items.length === 1 ? '' : 's'} on the current page` : 'No items to place';

    const page = pages[pageIndex] || { items: [] };
    drawPage(ctx, page, widthPx, heightPx, dpi);
  }

  function generateLayoutPages(pageWidthPx, pageHeightPx, dpi) {
    const marginPx = mmToPx(state.settings.margin, dpi);
    const gapXPx = mmToPx(state.settings.gapX, dpi);
    const gapYPx = mmToPx(state.settings.gapY, dpi);
    const safePx = mmToPx(state.settings.safeMargin, dpi);
    const cutPx = mmToPx(state.settings.cutMargin, dpi);
    const usableWidth = pageWidthPx - marginPx * 2;
    const usableHeight = pageHeightPx - marginPx * 2;
    const boxes = [];

    state.images.forEach((image) => {
      const photoW = unitToPx(image.width, image.unit, dpi);
      const photoH = unitToPx(image.height, image.unit, dpi);
      for (let index = 0; index < Math.max(1, Number(image.copies) || 1); index += 1) {
        boxes.push({ imageId: image.id, image, index, width: photoW, height: photoH });
      }
    });

    boxes.sort((a, b) => (b.height * b.width) - (a.height * a.width));

    const pages = [];
    let currentPage = createPage();
    let cursorX = marginPx;
    let cursorY = marginPx;
    let rowHeight = 0;

    if (state.settings.layoutMode === 'manual' || state.settings.layoutMode === 'free') {
      boxes.forEach((box, boxIndex) => {
        const image = box.image;
        const extraW = box.width + mmToPx(image.margin * 2 + image.padding * 2 + image.border * 2, dpi);
        const extraH = box.height + mmToPx(image.margin * 2 + image.padding * 2 + image.border * 2, dpi);
        const x = clamp(image.manualX ?? marginPx + boxIndex * gapXPx, marginPx, Math.max(marginPx, pageWidthPx - marginPx - extraW));
        const y = clamp(image.manualY ?? marginPx + boxIndex * gapYPx, marginPx, Math.max(marginPx, pageHeightPx - marginPx - extraH));
        currentPage.items.push({
          boxIndex,
          imageId: box.imageId,
          image: box.image,
          x,
          y,
          width: extraW,
          height: extraH,
          pageW: pageWidthPx,
          pageH: pageHeightPx,
          photoW: box.width,
          photoH: box.height,
          cutPx,
          safePx,
          marginPx,
          gapXPx,
          gapYPx
        });
      });
      pages.push(currentPage);
      return pages;
    }

    boxes.forEach((box, boxIndex) => {
      const extraW = box.width + mmToPx(box.image.margin * 2 + box.image.padding * 2 + box.image.border * 2, dpi);
      const extraH = box.height + mmToPx(box.image.margin * 2 + box.image.padding * 2 + box.image.border * 2, dpi);
      const fitsRow = cursorX + extraW <= pageWidthPx - marginPx + 0.5;
      const fitsPage = cursorY + extraH <= pageHeightPx - marginPx + 0.5;

      if (!fitsRow) {
        cursorX = marginPx;
        cursorY += rowHeight + gapYPx;
        rowHeight = 0;
      }
      if (cursorY + extraH > pageHeightPx - marginPx) {
        pages.push(currentPage);
        currentPage = createPage();
        cursorX = marginPx;
        cursorY = marginPx;
        rowHeight = 0;
      }

      const placement = {
        boxIndex,
        imageId: box.imageId,
        image: box.image,
        x: cursorX,
        y: cursorY,
        width: extraW,
        height: extraH,
        pageW: pageWidthPx,
        pageH: pageHeightPx,
        photoW: box.width,
        photoH: box.height,
        cutPx,
        safePx,
        marginPx,
        gapXPx,
        gapYPx
      };
      currentPage.items.push(placement);
      cursorX += extraW + gapXPx;
      rowHeight = Math.max(rowHeight, extraH);
      if (!fitsPage && currentPage.items.length === 1) {
        currentPage.items[0].oversized = true;
      }
    });

    if (currentPage.items.length || !pages.length) pages.push(currentPage);
    return pages;
  }

  function createPage() {
    return { items: [] };
  }

  function drawPage(ctx, page, widthPx, heightPx, dpi) {
    ctx.clearRect(0, 0, widthPx, heightPx);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    if (state.settings.showBleed) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
      ctx.setLineDash([10, 8]);
      ctx.strokeRect(mmToPx(2, dpi), mmToPx(2, dpi), widthPx - mmToPx(4, dpi), heightPx - mmToPx(4, dpi));
      ctx.restore();
    }

    if (state.settings.showBoundary) {
      ctx.save();
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, widthPx - 2, heightPx - 2);
      ctx.restore();
    }

    page.items.forEach((placement, index) => {
      const image = placement.image;
      const { x, y, width, height } = placement;
      const totalPad = mmToPx(image.padding + image.margin, dpi);
      const borderPx = mmToPx(image.border, dpi);
      const roundedPx = mmToPx(image.rounded, dpi);
      const background = image.backgroundColor || '#ffffff';
      const innerX = x + totalPad + borderPx;
      const innerY = y + totalPad + borderPx;
      const innerW = placement.photoW;
      const innerH = placement.photoH;
      const boxW = width;
      const boxH = height;

      ctx.save();
      ctx.globalAlpha = Number(image.opacity ?? 1);
      ctx.fillStyle = background;
      roundRect(ctx, x, y, boxW, boxH, roundedPx);
      ctx.fill();
      if (image.shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.22)';
        ctx.shadowBlur = mmToPx(2, dpi);
        ctx.shadowOffsetY = mmToPx(1, dpi);
      }
      if (borderPx > 0) {
        ctx.lineWidth = borderPx * 2;
        ctx.strokeStyle = image.borderColor || '#ffffff';
        roundRect(ctx, x + borderPx / 2, y + borderPx / 2, boxW - borderPx, boxH - borderPx, Math.max(0, roundedPx - borderPx / 2));
        ctx.stroke();
      }
      ctx.restore();

      drawProcessedImage(ctx, image, innerX, innerY, innerW, innerH, dpi);

      if (state.settings.showCutMarks) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 1;
        const mark = mmToPx(2.5, dpi);
        ctx.beginPath();
        ctx.moveTo(x - mark, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y - mark);
        ctx.moveTo(x + boxW + mark, y);
        ctx.lineTo(x + boxW, y);
        ctx.lineTo(x + boxW, y - mark);
        ctx.moveTo(x - mark, y + boxH);
        ctx.lineTo(x, y + boxH);
        ctx.lineTo(x, y + boxH + mark);
        ctx.moveTo(x + boxW + mark, y + boxH);
        ctx.lineTo(x + boxW, y + boxH);
        ctx.lineTo(x + boxW, y + boxH + mark);
        ctx.stroke();
        ctx.restore();
      }

      if (state.settings.showCropMarks) {
        ctx.save();
        ctx.strokeStyle = 'rgba(43, 109, 255, 0.5)';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x, y, boxW, boxH);
        ctx.restore();
      }

      if (state.settings.showBoundary && state.settings.showRulers) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.font = `${Math.max(11, mmToPx(2.5, dpi))}px ${getComputedStyle(document.body).fontFamily}`;
        const label = `${image.fileName}`;
        ctx.fillText(label, x + mmToPx(1.5, dpi), y + mmToPx(4.8, dpi));
        ctx.restore();
      }
    });

    if (state.settings.layoutMode === 'manual') {
      drawManualHints(ctx, widthPx, heightPx, dpi);
    }
  }

  function drawProcessedImage(ctx, image, x, y, width, height, dpi) {
    const cacheKey = JSON.stringify([image.dataUrl, image.brightness, image.contrast, image.saturation, image.sharpness, image.grayscale, image.sepia, image.flipH, image.flipV, image.rotation]);
    if (!image.renderCache || image.renderCache.key !== cacheKey) {
      image.renderCache = { key: cacheKey, canvas: createProcessedCanvas(image) };
    }
    const source = image.renderCache.canvas;
    const imgRatio = source.width / source.height;
    const boxRatio = width / height;
    let drawW = width;
    let drawH = height;
    let offsetX = x;
    let offsetY = y;
    if (imgRatio > boxRatio) {
      drawH = width / imgRatio;
      offsetY = y + (height - drawH) / 2;
    } else {
      drawW = height * imgRatio;
      offsetX = x + (width - drawW) / 2;
    }
    ctx.save();
    ctx.globalAlpha = Number(image.opacity ?? 1);
    ctx.translate(offsetX + drawW / 2, offsetY + drawH / 2);
    ctx.rotate((Number(image.rotation) * Math.PI) / 180);
    ctx.scale(image.flipH ? -1 : 1, image.flipV ? -1 : 1);
    ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }

  function createProcessedCanvas(image) {
    const off = document.createElement('canvas');
    const ctx = off.getContext('2d');
    const width = Math.max(1, image.naturalWidth || 1);
    const height = Math.max(1, image.naturalHeight || 1);
    off.width = width;
    off.height = height;
    if (image.sourceImage) {
      ctx.drawImage(image.sourceImage, 0, 0, width, height);
    }
    let imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const brightness = Number(image.brightness || 0) / 100;
    const contrast = Number(image.contrast || 0) / 100;
    const saturation = Number(image.saturation || 0) / 100;
    const grayscale = Number(image.grayscale || 0) / 100;
    const sepia = Number(image.sepia || 0) / 100;
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      const a = data[i + 3];
      r = clamp255((r - 128) * (1 + contrast) + 128 + brightness * 255);
      g = clamp255((g - 128) * (1 + contrast) + 128 + brightness * 255);
      b = clamp255((b - 128) * (1 + contrast) + 128 + brightness * 255);
      const gray = r * 0.299 + g * 0.587 + b * 0.114;
      const satMix = 1 + saturation;
      r = clamp255(gray * grayscale + r * (1 - grayscale));
      g = clamp255(gray * grayscale + g * (1 - grayscale));
      b = clamp255(gray * grayscale + b * (1 - grayscale));
      if (sepia > 0) {
        const sr = clamp255((r * (1 - sepia)) + (r * 0.393 + g * 0.769 + b * 0.189) * sepia);
        const sg = clamp255((g * (1 - sepia)) + (r * 0.349 + g * 0.686 + b * 0.168) * sepia);
        const sb = clamp255((b * (1 - sepia)) + (r * 0.272 + g * 0.534 + b * 0.131) * sepia);
        r = sr; g = sg; b = sb;
      }
      r = clamp255((r - gray) * satMix + gray);
      g = clamp255((g - gray) * satMix + gray);
      b = clamp255((b - gray) * satMix + gray);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
    ctx.putImageData(imageData, 0, 0);
    if (Number(image.sharpness || 0) > 0) {
      const sharpened = applySharpen(ctx, width, height, Number(image.sharpness) / 100);
      ctx.clearRect(0, 0, width, height);
      ctx.putImageData(sharpened, 0, 0);
    }
    return off;
  }

  function applySharpen(ctx, width, height, amount) {
    const source = ctx.getImageData(0, 0, width, height);
    const target = ctx.createImageData(width, height);
    const src = source.data;
    const dst = target.data;
    const kernel = [0, -1 * amount, 0, -1 * amount, 1 + 4 * amount, -1 * amount, 0, -1 * amount, 0];
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        let r = 0; let g = 0; let b = 0; let a = 0;
        let k = 0;
        for (let ky = -1; ky <= 1; ky += 1) {
          for (let kx = -1; kx <= 1; kx += 1) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const weight = kernel[k++];
            r += src[idx] * weight;
            g += src[idx + 1] * weight;
            b += src[idx + 2] * weight;
            a += src[idx + 3] * weight;
          }
        }
        const di = (y * width + x) * 4;
        dst[di] = clamp255(r);
        dst[di + 1] = clamp255(g);
        dst[di + 2] = clamp255(b);
        dst[di + 3] = clamp255(a);
      }
    }
    return target;
  }

  function drawManualHints(ctx, widthPx, heightPx, dpi) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 179, 164, 0.35)';
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(mmToPx(state.settings.safeMargin, dpi), mmToPx(state.settings.safeMargin, dpi), widthPx - mmToPx(state.settings.safeMargin * 2, dpi), heightPx - mmToPx(state.settings.safeMargin * 2, dpi));
    ctx.restore();
  }

  function renderRulers() {
    if (!state.settings.showRulers) {
      canvas.rulerX.width = canvas.rulerX.height = canvas.rulerY.width = canvas.rulerY.height = 1;
      return;
    }
    const page = getExportPaperPx(state.settings.highDpi ? state.settings.dpi : 96);
    const zoomFactor = getZoomFactor();
    const dpr = window.devicePixelRatio || 1;
    const rulerXWidth = Math.max(1, Math.round(page.width * zoomFactor));
    const rulerYHeight = Math.max(1, Math.round(page.height * zoomFactor));
    canvas.rulerX.width = rulerXWidth * dpr;
    canvas.rulerX.height = 34 * dpr;
    canvas.rulerY.width = 34 * dpr;
    canvas.rulerY.height = rulerYHeight * dpr;
    canvas.rulerX.style.width = `${rulerXWidth}px`;
    canvas.rulerX.style.height = '34px';
    canvas.rulerY.style.width = '34px';
    canvas.rulerY.style.height = `${rulerYHeight}px`;
    canvas.rulerXCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.rulerYCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawRuler(canvas.rulerXCtx, rulerXWidth, 34, 'x', page.width, state.settings.dpi);
    drawRuler(canvas.rulerYCtx, 34, rulerYHeight, 'y', page.height, state.settings.dpi);
  }

  function drawRuler(ctx, width, height, axis, pageLengthPx, dpi) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.fillStyle = getComputedStyle(document.body).color;
    ctx.font = '10px var(--font-ui)';
    ctx.textBaseline = 'top';
    const stepMm = 10;
    const stepPx = mmToPx(stepMm, dpi) * getZoomFactor();
    const smallStepPx = stepPx / 2;
    for (let pos = 0; pos <= (axis === 'x' ? width : height); pos += smallStepPx) {
      const isMajor = Math.abs(pos / stepPx - Math.round(pos / stepPx)) < 0.1;
      const tick = isMajor ? 14 : 8;
      ctx.beginPath();
      if (axis === 'x') {
        ctx.moveTo(pos + 0.5, 34);
        ctx.lineTo(pos + 0.5, 34 - tick);
      } else {
        ctx.moveTo(34, pos + 0.5);
        ctx.lineTo(34 - tick, pos + 0.5);
      }
      ctx.stroke();
      if (isMajor) {
        const label = Math.round((pos / getZoomFactor()) / mmToPx(1, dpi));
        if (axis === 'x') ctx.fillText(String(label), pos + 2, 2); else ctx.fillText(String(label), 2, pos + 2);
      }
    }
  }

  function renderInteractionBoxes() {
    const layer = els.interactionLayer;
    layer.innerHTML = '';
    const page = state.previewPages[state.currentPageIndex];
    if (!page) return;
    const scale = getZoomFactor();
    const dpi = state.settings.highDpi ? state.settings.dpi : 96;
    page.items.forEach((placement, index) => {
      const box = document.createElement('div');
      box.className = `page-item-box${state.selectedIds.has(placement.imageId) ? ' selected' : ''}`;
      box.style.left = `${placement.x * scale}px`;
      box.style.top = `${placement.y * scale}px`;
      box.style.width = `${placement.width * scale}px`;
      box.style.height = `${placement.height * scale}px`;
      box.dataset.id = placement.imageId;
      box.dataset.index = String(index);
      const tag = document.createElement('div');
      tag.className = 'tag';
      tag.textContent = `${placement.image.fileName}`;
      box.appendChild(tag);
      box.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        state.selectedIds = new Set([placement.imageId]);
        renderImageList();
        beginDrag(event, placement);
      });
      layer.appendChild(box);
    });
  }

  function beginDrag(event, placement) {
    const image = state.images.find((item) => item.id === placement.imageId);
    if (!image) return;
    state.dragging = {
      imageId: image.id,
      startX: event.clientX,
      startY: event.clientY,
      startManualX: image.manualX ?? placement.x,
      startManualY: image.manualY ?? placement.y,
      pointerId: event.pointerId
    };
    event.target.setPointerCapture?.(event.pointerId);
  }

  function handlePreviewPointerDown() {
    if (!state.selectedIds.size) return;
  }

  function handlePreviewPointerMove(event) {
    if (!state.dragging) return;
    const image = state.images.find((item) => item.id === state.dragging.imageId);
    if (!image) return;
    const deltaX = (event.clientX - state.dragging.startX) / getZoomFactor();
    const deltaY = (event.clientY - state.dragging.startY) / getZoomFactor();
    const dpi = state.settings.highDpi ? state.settings.dpi : 96;
    let newX = state.dragging.startManualX + deltaX;
    let newY = state.dragging.startManualY + deltaY;
    if (state.settings.snapGrid) {
      const snap = mmToPx(2, dpi);
      newX = Math.round(newX / snap) * snap;
      newY = Math.round(newY / snap) * snap;
    }
    image.manualX = Math.max(0, newX);
    image.manualY = Math.max(0, newY);
    image.manualMode = true;
    scheduleRender('drag');
  }

  function handlePreviewPointerUp() {
    if (!state.dragging) return;
    state.dragging = null;
    persist();
    showToast('Position Updated', 'Manual placement was updated.', 'success');
  }

  function movePage(delta) {
    const next = clamp(state.currentPageIndex + delta, 0, Math.max(0, state.previewPages.length - 1));
    state.currentPageIndex = next;
    scheduleRender('page-nav');
  }

  function setZoom(value) {
    document.querySelectorAll('.zoom-btn').forEach((button) => button.classList.remove('active'));
    const button = document.querySelector(`.zoom-btn[data-zoom="${value}"]`);
    if (button) button.classList.add('active');
    if (value === 'fit-width' || value === 'fit-height' || value === 'fit-screen') {
      state.zoom = calculateFitZoom(value);
    } else {
      state.zoom = Number(value);
    }
    applyZoom();
    renderRulers();
    renderInteractionBoxes();
  }

  function calculateFitZoom(mode) {
    const viewport = els.previewViewport.getBoundingClientRect();
    const paper = getExportPaperPx(state.settings.highDpi ? state.settings.dpi : 96);
    const baseW = paper.width;
    const baseH = paper.height;
    const widthPct = (viewport.width - 40) / baseW;
    const heightPct = (viewport.height - 40) / baseH;
    if (mode === 'fit-width') return Math.max(25, Math.floor(widthPct * 100));
    if (mode === 'fit-height') return Math.max(25, Math.floor(heightPct * 100));
    return Math.max(25, Math.floor(Math.min(widthPct, heightPct) * 100));
  }

  function applyZoom() {
    const paper = getExportPaperPx(state.settings.highDpi ? state.settings.dpi : 96);
    const factor = getZoomFactor();
    els.previewCanvasWrap.style.transform = `scale(${factor})`;
    els.previewCanvasWrap.style.transformOrigin = '0 0';
    els.previewCanvasWrap.style.width = `${paper.width}px`;
    els.previewCanvasWrap.style.height = `${paper.height}px`;
    els.previewCanvasWrap.style.margin = 'auto';
    els.previewCanvasWrap.style.setProperty('--scaled-width', `${paper.width * factor}px`);
    els.previewCanvasWrap.style.setProperty('--scaled-height', `${paper.height * factor}px`);
    els.previewCanvasWrap.style.width = `${paper.width}px`;
    els.previewCanvasWrap.style.height = `${paper.height}px`;
  }

  function getZoomFactor() {
    return (state.zoom || 100) / 100;
  }

  function exportImage(type) {
    const dpi = state.settings.dpi;
    const paper = getExportPaperPx(dpi);
    const offscreen = document.createElement('canvas');
    offscreen.width = paper.width;
    offscreen.height = paper.height;
    const ctx = offscreen.getContext('2d');
    renderSheetToContext(ctx, paper.width, paper.height, dpi);
    const mime = type === 'png' ? 'image/png' : 'image/jpeg';
    const quality = type === 'png' ? 1 : state.settings.quality;
    const dataUrl = offscreen.toDataURL(mime, quality);
    downloadDataUrl(dataUrl, `photoprint-studio-pro.${type}`);
    showToast('Export Successful', `Downloaded ${type.toUpperCase()} successfully.`, 'success');
  }

  function renderSheetToContext(ctx, widthPx, heightPx, dpi) {
    ctx.clearRect(0, 0, widthPx, heightPx);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);
    const pages = generateLayoutPages(widthPx, heightPx, dpi);
    const page = pages[state.currentPageIndex] || pages[0];
    drawPage(ctx, page || { items: [] }, widthPx, heightPx, dpi);
  }

  function exportPdf() {
    try {
      const dpi = state.settings.dpi;
      const paper = getExportPaperPx(dpi);
      const pages = generateLayoutPages(paper.width, paper.height, dpi);
      const pageCanvases = pages.map((page) => {
        const c = document.createElement('canvas');
        c.width = paper.width;
        c.height = paper.height;
        const ctx = c.getContext('2d');
        drawPage(ctx, page || { items: [] }, paper.width, paper.height, dpi);
        return c;
      });
      const jpgs = pageCanvases.map((c) => c.toDataURL('image/jpeg', 0.98).split(',')[1]);
      const pdfBytes = buildPdfFromImages(jpgs, paper.width, paper.height, dpi);
      downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), 'photoprint-studio-pro.pdf');
      showToast('Export Successful', 'PDF exported successfully.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Export Failed', 'PDF export could not be completed.', 'error');
    }
  }

  function exportSvg() {
    const dpi = state.settings.dpi;
    const paper = getExportPaperPx(dpi);
    const canvasElement = document.createElement('canvas');
    canvasElement.width = paper.width;
    canvasElement.height = paper.height;
    const ctx = canvasElement.getContext('2d');
    renderSheetToContext(ctx, paper.width, paper.height, dpi);
    const imageUrl = canvasElement.toDataURL('image/png');
    const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${paper.widthMm}mm" height="${paper.heightMm}mm" viewBox="0 0 ${paper.width} ${paper.height}"><image href="${imageUrl}" x="0" y="0" width="${paper.width}" height="${paper.height}" preserveAspectRatio="none"/></svg>`;
    downloadDataUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, 'photoprint-studio-pro.svg');
    showToast('Export Successful', 'SVG exported successfully.', 'success');
  }

  function buildPdfFromImages(base64Images, widthPx, heightPx, dpi) {
    const widthPt = (widthPx / dpi) * 72;
    const heightPt = (heightPx / dpi) * 72;
    const objects = ['',''];
    const pageRefs = [];

    const addObject = (body) => {
      const number = objects.length + 1;
      objects.push(`${number} 0 obj\n${body}\nendobj\n`);
      return number;
    };

    base64Images.forEach((base64, index) => {
      const jpegBytes = base64ToUint8Array(base64);
      const imageRef = addObject(`<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n${uint8ArrayToBinary(jpegBytes)}\nendstream`);
      const contentStream = `q\n${widthPt} 0 0 ${heightPt} 0 0 cm\n/Im${index} Do\nQ`;
      const contentRef = addObject(`<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`);
      const pageRef = addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthPt} ${heightPt}] /Resources << /XObject << /Im${index} ${imageRef} 0 R >> >> /Contents ${contentRef} 0 R >>`);
      pageRefs.push(pageRef);
    });

    objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(' ')}] /Count ${pageRefs.length} >>\nendobj\n`;
    objects[0] = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object) => {
      offsets.push(pdf.length);
      pdf += object;
    });
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return new TextEncoder().encode(pdf);
  }

  function downloadDataUrl(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function printSheet() {
    scheduleRender('print');
    setTimeout(() => {
      window.print();
      showToast('Print Ready', 'Browser print dialog opened with the current page preview.', 'success');
    }, 80);
  }

  function openPresetModal() {
    els.modalTitle.textContent = 'Save Custom Preset';
    els.modalText.textContent = 'Store the current passport size as a reusable preset.';
    els.modalInput.value = `${state.settings.defaultPassportSize || 'custom'} preset`;
    els.modalBackdrop.classList.remove('hidden');
    els.modalBackdrop.setAttribute('aria-hidden', 'false');
    els.modalInput.focus();
  }

  function closePresetModal() {
    els.modalBackdrop.classList.add('hidden');
    els.modalBackdrop.setAttribute('aria-hidden', 'true');
  }

  function savePresetFromModal() {
    const name = els.modalInput.value.trim();
    if (!name) {
      showToast('Name Required', 'Please provide a preset name.', 'error');
      return;
    }
    const source = passportPresets[state.settings.defaultPassportSize] || passportPresets.indian;
    const preset = { id: cryptoId(), name, width: source.width, height: source.height, unit: source.unit };
    state.customPresets.push(preset);
    passportPresets[preset.id] = preset;
    fillSelect(els.passportPresetSelect, passportPresets, preset.id);
    fillSelect(els.defaultPassportSizeSelect, passportPresets, preset.id);
    state.settings.defaultPassportSize = preset.id;
    syncUiFromState();
    persist();
    closePresetModal();
    showToast('Preset Saved', `${name} has been added to custom presets.`, 'success');
  }

  function showToast(title, message, kind = '') {
    const toast = document.createElement('div');
    toast.className = `toast ${kind}`.trim();
    toast.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
    els.toastHost.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function persist() {
    if (!state.settings.autosave) return;
    const snapshot = {
      settings: state.settings,
      customPresets: state.customPresets,
      images: state.images,
      selectedIds: Array.from(state.selectedIds),
      currentPageIndex: state.currentPageIndex
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.warn('Autosave failed', error);
    }
  }

  function loadStoredState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function pushHistory(reason) {
    const snapshot = deepClone({
      settings: state.settings,
      customPresets: state.customPresets,
      images: state.images,
      selectedIds: Array.from(state.selectedIds),
      currentPageIndex: state.currentPageIndex,
      reason
    });
    state.history.push(snapshot);
    if (state.history.length > MAX_HISTORY) state.history.shift();
    state.future.length = 0;
  }

  function undo() {
    const snapshot = state.history.pop();
    if (!snapshot) return;
    state.future.push(deepClone({
      settings: state.settings,
      customPresets: state.customPresets,
      images: state.images,
      selectedIds: Array.from(state.selectedIds),
      currentPageIndex: state.currentPageIndex
    }));
    restoreSnapshot(snapshot);
    showToast('Undo', 'The previous change was restored.', 'success');
  }

  function redo() {
    const snapshot = state.future.pop();
    if (!snapshot) return;
    state.history.push(deepClone({
      settings: state.settings,
      customPresets: state.customPresets,
      images: state.images,
      selectedIds: Array.from(state.selectedIds),
      currentPageIndex: state.currentPageIndex
    }));
    restoreSnapshot(snapshot);
    showToast('Redo', 'The change was restored again.', 'success');
  }

  function restoreSnapshot(snapshot) {
    state.settings = snapshot.settings;
    state.customPresets = snapshot.customPresets;
    state.images = snapshot.images;
    state.selectedIds = new Set(snapshot.selectedIds || []);
    state.currentPageIndex = snapshot.currentPageIndex || 0;
    Object.assign(passportPresets, {
      custom: passportPresets.custom,
      ...Object.fromEntries(state.customPresets.map((preset) => [preset.id, preset]))
    });
    hydrateForm();
    applyTheme();
    applyHighContrast();
    persist();
    scheduleRender('restore');
  }

  function renderRulersIfNeeded() {
    if (state.settings.showRulers) renderRulers();
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function cryptoId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clamp255(value) {
    return clamp(Math.round(value), 0, 255);
  }

  function parseNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function numberFormat(value) {
    return Number(value).toFixed(2).replace(/\.00$/, '');
  }

  function mmToPx(mm, dpi) {
    return (mm / MM_PER_INCH) * dpi;
  }

  function pxToMm(px, dpi) {
    return (px / dpi) * MM_PER_INCH;
  }

  function unitToMm(value, unit) {
    const numeric = Number(value) || 0;
    switch (unit) {
      case 'cm': return numeric * 10;
      case 'in': return numeric * MM_PER_INCH;
      case 'px': return numeric * (MM_PER_INCH / CSS_PX_PER_INCH);
      case 'mm':
      default: return numeric;
    }
  }

  function mmToUnit(mm, unit) {
    switch (unit) {
      case 'cm': return mm / 10;
      case 'in': return mm / MM_PER_INCH;
      case 'px': return mm / MM_PER_INCH * CSS_PX_PER_INCH;
      case 'mm':
      default: return mm;
    }
  }

  function unitToPx(value, unit, dpi) {
    return mmToPx(unitToMm(value, unit), dpi);
  }

  function settingsToUnit(value, fromUnit, toUnit) {
    return mmToUnit(unitToMm(value, fromUnit), toUnit);
  }

  function formatDimension(mm) {
    const unit = state.settings.measurementUnit;
    const value = mmToUnit(mm, unit);
    return `${numberFormat(value)} ${unit}`;
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (match) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[match]));
  }

  function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function uint8ArrayToBinary(bytes) {
    let output = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      output += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return output;
  }

  function escapeHtmlAttr(value) {
    return String(value).replace(/[&<>"']/g, (match) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
  }

  function updatePreviewCanvasSize() {
    const paper = getExportPaperPx(state.settings.highDpi ? state.settings.dpi : 96);
    const zoom = getZoomFactor();
    els.previewCanvasWrap.style.width = `${paper.width}px`;
    els.previewCanvasWrap.style.height = `${paper.height}px`;
    els.sheetCanvas.style.width = `${paper.width}px`;
    els.sheetCanvas.style.height = `${paper.height}px`;
    els.previewCanvasWrap.style.transform = `scale(${zoom})`;
    els.previewCanvasWrap.style.transformOrigin = '0 0';
  }

  function moveToSection(id) {
    const node = document.getElementById(id);
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setAppThemeFromMatchMedia() {
    if (state.settings.theme === 'system') applyTheme();
  }

  function buildPdfPageObject(pageNumber, imageObjectNumber, contentObjectNumber, widthPt, heightPt) {
    return `${pageNumber} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthPt} ${heightPt}] /Resources << /XObject << /Im${pageNumber} ${imageObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>\nendobj\n`;
  }

  window.addEventListener('resize', () => {
    updatePreviewCanvasSize();
    renderRulersIfNeeded();
    scheduleRender('resize');
  });

  setInterval(() => {
    if (state.settings.autosave) persist();
  }, 30000);
})();
