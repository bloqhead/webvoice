/**
 * ui.js — WebVoice UI controller
 * Runs as an IIFE after all scripts have loaded (scripts are at end of <body>)
 */

let activeVoice = VOICES.tomoP;
let isSpeaking = false;

function setVoiceColor(color) {
  document.documentElement.style.setProperty('--voice-color', color);
}

function setVoice(id) {
  activeVoice = VOICES[id];
  setVoiceColor(activeVoice.color);
}

function renderVoiceGrid() {
  const grid = document.getElementById('voiceGrid');
  grid.innerHTML = '';
  Object.values(VOICES).forEach(voice => {
    const card = document.createElement('div');
    card.className = 'voice-card' + (voice.id === activeVoice.id ? ' active' : '');
    card.innerHTML = '<div class="vc-icon">' + voice.icon + '</div>' +
      '<div class="vc-name">' + voice.name + '</div>' +
      '<div class="vc-desc">' + voice.description + '</div>';
    card.addEventListener('click', () => {
      document.querySelectorAll('.voice-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      setVoice(voice.id);
      renderParamsPanel();
      setStatus('ready', 'voice: ' + voice.name);
    });
    grid.appendChild(card);
  });
}

function renderParamsPanel() {
  const voice = activeVoice;
  document.getElementById('voiceDesc').textContent = voice.description;
  const grid = document.getElementById('settingsGrid');
  grid.innerHTML = '';

  const params = [
    { key: 'pitch',        label: 'pitch',        min: 60,  max: 600, step: 1,    fmt: function(v) { return Math.round(v) + ' hz'; } },
    { key: 'jitter',       label: 'roughness',    min: 0,   max: 1,   step: 0.01, fmt: function(v) { return Math.round(v * 100) + '%'; } },
    { key: 'breathiness',  label: 'breathiness',  min: 0,   max: 1,   step: 0.01, fmt: function(v) { return Math.round(v * 100) + '%'; } },
    { key: 'vowelDurMult', label: 'vowel length', min: 0.3, max: 2.5, step: 0.05, fmt: function(v) { return parseFloat(v).toFixed(2) + 'x'; } },
  ];

  params.forEach(function(param) {
    var key = param.key, label = param.label, min = param.min,
        max = param.max, step = param.step, fmt = param.fmt;
    var val = voice[key] != null ? voice[key] : 0;
    var row = document.createElement('div');
    row.className = 'knob-row';

    var labelEl = document.createElement('span');
    labelEl.className = 'knob-label';
    labelEl.textContent = label + ' ';

    var valEl = document.createElement('span');
    valEl.className = 'knob-value';
    valEl.textContent = fmt(val);
    labelEl.appendChild(valEl);

    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min; slider.max = max; slider.step = step; slider.value = val;
    slider.addEventListener('input', function() {
      activeVoice[key] = parseFloat(slider.value);
      valEl.textContent = fmt(slider.value);
    });

    row.appendChild(labelEl);
    row.appendChild(slider);
    grid.appendChild(row);
  });
}

function renderPhonemeDisplay(seq) {
  var el = document.getElementById('phonemeDisplay');
  el.innerHTML = '';
  seq.forEach(function(item) {
    var phoneme = item.phoneme;
    var chip = document.createElement('span');
    if (phoneme === ' ') {
      chip.className = 'phoneme-chip space';
      chip.textContent = '·';
    } else if (VOWELS[phoneme]) {
      chip.className = 'phoneme-chip vowel';
      chip.textContent = phoneme;
    } else {
      chip.className = 'phoneme-chip consonant';
      chip.textContent = phoneme;
    }
    el.appendChild(chip);
  });
}

function animateChips(schedule, nowTime) {
  var chips = Array.from(document.querySelectorAll('.phoneme-chip'));
  schedule.forEach(function(item, i) {
    if (item.phoneme === ' ' || !chips[i]) return;
    var ms = (item.startTime - nowTime) * 1000;
    setTimeout(function() { chips[i] && chips[i].classList.add('active'); }, Math.max(0, ms));
    setTimeout(function() { chips[i] && chips[i].classList.remove('active'); }, Math.max(0, ms + item.duration * 1000));
  });
}

function speakText() {
  if (isSpeaking) return;
  var text = document.getElementById('wordInput').value.trim();
  if (!text) return;

  SynthEngine.getCtx();
  var voice = activeVoice;
  var seq = textToPhonemes(text);
  renderPhonemeDisplay(seq);

  var BASE_V = 0.16, BASE_C = 0.10, BASE_SP = 0.11;
  var t = SynthEngine.currentTime() + 0.06;
  var schedule = [];

  seq.forEach(function(item) {
    var phoneme = item.phoneme;
    var dur;
    if (phoneme === ' ') {
      dur = BASE_SP * (voice.spaceDurMult || 1.0);
    } else if (VOWELS[phoneme]) {
      dur = BASE_V * (voice.vowelDurMult || 1.0);
    } else {
      var def = CONSONANTS[phoneme];
      dur = def ? def.dur * (voice.consonantDurMult || 1.0) : BASE_C;
    }
    schedule.push({ phoneme: phoneme, startTime: t, duration: dur });
    t += dur * 0.83;
  });

  schedule.forEach(function(item) {
    if (item.phoneme !== ' ') SynthEngine.schedulePhoneme(item.phoneme, item.startTime, item.duration, voice);
  });

  var nowTime = SynthEngine.currentTime();
  animateChips(schedule, nowTime);

  var totalMs = (t - nowTime + 0.2) * 1000;
  isSpeaking = true;
  document.getElementById('speakBtn').classList.add('speaking');
  setStatus('active', 'speaking · ' + voice.name + ' · ' + seq.filter(function(p) { return p.phoneme !== ' '; }).length + ' phonemes');

  setTimeout(function() {
    isSpeaking = false;
    document.getElementById('speakBtn').classList.remove('speaking');
    setStatus('ready', 'done · ' + voice.name);
  }, totalMs);
}

function setStatus(state, msg) {
  document.getElementById('statusText').textContent = msg;
  document.getElementById('statusDot').className = 'status-dot ' + state;
}

function initScope() {
  var canvas = document.getElementById('scope');
  var c = canvas.getContext('2d');
  function resize() {
    canvas.width = canvas.offsetWidth * devicePixelRatio;
    canvas.height = canvas.offsetHeight * devicePixelRatio;
  }
  resize();
  window.addEventListener('resize', resize);
  function frame() {
    requestAnimationFrame(frame);
    var W = canvas.width, H = canvas.height;
    c.fillStyle = '#0a0c0f';
    c.fillRect(0, 0, W, H);
    c.strokeStyle = '#1e2830'; c.lineWidth = 1;
    for (var x = 0; x <= W; x += W / 8) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
    }
    c.beginPath(); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.stroke();
    var analyser = SynthEngine.getAnalyser();
    if (!analyser) {
      c.strokeStyle = '#1e3828'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.stroke();
      return;
    }
    var buf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(buf);
    var peak = 0;
    for (var j = 0; j < buf.length; j++) peak = Math.max(peak, buf[j]);
    var hot = peak > 130;
    var col = activeVoice ? activeVoice.color : '#00ff9f';
    c.strokeStyle = hot ? col : '#1e3828';
    c.shadowColor = hot ? col : 'transparent';
    c.shadowBlur = hot ? 10 : 0;
    c.lineWidth = hot ? 2 : 1.5;
    c.beginPath();
    for (var i = 0; i < buf.length; i++) {
      var px = (i / buf.length) * W;
      var py = ((buf[i] / 128) - 1) * H * 0.44 + H / 2;
      i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
    }
    c.stroke();
    c.shadowBlur = 0;
  }
  frame();
}

// Boot — runs immediately since scripts are at end of <body>
(function() {
  setVoiceColor(activeVoice.color);
  renderVoiceGrid();
  renderParamsPanel();
  initScope();
  setStatus('ready', 'select a voice and type something');
  document.getElementById('speakBtn').addEventListener('click', speakText);
  document.getElementById('wordInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') speakText();
  });
})();
