/**
 * voices.js
 * Voice personality definitions.
 *
 * Each voice is a parameter set that shapes the synthesis engine.
 * The goal isn't perfect accuracy — it's capturing the *feel* of each character.
 *
 * Tomodachi Life voices are famously weird: they're pitched/chipmunked speech
 * with exaggerated vowel durations, clipped consonants, and no real phonetics —
 * each Mii has a different pitch, speed, and "tone color." We approximate this
 * with pitched oscillators, heavy formant Q, short consonants, and long vowels.
 *
 * GlaDOS uses ring modulation + formant shifting + a slight metallic filter
 * to get that cold, processed, slightly-off-pitch computer voice quality.
 */

window.VOICES = {

  // ── Tomodachi Life: "Peppy" ────────────────────────────────────────────────
  // High-pitched, fast, bubbly — like a Mii with max "lively" personality
  tomoP: {
    id: 'tomoP',
    name: 'Peppy Mii',
    icon: '😄',
    color: '#ff9fdb',
    description: 'high energy · max lively personality · fast + clipped',
    category: 'tomodachi',

    pitch: 380,
    waveform: 'square',          // square wave → nasal/chipmunk quality
    vowelVolume: 0.18,
    consonantVolume: 0.14,
    formantShift: [0.9, 1.15, 1.2], // squeeze formants together
    formantQ: 18,                // tight formants → more pitched/tonal
    attackTime: 0.008,
    releaseTime: 0.012,
    vibrato: 0,
    jitter: 0.05,
    breathiness: 0,

    // Speed multipliers for phoneme durations
    vowelDurMult: 0.8,
    consonantDurMult: 0.55,
    spaceDurMult: 0.6,

    // Pitch rises slightly at end of sentences (chipper quality)
    pitchEnvelope: { attack: 0.01, decay: 0.05, amount: 18 },
  },

  // ── Tomodachi Life: "Sleepy" ───────────────────────────────────────────────
  // Low, slow, monotone — like a low-energy Mii who just woke up
  tomoS: {
    id: 'tomoS',
    name: 'Sleepy Mii',
    icon: '😴',
    color: '#9fbfff',
    description: 'low pitch · slow · drooping tone · barely awake',
    category: 'tomodachi',

    pitch: 115,
    waveform: 'sawtooth',
    vowelVolume: 0.20,
    consonantVolume: 0.12,
    formantShift: [1.1, 0.9, 0.85],
    formantQ: 8,
    attackTime: 0.04,
    releaseTime: 0.06,
    vibrato: 0.2,
    vibratoRate: 3.5,
    jitter: 0.15,
    breathiness: 0.3,

    vowelDurMult: 1.5,
    consonantDurMult: 0.9,
    spaceDurMult: 1.8,

    pitchEnvelope: { attack: 0.02, decay: 0.12, amount: -8 }, // droops down
  },

  // ── Tomodachi Life: "Grumpy" ───────────────────────────────────────────────
  // Mid-low pitch, clipped, buzzy — irritable Mii who doesn't want to talk
  tomoG: {
    id: 'tomoG',
    name: 'Grumpy Mii',
    icon: '😤',
    color: '#ffb347',
    description: 'raspy · mid-low · clipped short words · annoyed energy',
    category: 'tomodachi',

    pitch: 165,
    waveform: 'sawtooth',
    vowelVolume: 0.22,
    consonantVolume: 0.18,
    formantShift: [1.05, 0.95, 0.9],
    formantQ: 6,
    attackTime: 0.005,
    releaseTime: 0.008,
    vibrato: 0,
    jitter: 0.4,                 // heavy jitter → raspy/rough quality
    breathiness: 0.1,

    vowelDurMult: 0.65,
    consonantDurMult: 0.7,
    spaceDurMult: 0.5,

    pitchEnvelope: null,
  },

  // ── Tomodachi Life: "Dreamy" ───────────────────────────────────────────────
  // Mid-high, soft, breathy — floaty Mii who is always spacing out
  tomoD: {
    id: 'tomoD',
    name: 'Dreamy Mii',
    icon: '🌙',
    color: '#c8a8ff',
    description: 'soft · breathy · slow vowels · floaty quality',
    category: 'tomodachi',

    pitch: 255,
    waveform: 'triangle',        // triangle → softer, less buzzy
    vowelVolume: 0.16,
    consonantVolume: 0.10,
    formantShift: [0.95, 1.05, 1.1],
    formantQ: 10,
    attackTime: 0.04,
    releaseTime: 0.08,
    vibrato: 0.35,
    vibratoRate: 4.8,
    jitter: 0.02,
    breathiness: 0.5,            // lots of breath = airy quality

    vowelDurMult: 1.4,
    consonantDurMult: 0.8,
    spaceDurMult: 1.4,

    pitchEnvelope: { attack: 0.03, decay: 0.1, amount: 12 },
  },

  // ── Tomodachi Life: "Hyper" ────────────────────────────────────────────────
  // Super high pitch, extremely fast, tiny — the one that sounds like a bee
  tomoH: {
    id: 'tomoH',
    name: 'Hyper Mii',
    icon: '⚡',
    color: '#ffff66',
    description: 'extreme pitch · very fast · chaotic energy · bee-like',
    category: 'tomodachi',

    pitch: 520,
    waveform: 'square',
    vowelVolume: 0.14,
    consonantVolume: 0.12,
    formantShift: [0.7, 1.3, 1.5],
    formantQ: 22,
    attackTime: 0.004,
    releaseTime: 0.006,
    vibrato: 0,
    jitter: 0.1,
    breathiness: 0,

    vowelDurMult: 0.55,
    consonantDurMult: 0.4,
    spaceDurMult: 0.35,

    pitchEnvelope: { attack: 0.005, decay: 0.03, amount: 35 },
  },

  // ── GlaDOS ────────────────────────────────────────────────────────────────
  // The real challenge. GlaDOS has a synthetic, slightly-pitched-up female
  // voice with robotic ring modulation, very flat affect, precise articulation,
  // and occasional eerie pitch "glitches." We achieve this with:
  // - Moderate pitch (female range but slightly elevated)
  // - Ring modulation at ~30hz (creates subtle "motorized" buzz)
  // - Formant shifting to sound processed/synthesized
  // - Near-zero jitter (she's too controlled to wobble)
  // - Very low breathiness (calculated, not human)
  // - A slight HPF to remove warmth = cold, sterile quality
  glados: {
    id: 'glados',
    name: 'GlaDOS',
    icon: '🤖',
    color: '#ff6b6b',
    description: 'ring modulated · cold precision · slightly robotic · aperture science',
    category: 'glados',

    pitch: 215,
    waveform: 'sawtooth',
    vowelVolume: 0.20,
    consonantVolume: 0.16,

    // Formant shifts: compress lower formants, expand upper → processed quality
    formantShift: [0.88, 1.12, 1.25],
    formantQ: 14,

    attackTime: 0.012,
    releaseTime: 0.018,
    vibrato: 0.05,               // barely any — controlled
    vibratoRate: 6.2,
    jitter: 0.0,                 // zero roughness — she's precise

    breathiness: 0.04,           // minimal — sterile voice
    ringMod: 0.15,               // ring modulation amount
    ringModFreq: 28,             // ~28hz ring mod → subtle mechanical buzz

    vowelDurMult: 1.1,           // slightly elongated for drama
    consonantDurMult: 0.85,
    spaceDurMult: 1.3,           // deliberate pauses

    // Slight downward pitch envelope for deadpan monotone delivery
    pitchEnvelope: { attack: 0.015, decay: 0.08, amount: -6 },
  },

};

// Current active voice
window.activeVoice = VOICES.tomoP;

window.setVoice = function(id) {
  if (VOICES[id]) {
    window.activeVoice = VOICES[id];
    document.documentElement.style.setProperty('--input-accent', activeVoice.color);
    document.documentElement.style.setProperty('--btn-color', activeVoice.color);
    document.documentElement.style.setProperty('--chip-active', activeVoice.color);
    document.documentElement.style.setProperty('--card-color', activeVoice.color);
  }
};
