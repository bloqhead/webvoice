/**
 * synth.js
 * Core Web Audio synthesis engine.
 * All sound generation lives here; voice personalities live in voices.js.
 */

window.SynthEngine = (() => {
  let ctx = null;
  let analyser = null;
  let masterGain = null;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      masterGain = ctx.createGain();
      masterGain.gain.value = 1.0;
      masterGain.connect(analyser);
      analyser.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function getAnalyser() { return analyser; }

  // ── Utility nodes ───────────────────────────────────────────────────────────
  function makeGain(audioCtx, val) {
    const g = audioCtx.createGain();
    g.gain.value = val;
    return g;
  }

  function makeNoise(audioCtx, duration) {
    const bufSize = Math.ceil(audioCtx.sampleRate * (duration + 0.05));
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  function makeBPF(audioCtx, freq, q) {
    const f = audioCtx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  function makeLPF(audioCtx, freq) {
    const f = audioCtx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    return f;
  }

  function makeHPF(audioCtx, freq) {
    const f = audioCtx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = freq;
    return f;
  }

  function makeNotch(audioCtx, freq, q) {
    const f = audioCtx.createBiquadFilter();
    f.type = 'notch';
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  // ── Glottal source ──────────────────────────────────────────────────────────
  // Creates the voiced buzz: sawtooth + optional jitter + optional pulse shaping
  function makeVoicedSource(audioCtx, startTime, duration, voice) {
    const osc = audioCtx.createOscillator();
    osc.type = voice.waveform || 'sawtooth';
    osc.frequency.value = voice.pitch;

    // Vibrato (natural pitch wobble)
    if (voice.vibrato && voice.vibrato > 0) {
      const vib = audioCtx.createOscillator();
      vib.frequency.value = voice.vibratoRate || 5.5;
      const vg = makeGain(audioCtx, voice.pitch * voice.vibrato * 0.015);
      vib.connect(vg);
      vg.connect(osc.frequency);
      vib.start(startTime);
      vib.stop(startTime + duration + 0.1);
    }

    // Jitter (roughness/creakiness)
    if (voice.jitter && voice.jitter > 0) {
      const jit = audioCtx.createOscillator();
      jit.frequency.value = 2 + Math.random() * 4;
      const jg = makeGain(audioCtx, voice.pitch * voice.jitter * 0.04);
      jit.connect(jg);
      jg.connect(osc.frequency);
      jit.start(startTime);
      jit.stop(startTime + duration + 0.1);
    }

    // Pitch envelope (for expressive rise/fall)
    if (voice.pitchEnvelope) {
      const { attack, decay, amount } = voice.pitchEnvelope;
      osc.frequency.setValueAtTime(voice.pitch, startTime);
      osc.frequency.linearRampToValueAtTime(voice.pitch + amount, startTime + (attack || 0.02));
      osc.frequency.exponentialRampToValueAtTime(voice.pitch, startTime + (attack || 0.02) + (decay || 0.06));
    }

    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
    return osc;
  }

  // ── Vowel synthesis ─────────────────────────────────────────────────────────
  function scheduleVowel(audioCtx, dest, phoneme, startTime, duration, voice) {
    const baseFormants = VOWELS[phoneme] || VOWELS['AX'];

    // Voice can shift formants (e.g. GlaDOS shifts them to sound robotic)
    const formantShift = voice.formantShift || 1.0;
    const formants = baseFormants.map((f, i) => {
      const shift = Array.isArray(formantShift) ? formantShift[i] : formantShift;
      return f * (shift || 1.0);
    });

    const envGain = makeGain(audioCtx, 0);
    const vol = voice.vowelVolume || 0.22;
    envGain.gain.setValueAtTime(0, startTime);
    envGain.gain.linearRampToValueAtTime(vol, startTime + (voice.attackTime || 0.02));
    envGain.gain.setValueAtTime(vol, startTime + duration - (voice.releaseTime || 0.02));
    envGain.gain.linearRampToValueAtTime(0, startTime + duration);
    envGain.connect(dest);

    const src = makeVoicedSource(audioCtx, startTime, duration, voice);

    // Per-formant band-pass filters
    formants.forEach((fq, idx) => {
      const bpf = makeBPF(audioCtx, fq, voice.formantQ || (12 - idx * 2.5));
      const fGain = makeGain(audioCtx, idx === 0 ? 1.0 : idx === 1 ? 0.65 : 0.35);
      src.connect(bpf);
      bpf.connect(fGain);
      fGain.connect(envGain);
    });

    // Optional breathiness (noise layer under vowels)
    if (voice.breathiness && voice.breathiness > 0) {
      const breath = makeNoise(audioCtx, duration);
      const blpf = makeLPF(audioCtx, 3000);
      const bg = makeGain(audioCtx, 0);
      bg.gain.setValueAtTime(0, startTime);
      bg.gain.linearRampToValueAtTime(voice.breathiness * 0.1, startTime + 0.02);
      bg.gain.setValueAtTime(voice.breathiness * 0.1, startTime + duration - 0.02);
      bg.gain.linearRampToValueAtTime(0, startTime + duration);
      breath.connect(blpf);
      blpf.connect(bg);
      bg.connect(dest);
      breath.start(startTime);
      breath.stop(startTime + duration + 0.05);
    }

    // Optional ring modulation (robotic effect — key for GlaDOS)
    if (voice.ringMod && voice.ringMod > 0) {
      const ringOsc = audioCtx.createOscillator();
      ringOsc.frequency.value = voice.ringModFreq || 50;
      ringOsc.type = 'sine';
      const ringGain = makeGain(audioCtx, voice.ringMod);
      ringOsc.connect(ringGain);
      // Modulate the envelope gain
      ringGain.connect(envGain.gain);
      ringOsc.start(startTime);
      ringOsc.stop(startTime + duration + 0.1);
    }
  }

  // ── Fricative ───────────────────────────────────────────────────────────────
  function scheduleFricative(audioCtx, dest, def, startTime, duration, voice) {
    const freqShift = (Array.isArray(voice.formantShift) ? voice.formantShift[2] : voice.formantShift) || 1.0;
    const noise = makeNoise(audioCtx, duration);
    const bpf = makeBPF(audioCtx, def.freq * freqShift, def.q);

    const vol = voice.consonantVolume || 0.16;
    const g = makeGain(audioCtx, 0);
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(vol, startTime + 0.01);
    g.gain.setValueAtTime(vol, startTime + duration - 0.01);
    g.gain.linearRampToValueAtTime(0, startTime + duration);

    noise.connect(bpf);
    bpf.connect(g);
    g.connect(dest);
    noise.start(startTime);
    noise.stop(startTime + duration + 0.05);

    if (def.voiced) {
      const osc = audioCtx.createOscillator();
      osc.type = voice.waveform || 'sawtooth';
      osc.frequency.value = voice.pitch;
      const vg = makeGain(audioCtx, 0.05);
      osc.connect(vg);
      vg.connect(dest);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    }
  }

  // ── Stop ────────────────────────────────────────────────────────────────────
  function scheduleStop(audioCtx, dest, def, startTime, duration, voice) {
    const closure = duration * 0.45;
    const burst = duration * 0.55;
    const burstStart = startTime + closure;

    if (def.voiced) {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = voice.pitch * 0.5;
      const mg = makeGain(audioCtx, 0.04);
      osc.connect(mg);
      mg.connect(dest);
      osc.start(startTime);
      osc.stop(burstStart);
    }

    const noise = makeNoise(audioCtx, burst);
    const freqShift = (Array.isArray(voice.formantShift) ? voice.formantShift[1] : voice.formantShift) || 1.0;
    const bpf = makeBPF(audioCtx, def.freq * freqShift, 5);

    const bg = makeGain(audioCtx, 0);
    bg.gain.setValueAtTime(voice.consonantVolume * 1.4 || 0.26, burstStart);
    bg.gain.exponentialRampToValueAtTime(0.001, burstStart + burst);

    noise.connect(bpf);
    bpf.connect(bg);
    bg.connect(dest);
    noise.start(burstStart);
    noise.stop(burstStart + burst + 0.05);
  }

  // ── Nasal ───────────────────────────────────────────────────────────────────
  function scheduleNasal(audioCtx, dest, def, startTime, duration, voice) {
    const src = makeVoicedSource(audioCtx, startTime, duration, voice);
    const notch = makeNotch(audioCtx, 1000, 2);
    const lpf = makeLPF(audioCtx, 700);

    const vol = (voice.vowelVolume || 0.22) * 0.8;
    const g = makeGain(audioCtx, 0);
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(vol, startTime + 0.015);
    g.gain.setValueAtTime(vol, startTime + duration - 0.015);
    g.gain.linearRampToValueAtTime(0, startTime + duration);

    src.connect(notch);
    notch.connect(lpf);
    lpf.connect(g);
    g.connect(dest);
  }

  // ── Approximant ─────────────────────────────────────────────────────────────
  function scheduleApprox(audioCtx, dest, def, startTime, duration, voice) {
    const formantShift = voice.formantShift || 1.0;
    const f1 = def.f1 * (Array.isArray(formantShift) ? formantShift[0] : formantShift);
    const f2 = def.f2 * (Array.isArray(formantShift) ? formantShift[1] : formantShift);

    const src = makeVoicedSource(audioCtx, startTime, duration, voice);
    const vol = (voice.vowelVolume || 0.22) * 0.65;

    const g1 = makeGain(audioCtx, 0);
    g1.gain.setValueAtTime(0, startTime);
    g1.gain.linearRampToValueAtTime(vol, startTime + 0.015);
    g1.gain.setValueAtTime(vol, startTime + duration - 0.01);
    g1.gain.linearRampToValueAtTime(0, startTime + duration);

    const bpf1 = makeBPF(audioCtx, f1, 8);
    const bpf2 = makeBPF(audioCtx, f2, 6);
    const g2 = makeGain(audioCtx, 0.7);

    src.connect(bpf1); bpf1.connect(g1); g1.connect(dest);
    src.connect(bpf2); bpf2.connect(g2); g2.connect(dest);
  }

  // ── Affricate ───────────────────────────────────────────────────────────────
  function scheduleAffricate(audioCtx, dest, def, startTime, duration, voice) {
    const half = duration * 0.5;
    scheduleStop(audioCtx, dest,
      { voiced: def.voiced, freq: def.voiced ? 2200 : 3000 },
      startTime, half, voice);
    scheduleFricative(audioCtx, dest,
      { freq: def.voiced ? 3000 : 3800, q: 2.5, voiced: def.voiced },
      startTime + half, half, voice);
  }

  // ── Main schedule function ───────────────────────────────────────────────────
  function schedulePhoneme(phoneme, startTime, duration, voice) {
    const audioCtx = getCtx();
    const dest = masterGain;

    if (phoneme in VOWELS) {
      scheduleVowel(audioCtx, dest, phoneme, startTime, duration, voice);
    } else {
      const def = CONSONANTS[phoneme];
      if (!def) return;
      switch (def.type) {
        case 'fricative':  scheduleFricative(audioCtx, dest, def, startTime, duration, voice); break;
        case 'stop':       scheduleStop(audioCtx, dest, def, startTime, duration, voice); break;
        case 'nasal':      scheduleNasal(audioCtx, dest, def, startTime, duration, voice); break;
        case 'approx':     scheduleApprox(audioCtx, dest, def, startTime, duration, voice); break;
        case 'affricate':  scheduleAffricate(audioCtx, dest, def, startTime, duration, voice); break;
      }
    }
  }

  function currentTime() { return getCtx().currentTime; }

  return { getCtx, getAnalyser, schedulePhoneme, currentTime };
})();
