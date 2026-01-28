const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const state = {
  barcodeHistory: [],
  qrHistory: [],
  qrLogoDataUrl: null,
  qrLogoImage: null,
  qrSvgString: '',
  qrCanvas: null,
  barcodeValue: '',
  barcodeFormat: 'CODE128'
};

const storageKeys = {
  barcode: 'simpleBarcodeHistory',
  qr: 'simpleQrHistory'
};

const debounce = (fn, delay = 400) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const setMessage = (el, text, isError = false) => {
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? '#c2410c' : '';
};

const loadHistory = () => {
  try {
    const barcode = JSON.parse(localStorage.getItem(storageKeys.barcode) || '[]');
    const qr = JSON.parse(localStorage.getItem(storageKeys.qr) || '[]');
    state.barcodeHistory = Array.isArray(barcode) ? barcode : [];
    state.qrHistory = Array.isArray(qr) ? qr : [];
  } catch (err) {
    state.barcodeHistory = [];
    state.qrHistory = [];
  }
};

const saveHistory = (key, item) => {
  const list = key === 'barcode' ? state.barcodeHistory : state.qrHistory;
  const next = [item, ...list.filter((entry) => entry.value !== item.value)].slice(0, 8);
  if (key === 'barcode') {
    state.barcodeHistory = next;
    localStorage.setItem(storageKeys.barcode, JSON.stringify(next));
  } else {
    state.qrHistory = next;
    localStorage.setItem(storageKeys.qr, JSON.stringify(next));
  }
};

const renderHistory = () => {
  const barcodeList = qs('#barcodeHistory');
  const qrList = qs('#qrHistory');
  if (barcodeList) {
    barcodeList.innerHTML = '';
    state.barcodeHistory.forEach((item) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${item.value} (${item.format})</span>`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '불러오기';
      btn.addEventListener('click', () => {
        const input = qs('#barcodeValue');
        const format = qs('#barcodeFormat');
        if (input) input.value = item.value;
        if (format) format.value = item.format;
        selectTab('barcode');
        setMode('barcode', 'single');
        generateBarcode();
      });
      li.appendChild(btn);
      barcodeList.appendChild(li);
    });
  }

  if (qrList) {
    qrList.innerHTML = '';
    state.qrHistory.forEach((item) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${item.label}</span>`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '불러오기';
      btn.addEventListener('click', () => {
        const typeSelect = qs('#qrType');
        if (typeSelect) typeSelect.value = item.type;
        updateQrFields();
        populateQrFields(item);
        selectTab('qrcode');
        setMode('qrcode', 'single');
        generateQr();
      });
      li.appendChild(btn);
      qrList.appendChild(li);
    });
  }
};

const selectTab = (tabName) => {
  qsa('.tab').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.tab === tabName);
    btn.setAttribute('aria-selected', btn.dataset.tab === tabName ? 'true' : 'false');
  });
  qsa('.tab-panel').forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.panel === tabName);
  });
};

const setMode = (mode, value) => {
  qsa(`.mode-btn[data-mode="${mode}"]`).forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.value === value);
  });

  if (mode === 'barcode') {
    qs('[data-form="barcode-single"]').classList.toggle('hidden', value !== 'single');
    qs('[data-form="barcode-batch"]').classList.toggle('hidden', value !== 'batch');
    qs('#barcodePreview').classList.toggle('hidden', value === 'batch');
    qs('#barcodeBatchPreview').classList.toggle('hidden', value !== 'batch');
  }

  if (mode === 'qrcode') {
    qs('[data-form="qr-single"]').classList.toggle('hidden', value !== 'single');
    qs('[data-form="qr-batch"]').classList.toggle('hidden', value !== 'batch');
    qs('#qrPreview').classList.toggle('hidden', value === 'batch');
    qs('#qrBatchPreview').classList.toggle('hidden', value !== 'batch');
  }
};

const updateQrFields = () => {
  const type = qs('#qrType')?.value || 'text';
  qsa('[data-qr-fields]').forEach((field) => {
    field.classList.toggle('hidden', field.dataset.qrFields !== type);
  });
};

const populateQrFields = (item) => {
  if (!item) return;
  switch (item.type) {
    case 'url':
      qs('#qrUrl').value = item.value || '';
      break;
    case 'email':
      qs('#qrEmail').value = item.meta?.email || '';
      qs('#qrEmailSubject').value = item.meta?.subject || '';
      qs('#qrEmailBody').value = item.meta?.body || '';
      break;
    case 'phone':
      qs('#qrPhone').value = item.value || '';
      break;
    case 'sms':
      qs('#qrSmsNumber').value = item.meta?.number || '';
      qs('#qrSmsBody').value = item.meta?.body || '';
      break;
    case 'wifi':
      qs('#qrWifiSsid').value = item.meta?.ssid || '';
      qs('#qrWifiPassword').value = item.meta?.password || '';
      qs('#qrWifiSecurity').value = item.meta?.security || 'WPA';
      qs('#qrWifiHidden').value = item.meta?.hidden ? 'true' : 'false';
      break;
    case 'vcard':
      qs('#qrVcardName').value = item.meta?.name || '';
      qs('#qrVcardOrg').value = item.meta?.org || '';
      qs('#qrVcardPhone').value = item.meta?.phone || '';
      qs('#qrVcardEmail').value = item.meta?.email || '';
      qs('#qrVcardUrl').value = item.meta?.url || '';
      break;
    default:
      qs('#qrText').value = item.value || '';
  }
};

const getBarcodeOptions = () => {
  return {
    format: qs('#barcodeFormat').value,
    width: Number(qs('#barcodeWidth').value),
    height: Number(qs('#barcodeHeight').value),
    displayValue: qs('#barcodeDisplay').value === 'true',
    textPosition: qs('#barcodeTextPosition').value,
    font: qs('#barcodeFont').value,
    fontSize: Number(qs('#barcodeFontSize').value),
    textMargin: Number(qs('#barcodeTextMargin').value),
    margin: Number(qs('#barcodeMargin').value),
    lineColor: qs('#barcodeLineColor').value,
    background: qs('#barcodeBgColor').value
  };
};

const generateBarcode = () => {
  const mode = qs('.mode-btn[data-mode="barcode"].is-active')?.dataset.value || 'single';
  const message = qs('#barcodeMessage');
  setMessage(message, '');

  if (mode === 'batch') {
    generateBarcodeBatch();
    return;
  }

  const value = qs('#barcodeValue').value.trim();
  if (!value) {
    setMessage(message, '바코드 데이터를 입력하세요.', true);
    return;
  }

  const options = getBarcodeOptions();
  const svg = qs('#barcodeSvg');

  try {
    JsBarcode(svg, value, options);
    state.barcodeValue = value;
    state.barcodeFormat = options.format;
    saveHistory('barcode', { value, format: options.format, ts: Date.now() });
    renderHistory();
    setMessage(message, '바코드가 생성되었습니다.');
  } catch (err) {
    setMessage(message, '형식에 맞는 데이터를 입력했는지 확인하세요.', true);
  }
};

const parseLines = (text) => {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const generateBarcodeBatch = () => {
  const message = qs('#barcodeMessage');
  const preview = qs('#barcodeBatchPreview');
  preview.innerHTML = '';

  const values = parseLines(qs('#barcodeBatch').value || '');
  if (!values.length) {
    setMessage(message, '배치 데이터를 입력하거나 파일을 업로드하세요.', true);
    return;
  }

  const options = getBarcodeOptions();
  const maxItems = 200;
  const sliced = values.slice(0, maxItems);

  sliced.forEach((value) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'batch-item';
    const label = document.createElement('div');
    label.className = 'batch-label';
    label.textContent = value;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    wrapper.appendChild(label);
    wrapper.appendChild(svg);
    preview.appendChild(wrapper);
    try {
      JsBarcode(svg, value, options);
    } catch (err) {
      label.textContent = `${value} (오류)`;
    }
  });

  setMessage(message, `${sliced.length}개의 바코드를 생성했습니다.`);
};

const svgToDataUrl = (svgElement) => {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
};

const svgToPngDataUrl = (svgElement, background = '#ffffff') => {
  return new Promise((resolve, reject) => {
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지 변환 실패'));
    };
    img.src = url;
  });
};

const downloadDataUrl = (dataUrl, filename) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const downloadBlob = (blob, filename) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};

const copyText = async (text) => {
  try {
    if (!navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    return false;
  }
};

const copyImage = async (dataUrl) => {
  try {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') return false;
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    return true;
  } catch (err) {
    return false;
  }
};

const printHtml = (html, title = 'Print') => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`<!doctype html><html><head><title>${title}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px} .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px} svg,canvas,img{max-width:100%}</style>
    </head><body>${html}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

const buildQrData = () => {
  const type = qs('#qrType').value;
  const safeValue = (value) => (value || '').trim();

  switch (type) {
    case 'url': {
      let url = safeValue(qs('#qrUrl').value);
      if (url && !/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
      return { value: url, type, label: `URL: ${url}` };
    }
    case 'email': {
      const email = safeValue(qs('#qrEmail').value);
      const subject = safeValue(qs('#qrEmailSubject').value);
      const body = safeValue(qs('#qrEmailBody').value);
      if (!email) return { value: '', type };
      const params = new URLSearchParams();
      if (subject) params.set('subject', subject);
      if (body) params.set('body', body);
      const mailto = `mailto:${email}${params.toString() ? `?${params.toString()}` : ''}`;
      return { value: mailto, type, label: `이메일: ${email}`, meta: { email, subject, body } };
    }
    case 'phone': {
      const phone = safeValue(qs('#qrPhone').value);
      return { value: phone ? `tel:${phone}` : '', type, label: `전화: ${phone}` };
    }
    case 'sms': {
      const number = safeValue(qs('#qrSmsNumber').value);
      const body = safeValue(qs('#qrSmsBody').value);
      const sms = number ? `SMSTO:${number}:${body}` : '';
      return { value: sms, type, label: `SMS: ${number}`, meta: { number, body } };
    }
    case 'wifi': {
      const escapeWifi = (value) => value.replace(/[\\;,:]/g, '\\$&');
      const ssid = escapeWifi(safeValue(qs('#qrWifiSsid').value));
      const password = escapeWifi(safeValue(qs('#qrWifiPassword').value));
      const security = qs('#qrWifiSecurity').value;
      const hidden = qs('#qrWifiHidden').value === 'true';
      if (!ssid) return { value: '', type };
      const payload = `WIFI:T:${security};S:${ssid};P:${password};H:${hidden ? 'true' : 'false'};;`;
      return { value: payload, type, label: `Wi-Fi: ${ssid}`, meta: { ssid, password, security, hidden } };
    }
    case 'vcard': {
      const name = safeValue(qs('#qrVcardName').value);
      const org = safeValue(qs('#qrVcardOrg').value);
      const phone = safeValue(qs('#qrVcardPhone').value);
      const email = safeValue(qs('#qrVcardEmail').value);
      const url = safeValue(qs('#qrVcardUrl').value);
      if (!name) return { value: '', type };
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${name}`,
        `FN:${name}`
      ];
      if (org) lines.push(`ORG:${org}`);
      if (phone) lines.push(`TEL:${phone}`);
      if (email) lines.push(`EMAIL:${email}`);
      if (url) lines.push(`URL:${url}`);
      lines.push('END:VCARD');
      return { value: lines.join('\n'), type, label: `vCard: ${name}`, meta: { name, org, phone, email, url } };
    }
    default: {
      const text = safeValue(qs('#qrText').value);
      return { value: text, type: 'text', label: `텍스트: ${text}` };
    }
  }
};

const getQrOptions = () => {
  return {
    size: Number(qs('#qrSize').value),
    margin: Number(qs('#qrMargin').value),
    error: qs('#qrError').value,
    colorDark: qs('#qrColorDark').value,
    colorLight: qs('#qrColorLight').value,
    logoSize: Number(qs('#qrLogoSize').value) / 100,
    logoBg: qs('#qrLogoBg').value === 'true'
  };
};

const buildQrMatrix = (data, errorLevel) => {
  const qr = qrcode(0, errorLevel);
  qr.addData(data);
  qr.make();
  return qr;
};

const renderQrCanvas = (qr, options) => {
  const moduleCount = qr.getModuleCount();
  const margin = Math.max(0, options.margin);
  const size = Math.max(120, options.size);
  const cellSize = Math.max(1, Math.floor((size - margin * 2) / moduleCount));
  const canvasSize = cellSize * moduleCount + margin * 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = options.colorLight;
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  ctx.fillStyle = options.colorDark;
  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (qr.isDark(row, col)) {
        ctx.fillRect(margin + col * cellSize, margin + row * cellSize, cellSize, cellSize);
      }
    }
  }
  return { canvas, cellSize, canvasSize, margin, moduleCount };
};

const renderQrSvg = (qr, options, renderInfo) => {
  const { canvasSize, cellSize, margin, moduleCount } = renderInfo;
  const rects = [];
  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (qr.isDark(row, col)) {
        rects.push(
          `<rect x="${margin + col * cellSize}" y="${margin + row * cellSize}" width="${cellSize}" height="${cellSize}" />`
        );
      }
    }
  }

  const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}" shape-rendering="crispEdges">`;
  const background = `<rect width="100%" height="100%" fill="${options.colorLight}" />`;
  const darkGroup = `<g fill="${options.colorDark}">${rects.join('')}</g>`;
  return `${svgHeader}${background}${darkGroup}</svg>`;
};

const addLogoToCanvas = (baseCanvas, logoImage, options) => {
  if (!logoImage) return baseCanvas;
  const size = baseCanvas.width;
  const logoSize = Math.floor(size * options.logoSize);
  if (logoSize <= 0) return baseCanvas;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(baseCanvas, 0, 0);
  const x = (size - logoSize) / 2;
  const y = (size - logoSize) / 2;
  if (options.logoBg) {
    const pad = Math.floor(logoSize * 0.12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2);
  }
  ctx.drawImage(logoImage, x, y, logoSize, logoSize);
  return canvas;
};

const addLogoToSvg = (svgString, logoDataUrl, options, size) => {
  if (!logoDataUrl) return svgString;
  const logoSize = Math.floor(size * options.logoSize);
  if (logoSize <= 0) return svgString;
  const x = Math.floor((size - logoSize) / 2);
  const y = Math.floor((size - logoSize) / 2);
  const bgRect = options.logoBg
    ? `<rect x="${x - Math.floor(logoSize * 0.12)}" y="${y - Math.floor(logoSize * 0.12)}" width="${logoSize + Math.floor(logoSize * 0.24)}" height="${logoSize + Math.floor(logoSize * 0.24)}" fill="#ffffff" />`
    : '';
  const imageTag = `<image href="${logoDataUrl}" x="${x}" y="${y}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet" />`;
  return svgString.replace('</svg>', `${bgRect}${imageTag}</svg>`);
};

const generateQr = () => {
  const mode = qs('.mode-btn[data-mode="qrcode"].is-active')?.dataset.value || 'single';
  const message = qs('#qrMessage');
  setMessage(message, '');

  if (mode === 'batch') {
    generateQrBatch();
    return;
  }

  const payload = buildQrData();
  if (!payload.value) {
    setMessage(message, 'QR 데이터를 입력하세요.', true);
    return;
  }

  const options = getQrOptions();
  try {
    const qr = buildQrMatrix(payload.value, options.error);
    const renderInfo = renderQrCanvas(qr, options);
    const baseCanvas = renderInfo.canvas;
    const finalCanvas = addLogoToCanvas(baseCanvas, state.qrLogoImage, options);
    const svgString = renderQrSvg(qr, options, renderInfo);
    const finalSvg = addLogoToSvg(svgString, state.qrLogoDataUrl, options, renderInfo.canvasSize);

    state.qrCanvas = finalCanvas;
    state.qrSvgString = finalSvg;

    const preview = qs('#qrPreview');
    preview.innerHTML = '';
    preview.appendChild(finalCanvas);

    saveHistory('qr', {
      value: payload.value,
      type: payload.type,
      label: payload.label || payload.value,
      meta: payload.meta || {}
    });
    renderHistory();
    setMessage(message, 'QR 코드가 생성되었습니다.');
  } catch (err) {
    setMessage(message, 'QR 코드를 생성할 수 없습니다. 입력값을 확인하세요.', true);
  }
};

const generateQrBatch = () => {
  const message = qs('#qrMessage');
  const preview = qs('#qrBatchPreview');
  preview.innerHTML = '';

  const values = parseLines(qs('#qrBatch').value || '');
  if (!values.length) {
    setMessage(message, '배치 데이터를 입력하거나 파일을 업로드하세요.', true);
    return;
  }

  const options = getQrOptions();
  const maxItems = 100;
  const sliced = values.slice(0, maxItems);

  sliced.forEach((value) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'batch-item';
    const label = document.createElement('div');
    label.className = 'batch-label';
    label.textContent = value;
    wrapper.appendChild(label);
    try {
      const qr = buildQrMatrix(value, options.error);
      const renderInfo = renderQrCanvas(qr, options);
      const canvas = renderInfo.canvas;
      wrapper.appendChild(canvas);
    } catch (err) {
      label.textContent = `${value} (오류)`;
    }
    preview.appendChild(wrapper);
  });

  setMessage(message, `${sliced.length}개의 QR 코드를 생성했습니다.`);
};

const handleLogoUpload = (file) => {
  if (!file) {
    state.qrLogoDataUrl = null;
    state.qrLogoImage = null;
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.qrLogoDataUrl = reader.result;
    const img = new Image();
    img.onload = () => {
      state.qrLogoImage = img;
      generateQr();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
};

const initQuickActions = () => {
  const input = qs('#quickInput');
  const barcodeBtn = qs('[data-quick-barcode]');
  const qrBtn = qs('[data-quick-qr]');
  if (!input) return;

  barcodeBtn?.addEventListener('click', () => {
    qs('#barcodeValue').value = input.value;
    selectTab('barcode');
    setMode('barcode', 'single');
    generateBarcode();
    window.location.hash = '#generator';
  });

  qrBtn?.addEventListener('click', () => {
    qs('#qrType').value = 'text';
    updateQrFields();
    qs('#qrText').value = input.value;
    selectTab('qrcode');
    setMode('qrcode', 'single');
    generateQr();
    window.location.hash = '#generator';
  });
};

const initFileInputs = () => {
  const barcodeFile = qs('#barcodeBatchFile');
  const qrFile = qs('#qrBatchFile');
  barcodeFile?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      qs('#barcodeBatch').value = reader.result;
    };
    reader.readAsText(file);
  });

  qrFile?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      qs('#qrBatch').value = reader.result;
    };
    reader.readAsText(file);
  });
};

const initNav = () => {
  const toggle = qs('[data-nav-toggle]');
  const nav = qs('.site-nav');
  toggle?.addEventListener('click', () => {
    nav?.classList.toggle('is-open');
  });
};

const initTabs = () => {
  qsa('.tab').forEach((btn) => {
    btn.addEventListener('click', () => selectTab(btn.dataset.tab));
  });
};

const initModes = () => {
  qsa('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode, btn.dataset.value));
  });
};

const initBarcodeActions = () => {
  qs('#barcodeGenerate')?.addEventListener('click', generateBarcode);
  qs('#barcodeReset')?.addEventListener('click', () => {
    qs('#barcodeValue').value = '';
    qs('#barcodeBatch').value = '';
    setMessage(qs('#barcodeMessage'), '');
  });
  qs('#barcodeDownloadSvg')?.addEventListener('click', () => {
    const svg = qs('#barcodeSvg');
    if (!svg || !state.barcodeValue) return;
    const svgString = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    downloadBlob(blob, `barcode-${state.barcodeValue}.svg`);
  });
  qs('#barcodeDownloadPng')?.addEventListener('click', async () => {
    const svg = qs('#barcodeSvg');
    if (!svg || !state.barcodeValue) return;
    const dataUrl = await svgToPngDataUrl(svg, qs('#barcodeBgColor').value);
    downloadDataUrl(dataUrl, `barcode-${state.barcodeValue}.png`);
  });
  qs('#barcodeCopySvg')?.addEventListener('click', async () => {
    const svg = qs('#barcodeSvg');
    if (!svg) return;
    const svgString = new XMLSerializer().serializeToString(svg);
    const ok = await copyText(svgString);
    setMessage(qs('#barcodeMessage'), ok ? 'SVG가 복사되었습니다.' : '복사 권한이 필요합니다.', !ok);
  });
  qs('#barcodePrint')?.addEventListener('click', () => {
    const svg = qs('#barcodeSvg');
    if (!svg) return;
    const html = `<div>${svg.outerHTML}</div>`;
    printHtml(html, 'Barcode');
  });

  const autoInputs = ['#barcodeValue', '#barcodeFormat', '#barcodeWidth', '#barcodeHeight', '#barcodeMargin', '#barcodeDisplay', '#barcodeTextPosition', '#barcodeFont', '#barcodeFontSize', '#barcodeTextMargin', '#barcodeLineColor', '#barcodeBgColor'];
  const handler = debounce(() => generateBarcode(), 400);
  autoInputs.forEach((selector) => {
    qs(selector)?.addEventListener('input', handler);
  });
};

const initQrActions = () => {
  qs('#qrGenerate')?.addEventListener('click', generateQr);
  qs('#qrReset')?.addEventListener('click', () => {
    qs('#qrText').value = '';
    qs('#qrUrl').value = '';
    qs('#qrEmail').value = '';
    qs('#qrEmailSubject').value = '';
    qs('#qrEmailBody').value = '';
    qs('#qrPhone').value = '';
    qs('#qrSmsNumber').value = '';
    qs('#qrSmsBody').value = '';
    qs('#qrWifiSsid').value = '';
    qs('#qrWifiPassword').value = '';
    qs('#qrVcardName').value = '';
    qs('#qrVcardOrg').value = '';
    qs('#qrVcardPhone').value = '';
    qs('#qrVcardEmail').value = '';
    qs('#qrVcardUrl').value = '';
    setMessage(qs('#qrMessage'), '');
  });
  qs('#qrDownloadPng')?.addEventListener('click', () => {
    if (!state.qrCanvas) return;
    downloadDataUrl(state.qrCanvas.toDataURL('image/png'), 'qrcode.png');
  });
  qs('#qrDownloadSvg')?.addEventListener('click', () => {
    if (!state.qrSvgString) return;
    const blob = new Blob([state.qrSvgString], { type: 'image/svg+xml' });
    downloadBlob(blob, 'qrcode.svg');
  });
  qs('#qrCopyPng')?.addEventListener('click', async () => {
    if (!state.qrCanvas) return;
    const ok = await copyImage(state.qrCanvas.toDataURL('image/png'));
    setMessage(qs('#qrMessage'), ok ? '이미지가 복사되었습니다.' : '복사 권한이 필요합니다.', !ok);
  });
  qs('#qrPrint')?.addEventListener('click', () => {
    if (!state.qrCanvas) return;
    const img = state.qrCanvas.toDataURL('image/png');
    printHtml(`<img src="${img}" alt="QR code" />`, 'QR Code');
  });

  const autoInputs = ['#qrText', '#qrUrl', '#qrEmail', '#qrEmailSubject', '#qrEmailBody', '#qrPhone', '#qrSmsNumber', '#qrSmsBody', '#qrWifiSsid', '#qrWifiPassword', '#qrVcardName', '#qrVcardOrg', '#qrVcardPhone', '#qrVcardEmail', '#qrVcardUrl', '#qrSize', '#qrMargin', '#qrError', '#qrColorDark', '#qrColorLight', '#qrLogoSize', '#qrLogoBg'];
  const handler = debounce(() => generateQr(), 450);
  autoInputs.forEach((selector) => {
    qs(selector)?.addEventListener('input', handler);
  });

  qs('#qrType')?.addEventListener('change', () => {
    updateQrFields();
    generateQr();
  });

  qs('#qrLogo')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    handleLogoUpload(file);
  });
};

const init = () => {
  loadHistory();
  renderHistory();
  initNav();
  initTabs();
  initModes();
  initQuickActions();
  initFileInputs();
  updateQrFields();
  initBarcodeActions();
  initQrActions();
  const barcodeInput = qs('#barcodeValue');
  if (barcodeInput && !barcodeInput.value) {
    barcodeInput.value = '8801234567890';
  }
  const qrTextInput = qs('#qrText');
  if (qrTextInput && !qrTextInput.value) {
    qrTextInput.value = 'https://example.com';
  }
  generateBarcode();
  generateQr();
};

document.addEventListener('DOMContentLoaded', init);

