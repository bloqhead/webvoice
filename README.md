# VOXEL — Web Audio Voice Synth

> Spoken words using nothing but Web Audio. Zero libraries.

A rudimentary voice synthesizer built entirely with the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API). No dependencies, no libraries, no speech synthesis API — just oscillators, filters, and noise.

## Voice Characters

| Voice | Pitch | Character |
|-------|-------|-----------|
| Peppy Mii | 380hz | High-energy Tomodachi Life character, square wave |
| Sleepy Mii | 115hz | Low, droopy, barely awake |
| Grumpy Mii | 165hz | Raspy and clipped, annoyed energy |
| Dreamy Mii | 255hz | Soft triangle wave, lots of breathiness |
| Hyper Mii | 520hz | Extreme pitch, bee-like chaos |
| GlaDOS | 215hz | Ring modulated, cold precision, robotic |

## How It Works

### Vowels → Formant Synthesis
Human vowel sounds are defined by **formant frequencies** — resonant peaks in the vocal tract. The vowel "EE" has formants at ~280hz and ~2250hz; "AH" has them at ~730hz and ~1090hz. We create a sawtooth/square oscillator (the glottal source) and run it through bandpass filters tuned to each formant. Stack three of these per vowel and you get recognizable vowel sounds.

### Consonants → Physics-Based Types
- **Fricatives** (S, F, SH, TH) — filtered white noise at specific frequency ranges
- **Stops** (P, T, K, B, D, G) — closure phase (silence or voiced murmur) + burst of filtered noise
- **Nasals** (M, N, NG) — voiced oscillator through a notch filter and lowpass (removes upper harmonics, adds nasal resonance)
- **Approximants** (L, R, W, Y) — like mini-vowels: voiced source through formant filters, quickly transitioning

### Voice Shaping
Each voice character modifies the synthesis via:
- `waveform` — sawtooth (buzzy), square (nasal/chipmunk), triangle (soft)
- `formantShift` — scale each formant frequency to shift the perceived resonance
- `jitter` — adds random pitch wobble → roughness/raspiness
- `vibrato` — periodic pitch oscillation → expressiveness
- `breathiness` — adds noise layer under vowels → airy quality
- `ringMod` — multiplies signal by a sine wave → robotic/processed sound (GlaDOS)

### G2P (Grapheme-to-Phoneme)
Rule-based, not a lookup table. Longer digraphs are matched first (`tch`, `ch`, `sh`, `oo`, `ea`...) before single characters. Not perfect — English spelling is chaos — but handles most common words.

## Files

```
index.html   — Layout and entry point
style.css    — Styling (dark terminal aesthetic)
phonemes.js  — Formant data, consonant definitions, G2P rules
synth.js     — Core audio synthesis engine
voices.js    — Voice personality parameter sets
ui.js        — Rendering, oscilloscope, event handling
```

## Running

No build step. Just open `index.html` in a browser. Chrome/Firefox both work.

---

*The Tomodachi Life voices are an approximation of the game's feel — that game uses actual recorded/processed speech, not synthesis. This is a from-scratch recreation of the vibe using pure math.*
