/**
 * ui.js
 * UI rendering, oscilloscope, phoneme animation, event handling.
 */

let isSpeaking = false;
let scopeAnimId = null;

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  renderVoiceGrid();
  setVoice('tomoP');
  updateVoiceUI();
  initScope();

  document.getElementById('wordInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') speakText();
  });
});

// ── Voice Grid ────────────────────────────────────────────────────────────────
function renderVoiceGrid() {
  const grid = document.getElementById('voiceGrid');
  grid.innerHTML = '';

  Object.values(VOICES).forEach(voice => {
    const card = document.createElement('div');
    card.className = 'voice-card' + (voice.id === activeVoice.id ? ' active' : '');
    card.style.setProperty('--card-color', voice.color);
    card.dataset.voiceId = voice.id;
    card.innerHTML = `
      <div class="vc-icon">${voice.icon}</div>
      <div class="vc-name">${voice.name}</div>
      <div class="vc-desc">${voice.description}</div>
    `;
    card.addEventListener('click', () => {
      document.querySelectorAll('.voice-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      setVoice(voice.id);
      updateVoiceUI();
      setStatus('ready', `voice: ${voice.name}`);
    });
    grid.appendChild(card);
  });
}

// ── Voice params panel ────────────────────────────────────────────────────────
function updateVoiceUI() {
  const voice = activeVoice;
  document.getElementById('voiceDesc').textContent = voice.description;

  const grid = document.getElementById('settingsGrid');
  grid.innerHTML = '';

  const params = [
    { key: 'pitch',        label: 'pitch',       min: 60,  max: 600, step: 1,   fmt: v => `${v} hz`,            suffix: ' hz' },
    { key: 'jitter',       label: 'roughness',   min: 0,   max: 1,   step: 0.01,fmt: v => `${Math.round(v*100)}%`, suffix: '' },
    { key: 'breathiness',  label: 'breathiness', min: 0,   max: 1,   step: 0.01,fmt: v => `${Math.round(v*100)}%`, suffix: '' },
    { key: 'vowelDurMult', label: 'vowel length',min: 0.3, max: 2.5, step: 0.05,fmt: v => `${parseFloat(v).toFixed(2)}×`, suffix: '' },
  ];

  params.forEach(({ key, label, min, max, step, fmt }) => {
    const val = voice[key] ?? 0;
    const row = document.createElement('div');
    row.className = 'knob-row';
    const valId = `kv-${key}`;
    row.innerHTML = `
      <span class="knob-label">${label} <span class="knob-value" id="${valId}">${fmt(val)}</span></span>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${val}"
             oninput="liveParam('${key}', this.value, '${valId}', ${JSON.stringify(fmt.toString())})">
    `;
    grid.appendChild(row);
  });
}

window.liveParam = function(key, rawVal, labelId, _fmtStr) {
  // Parse value
  const val = parseFloat(rawVal);
  activeVoice[key] = val;

  // fmt is serialized; just reconstruct display
  const fmtMap = {
    pitch: v => `${Math.round(v)} hz`,
    jitter: v => `${Math.round(v * 100)}%`,
    breathiness: v => `${Math.round(v * 100)}%`,
    vowelDurMult: v => `${parseFloat(v).toFixed(2)}×`,
  };
  const fmt = fmtMap[key];
  if (fmt) document.getElementById(labelId).textContent = fmt(val);
};

// ── Speak ─────────────────────────────────────────────────────────────────────
window.speakText = function() {
  if (isSpeaking) return;

  const text = document.getElementById('wordInput').value.trim();
  if (!text) return;

  SynthEngine.getCtx(); // ensure ctx started (must be from user gesture)

  const voice = activeVoice;
  const phonemeSeq = textToPhonemes(text);
  renderPhonemeDisplay(phonemeSeq);

  // Base durations in seconds (voice multipliers applied per-type)
  const BASE_VOWEL = 0.16;
  const BASE_CON   = 0.10;
  const BASE_SPACE = 0.11;

  let t = SynthEngine.currentTime() + 0.06;
  const schedule = [];

  phonemeSeq.forEach(({ phoneme }) => {
    if (phoneme === ' ') {
      const dur = BASE_SPACE * (voice.spaceDurMult || 1);
      schedule.push({ phoneme, startTime: t, duration: dur });
      t += dur;
      return;
    }
    const isVowel = phoneme in VOWELS;
    const conDef = CONSONANTS[phoneme];
    let dur;
    if (isVowel) {
      dur = BASE_VOWEL * (voice.vowelDurMult || 1.0);
    } else if (conDef) {
      dur = conDef.dur * (voice.consonantDurMult || 1.0);
    } else {
      dur = BASE_CON;
    }
    schedule.push({ phoneme, startTime: t, duration: dur });
    // Slight coarticulation overlap
    t += dur * 0.82;
  });

  const totalDur = (t - SynthEngine.currentTime() + 0.15) * 1000;

  // Schedule all phonemes
  schedule.forEach(({ phoneme, startTime, duration }) => {
    if (phoneme === ' ') return;
    SynthEngine.schedulePhoneme(phoneme, startTime, duration, voice);
  });

  // Animate chips
  animateChips(schedule, phonemeSeq);

  // UI state
  isSpeaking = true;
  document.getElementById('speakBtn').classList.add('speaking');
  setStatus('active', `speaking · ${voice.name} · ${phonemeSeq.filter(p => p.phoneme !== ' ').length} phonemes`);

  setTimeout(() => {
    isSpeaking = false;
    document.getElementById('speakBtn').classList.remove('speaking');
    setStatus('ready', `done · ${voice.name}`);
  }, totalDur);
};

// ── Phoneme display ───────────────────────────────────────────────────────────
function renderPhonemeDisplay(phonemeSeq) {
  const container = document.getElementById('phonemeDisplay');
  container.innerHTML = '';
  phonemeSeq.forEach(({ phoneme }) => {
    const chip = document.createElement('span');
    if (phoneme === ' ') {
      chip.className = 'phoneme-chip space';
      chip.textContent = '·';
    } else if (phoneme in VOWELS) {
      chip.className = 'phoneme-chip vowel';
      chip.textContent = phoneme;
    } else {
      chip.className = 'phoneme-chip consonant';
      chip.textContent = phoneme;
    }
    container.appendChild(chip);
  });
}

function animateChips(schedule, phonemeSeq) {
  const chips = Array.from(document.querySelectorAll('.phoneme-chip'));
  const now = SynthEngine.currentTime();

  schedule.forEach(({ phoneme, startTime, duration }, i) => {
    const chip = chips[i];
    if (!chip || phoneme === ' ') return;
    const delayMs = (startTime - now) * 1000;
    setTimeout(() => chip.classList.add('active'), delayMs);
    setTimeout(() => chip.classList.remove('active'), delayMs + duration * 1000);
  });
}

// ── Oscilloscope ──────────────────────────────────────────────────────────────
function initScope() {
  const canvas = document.getElementById('scope');
  const c = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.offsetWidth * devicePixelRatio;
    canvas.height = canvas.offsetHeight * devicePixelRatio;
  }
  resize();
  window.addEventListener('resize', resize);

  function frame() {
    scopeAnimId = requestAnimationFrame(frame);
    const W = canvas.width, H = canvas.height;
    const analyser = SynthEngine.getAnalyser();

    c.clearRect(0, 0, W, H);
    c.fillStyle = '#0a0c0f';
    c.fillRect(0, 0, W, H);

    // Grid lines
    c.strokeStyle = '#1e2830';
    c.lineWidth = 1;
    for (let x = 0; x <= W; x += W / 8) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
    }
    c.beginPath(); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.stroke();

    if (!analyser) {
      drawFlatline(c, W, H);
      return;
    }

    const buf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(buf);

    // Check if signal is active (not silence)
    const maxVal = Math.max(...buf);
    const active = maxVal > 130;

    const color = activeVoice ? activeVoice.color : '#00ff9f';

    c.strokeStyle = active ? color : '#1e4030';
    c.shadowColor = active ? color : 'transparent';
    c.shadowBlur = active ? 10 : 0;
    c.lineWidth = active ? 2 : 1.5;
    c.beginPath();

    for (let i = 0; i < buf.length; i++) {
      const x = (i / buf.length) * W;
      const y = ((buf[i] / 128) - 1) * (H * 0.44) + H / 2;
      i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.stroke();
    c.shadowBlur = 0;
  }

  frame();
}

function drawFlatline(c, W, H) {
  c.strokeStyle = '#1e4030';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(0, H / 2);
  c.lineTo(W, H / 2);
  c.stroke();
}

// ── Status ─────────────────────────────────────────────────────────────────────
function setStatus(state, msg) {
  document.getElementById('statusText').textContent = msg;
  const dot = document.getElementById('statusDot');
  dot.className = 'status-dot ' + state;
}
