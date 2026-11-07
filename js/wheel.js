(function () {
  // Segment fill and label colors: a rainbow in muted, brand-matched tones.
  // Amber Light, Standard Sage, and Signal Blue are brand colors; the others are mixed to the
  // same saturation and depth. Every label meets at least 4.5:1 contrast on its segment.
  const SEGMENTS = [
    { fill: '#A6423A', text: '#F7F5F2' }, // Brick red
    { fill: '#A7562A', text: '#F7F5F2' }, // Burnt orange
    { fill: '#D4A85A', text: '#1C2B3A' }, // Amber Light (brand)
    { fill: '#557439', text: '#F7F5F2' }, // Moss green
    { fill: '#2D6A5C', text: '#F7F5F2' }, // Standard Sage (brand)
    { fill: '#2563A8', text: '#F7F5F2' }, // Signal Blue (brand)
    { fill: '#454C92', text: '#F7F5F2' }, // Indigo
    { fill: '#744983', text: '#F7F5F2' }  // Plum
  ];
  let theme = {};
  function readTheme() {
    const s = getComputedStyle(document.documentElement);
    const v = name => s.getPropertyValue(name).trim();
    theme = {
      band: v('--wheel-band'), sep: v('--wheel-sep'), rim: v('--wheel-rim'), rig: v('--wheel-rig'),
      boundary: v('--wheel-boundary'), empty: v('--wheel-empty'), win: v('--wheel-win'), muted: v('--muted')
    };
  }
  readTheme();
  const STORE_KEY = 'cedma-spin-wheel-options';
  const DEFAULTS = ['Certification', 'Lab platforms', 'Measuring impact', 'AI in content', 'Partner training', 'Pricing models'];

  let entries = loadEntries();
  let spinning = false;
  let currentAngle = 0;
  let history = [];
  let lastWinnerIdx = -1;
  let wheelSize = 320;
  let riggedIdx = -1;

  const canvas = document.getElementById('wheelCanvas');
  const ctx = canvas.getContext('2d');
  const wrapper = document.getElementById('wheelWrapper');
  const hub = document.getElementById('hub');
  const wheelArea = document.querySelector('.wheel-area');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function loadEntries() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      if (Array.isArray(saved) && saved.every(s => typeof s === 'string')) return saved;
    } catch (e) {}
    return DEFAULTS.slice();
  }
  function saveEntries() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(entries)); } catch (e) {}
  }

  // With eight or fewer options, colors are spaced out so the wheel always runs the full
  // rainbow from red to plum. With more, the rainbow repeats, and the last segment avoids
  // matching the red segment it sits next to.
  function segmentFor(i) {
    const n = entries.length;
    const len = SEGMENTS.length;
    if (n <= len) return SEGMENTS[Math.floor(i * len / Math.max(n, 1))];
    let k = i % len;
    if (i === n - 1 && k === 0) k = 4;
    return SEGMENTS[k];
  }

  function resizeWheel() {
    const narrow = window.innerWidth <= 760;
    const areaW = wheelArea.clientWidth - 24;
    const areaH = narrow ? areaW : wheelArea.clientHeight - 270;
    const size = Math.round(Math.max(200, Math.min(areaW, areaH, 760)));
    const dpr = window.devicePixelRatio || 1;
    if (size === wheelSize && canvas.width === Math.round(size * dpr)) return;
    wheelSize = size;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    wrapper.style.width = size + 'px';
    wrapper.style.height = size + 'px';
    const hubSize = Math.max(52, Math.round(size * 0.15));
    hub.style.width = hubSize + 'px';
    hub.style.height = hubSize + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWheel(currentAngle, riggedIdx);
  }

  function fitLabel(text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
    return t.trimEnd() + '…';
  }

  function drawWheel(angle, highlightIdx = -1) {
    const sz = wheelSize;
    const c = sz / 2;
    const rOuter = c - 2;
    const band = Math.max(8, sz * 0.03);
    const r = rOuter - band;
    ctx.clearRect(0, 0, sz, sz);

    // Outer band
    ctx.beginPath();
    ctx.arc(c, c, rOuter, 0, Math.PI * 2);
    ctx.fillStyle = theme.band;
    ctx.fill();

    const n = entries.length;
    if (n === 0) {
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.fillStyle = theme.empty;
      ctx.fill();
      ctx.fillStyle = theme.muted;
      ctx.font = `500 ${Math.max(14, sz * 0.035)}px 'Albert Sans', 'Segoe UI', Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Add an option to start', c, c + sz * 0.16);
      drawRim(c, rOuter, r, 0, 0);
      return;
    }

    const arc = (Math.PI * 2) / n;
    for (let i = 0; i < n; i++) {
      const start = angle + arc * i;
      const end = start + arc;
      const seg = segmentFor(i);
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.arc(c, c, r, start, end);
      ctx.closePath();
      ctx.globalAlpha = (highlightIdx === -1 || highlightIdx === i) ? 1 : 0.5;
      ctx.fillStyle = seg.fill;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (n > 1) {
        ctx.strokeStyle = theme.sep;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Label, reading outward from the hub to the rim
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const chord = 2 * r * 0.62 * Math.sin(Math.min(arc, Math.PI) / 2);
      const inner = Math.max(sz * 0.11, 34);
      const textMax = r - r * 0.07 - inner;
      let fontSize = Math.max(11, Math.min(sz * 0.042, chord * 0.55));
      const family = "'Albert Sans', 'Segoe UI', Arial, sans-serif";
      ctx.font = `600 ${fontSize}px ${family}`;
      const w = ctx.measureText(entries[i]).width;
      if (w > textMax) {
        fontSize = Math.max(11, fontSize * 0.72, fontSize * textMax / w);
        ctx.font = `600 ${fontSize}px ${family}`;
      }
      ctx.fillStyle = seg.text;
      ctx.globalAlpha = (highlightIdx === -1 || highlightIdx === i) ? 1 : 0.6;
      ctx.fillText(fitLabel(entries[i], textMax), r - r * 0.07, 0);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    if (highlightIdx >= 0 && highlightIdx < n && n > 1) {
      const s = angle + arc * highlightIdx;
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.arc(c, c, r - 2, s, s + arc);
      ctx.closePath();
      ctx.strokeStyle = theme.win;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    drawRim(c, rOuter, r, angle, n);
  }

  function drawRim(c, rOuter, r, angle, n) {
    ctx.beginPath();
    ctx.arc(c, c, rOuter - 1, 0, Math.PI * 2);
    ctx.strokeStyle = canvas.classList.contains('rig-mode') ? theme.rig : theme.rim;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.strokeStyle = theme.sep;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Amber dots on the rim mark each segment boundary
    if (n > 0) {
      const mid = (rOuter + r) / 2;
      const dot = Math.max(2, Math.min((rOuter - r) * 0.28, 5));
      const arc = (Math.PI * 2) / n;
      ctx.fillStyle = theme.boundary;
      for (let i = 0; i < n; i++) {
        const a = angle + arc * i;
        ctx.beginPath();
        ctx.arc(c + Math.cos(a) * mid, c + Math.sin(a) * mid, dot, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Rows are built with DOM methods, and each dot's color is set through element.style rather
  // than a style="" attribute in markup. Hosts with a Content Security Policy that disallows
  // inline styles block style attributes, which would leave the dots empty.
  function renderEntries() {
    const list = document.getElementById('entryList');
    list.replaceChildren();
    entries.forEach((e, i) => {
      const li = document.createElement('li');
      li.className = 'entry-row';

      const dot = document.createElement('span');
      dot.className = 'entry-dot';
      dot.style.backgroundColor = segmentFor(i).fill;

      const input = document.createElement('input');
      input.className = 'entry-text';
      input.id = `entry-${i}`;
      input.value = e;
      input.maxLength = 40;
      input.setAttribute('aria-label', `Option ${i + 1}`);

      const del = document.createElement('button');
      del.className = 'del-btn';
      del.type = 'button';
      del.textContent = '×';
      del.setAttribute('aria-label', `Remove ${e}`);

      li.append(dot, input, del);
      input.addEventListener('change', function () {
        const v = this.value.trim();
        if (v) { entries[i] = v; } else { entries.splice(i, 1); renderEntries(); return; }
        saveEntries();
        drawWheel(currentAngle);
      });
      del.addEventListener('click', () => {
        if (spinning) return;
        entries.splice(i, 1);
        hideResult();
        renderEntries();
      });
      list.appendChild(li);
    });
    document.getElementById('entryCount').textContent = entries.length === 1 ? '1 option' : `${entries.length} options`;
    document.getElementById('spinBtn').disabled = spinning || entries.length < 2;
    saveEntries();
    drawWheel(currentAngle);
  }

  function addValues(values) {
    const clean = values.map(v => v.trim().slice(0, 40)).filter(Boolean);
    if (!clean.length || spinning) return;
    entries.push(...clean);
    hideResult();
    renderEntries();
    const list = document.getElementById('entryList');
    list.scrollTop = list.scrollHeight;
  }

  const addInput = document.getElementById('addInput');
  document.getElementById('addBtn').addEventListener('click', () => { addValues([addInput.value]); addInput.value = ''; addInput.focus(); });
  addInput.addEventListener('keydown', e => { if (e.key === 'Enter') { addValues([addInput.value]); addInput.value = ''; } });
  addInput.addEventListener('paste', e => {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (/[\r\n]/.test(text)) { e.preventDefault(); addValues(text.split(/\r?\n/)); addInput.value = ''; }
  });

  document.getElementById('shuffleBtn').addEventListener('click', () => {
    if (spinning) return;
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    hideResult();
    renderEntries();
  });

  const clearAllBtn = document.getElementById('clearAllBtn');
  let clearArmed = null;
  clearAllBtn.addEventListener('click', () => {
    if (spinning || !entries.length) return;
    if (!clearArmed) {
      clearAllBtn.textContent = 'Tap again to clear';
      clearArmed = setTimeout(() => { clearArmed = null; clearAllBtn.textContent = 'Clear all'; }, 3000);
      return;
    }
    clearTimeout(clearArmed); clearArmed = null;
    clearAllBtn.textContent = 'Clear all';
    entries = [];
    hideResult();
    renderEntries();
  });

  // Triple-click the hub, then click a segment, and the next spin lands on it.
  let hubClicks = 0, hubTimer = null;
  hub.addEventListener('click', () => {
    if (spinning) return;
    hubClicks++;
    clearTimeout(hubTimer);
    hubTimer = setTimeout(() => { hubClicks = 0; }, 600);
    if (hubClicks >= 3) {
      hubClicks = 0;
      clearTimeout(hubTimer);
      riggedIdx = -1;
      canvas.classList.add('rig-mode');
      drawWheel(currentAngle);
    }
  });

  canvas.addEventListener('click', e => {
    if (!canvas.classList.contains('rig-mode')) return;
    const rect = canvas.getBoundingClientRect();
    const c = wheelSize / 2;
    const x = (e.clientX - rect.left) * (wheelSize / rect.width) - c;
    const y = (e.clientY - rect.top) * (wheelSize / rect.height) - c;
    canvas.classList.remove('rig-mode');
    if (Math.hypot(x, y) > c || entries.length < 2) { drawWheel(currentAngle); return; }
    const arc = (Math.PI * 2) / entries.length;
    let a = Math.atan2(y, x) - currentAngle;
    a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    riggedIdx = Math.floor(a / arc) % entries.length;
    drawWheel(currentAngle, riggedIdx);
  });

  function hideResult() { document.getElementById('resultCard').hidden = true; lastWinnerIdx = -1; }

  function spin() {
    if (spinning || entries.length < 2) return;
    spinning = true;
    document.getElementById('spinBtn').disabled = true;
    hideResult();
    canvas.classList.remove('rig-mode');

    const n = entries.length;
    const arc = (Math.PI * 2) / n;
    let totalRotation;
    if (riggedIdx >= 0 && riggedIdx < n) {
      // Land the chosen segment under the pointer (top of the wheel is -PI/2), at a random spot inside it
      const offset = arc * (0.2 + Math.random() * 0.6);
      const target = -Math.PI / 2 - currentAngle - riggedIdx * arc - offset;
      const remainder = ((target % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      totalRotation = Math.PI * 2 * (6 + Math.floor(Math.random() * 4)) + remainder;
    } else {
      totalRotation = Math.PI * 2 * (5 + Math.random() * 6) + Math.random() * Math.PI * 2;
    }
    riggedIdx = -1;

    const duration = reduceMotion ? 1200 : 4200 + Math.random() * 1600;
    const startAngle = currentAngle;
    const startTime = performance.now();
    const easeOut = t => 1 - Math.pow(1 - t, 4);

    function frame(now) {
      const t = Math.min((now - startTime) / duration, 1);
      currentAngle = startAngle + totalRotation * easeOut(t);
      drawWheel(currentAngle);
      if (t < 1) { requestAnimationFrame(frame); return; }
      currentAngle = currentAngle % (Math.PI * 2);
      spinning = false;
      document.getElementById('spinBtn').disabled = entries.length < 2;
      showResult();
    }
    requestAnimationFrame(frame);
  }

  function showResult() {
    const n = entries.length;
    const arc = (Math.PI * 2) / n;
    const norm = (((-currentAngle - Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const idx = Math.floor(norm / arc) % n;
    lastWinnerIdx = idx;
    const winner = entries[idx];
    document.getElementById('resultValue').textContent = winner;
    document.getElementById('removeWinnerBtn').hidden = entries.length <= 1;
    document.getElementById('resultCard').hidden = false;
    drawWheel(currentAngle, idx);
    history.unshift({ n: history.length + 1, value: winner });
    renderHistory();
  }

  document.getElementById('removeWinnerBtn').addEventListener('click', () => {
    if (lastWinnerIdx < 0 || lastWinnerIdx >= entries.length) return;
    entries.splice(lastWinnerIdx, 1);
    hideResult();
    renderEntries();
  });

  function renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    if (!history.length) {
      list.innerHTML = '<li class="history-empty">No spins yet</li>';
      return;
    }
    history.slice(0, 50).forEach(h => {
      const li = document.createElement('li');
      li.className = 'history-item';
      const num = document.createElement('span');
      num.className = 'history-n';
      num.textContent = String(h.n).padStart(2, '0');
      const val = document.createElement('span');
      val.textContent = h.value;
      li.append(num, val);
      list.appendChild(li);
    });
  }

  document.getElementById('clearHistoryBtn').addEventListener('click', () => { history = []; renderHistory(); });

  const historyToggle = document.getElementById('historyToggle');
  historyToggle.addEventListener('click', () => {
    const body = document.getElementById('historyBody');
    const open = !body.hidden;
    body.hidden = open;
    historyToggle.setAttribute('aria-expanded', String(!open));
  });

  document.getElementById('spinBtn').addEventListener('click', spin);

  // Space bar spins when focus is not in a text field
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space') return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'TEXTAREA') return;
    e.preventDefault();
    spin();
  });

  const fsBtn = document.getElementById('fsBtn');
  fsBtn.addEventListener('click', () => {
    try {
      if (!document.fullscreenElement) {
        const p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
        if (p && p.catch) p.catch(() => {});
      } else if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {}
  });
  document.addEventListener('fullscreenchange', () => {
    const on = !!document.fullscreenElement;
    fsBtn.setAttribute('aria-label', on ? 'Exit full screen' : 'Enter full screen');
    document.getElementById('fsIcon').innerHTML = on
      ? '<path d="M6 2v4H2M10 2v4h4M2 10h4v4M14 10h-4v4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';
  });

  // Redraw the wheel when the system theme or the viewer's theme choice changes
  function onThemeChange() { readTheme(); drawWheel(currentAngle, lastWinnerIdx >= 0 ? lastWinnerIdx : riggedIdx); }
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', onThemeChange); else if (mq.addListener) mq.addListener(onThemeChange);
  new MutationObserver(onThemeChange).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  renderEntries();
  renderHistory();
  new ResizeObserver(resizeWheel).observe(wheelArea);
  window.addEventListener('resize', resizeWheel);
  resizeWheel();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => drawWheel(currentAngle));
})();
