/**
 * phonemes.js
 * Formant data, phoneme definitions, and grapheme-to-phoneme conversion.
 */

// ── Vowel formants [F1, F2, F3] ───────────────────────────────────────────────
// Based on Peterson & Barney (1952) + IPA approximations
window.VOWELS = {
  'AE': [800,  1700, 2600], // "cat"
  'AH': [730,  1090, 2440], // "cut"
  'AO': [570,   840, 2410], // "caught"
  'AW': [590,  1000, 2600], // "cow"
  'AY': [680,  1700, 2600], // "say"
  'EE': [280,  2250, 2900], // "see"
  'EH': [580,  1800, 2600], // "bet"
  'ER': [490,  1350, 1700], // "bird"
  'IH': [390,  1990, 2550], // "bit"
  'OH': [530,   885, 2430], // "go"
  'OO': [300,   870, 2240], // "boot"
  'UH': [520,  1190, 2390], // "book"
  'AX': [660,  1220, 2500], // schwa (unstressed)
};

// ── Consonant definitions ─────────────────────────────────────────────────────
window.CONSONANTS = {
  // Fricatives
  'S':  { type: 'fricative', freq: 6000, q: 3.5, dur: 0.11, voiced: false },
  'SH': { type: 'fricative', freq: 3500, q: 2.5, dur: 0.11, voiced: false },
  'F':  { type: 'fricative', freq: 4500, q: 1.5, dur: 0.09, voiced: false },
  'TH': { type: 'fricative', freq: 5500, q: 1.2, dur: 0.09, voiced: false },
  'V':  { type: 'fricative', freq: 3000, q: 2.0, dur: 0.09, voiced: true  },
  'Z':  { type: 'fricative', freq: 5500, q: 3.0, dur: 0.09, voiced: true  },
  'ZH': { type: 'fricative', freq: 3000, q: 2.0, dur: 0.09, voiced: true  },
  'HH': { type: 'fricative', freq: 800,  q: 0.5, dur: 0.07, voiced: false },

  // Stops
  'P':  { type: 'stop', voiced: false, freq: 800,  dur: 0.08 },
  'B':  { type: 'stop', voiced: true,  freq: 600,  dur: 0.08 },
  'T':  { type: 'stop', voiced: false, freq: 3500, dur: 0.07 },
  'D':  { type: 'stop', voiced: true,  freq: 2500, dur: 0.07 },
  'K':  { type: 'stop', voiced: false, freq: 1800, dur: 0.08 },
  'G':  { type: 'stop', voiced: true,  freq: 1400, dur: 0.08 },

  // Nasals
  'M':  { type: 'nasal', freq: 250, dur: 0.11 },
  'N':  { type: 'nasal', freq: 250, dur: 0.10 },
  'NG': { type: 'nasal', freq: 250, dur: 0.10 },

  // Approximants
  'L':  { type: 'approx', f1: 380, f2: 1000, dur: 0.09 },
  'R':  { type: 'approx', f1: 460, f2: 1300, dur: 0.09 },
  'W':  { type: 'approx', f1: 290, f2: 680,  dur: 0.08 },
  'Y':  { type: 'approx', f1: 270, f2: 2100, dur: 0.08 },

  // Affricates
  'CH': { type: 'affricate', voiced: false, dur: 0.13 },
  'JH': { type: 'affricate', voiced: true,  dur: 0.13 },
};

// ── Grapheme-to-Phoneme ───────────────────────────────────────────────────────
// Ordered rules: longer digraphs first to avoid partial matches
const G2P_RULES = [
  // Multi-char graphemes
  ['tch', ['CH']],
  ['sch', ['SH']],
  ['ch',  ['CH']],
  ['sh',  ['SH']],
  ['th',  ['TH']],
  ['ph',  ['F']],
  ['wh',  ['W']],
  ['ng',  ['NG']],
  ['gh',  []],       // silent
  ['wr',  ['R']],
  ['kn',  ['N']],
  ['ck',  ['K']],
  ['qu',  ['K','W']],
  ['dge', ['JH']],
  ['dg',  ['JH']],

  // Vowel digraphs
  ['oo',  ['OO']],
  ['ou',  ['AW']],
  ['ow',  ['AW']],
  ['oi',  ['OH','IH']],
  ['oy',  ['OH','IH']],
  ['oa',  ['OH']],
  ['au',  ['AO']],
  ['aw',  ['AO']],
  ['ai',  ['AY']],
  ['ay',  ['AY']],
  ['ea',  ['EE']],
  ['ee',  ['EE']],
  ['ie',  ['EE']],
  ['ue',  ['OO']],
  ['ew',  ['OO']],
  ['ui',  ['OO']],

  // Singles
  ['a', ['AE']], ['b', ['B']],  ['c', ['K']],  ['d', ['D']],
  ['e', ['EH']], ['f', ['F']],  ['g', ['G']],  ['h', ['HH']],
  ['i', ['IH']], ['j', ['JH']], ['k', ['K']],  ['l', ['L']],
  ['m', ['M']],  ['n', ['N']],  ['o', ['OH']], ['p', ['P']],
  ['q', ['K']],  ['r', ['R']],  ['s', ['S']],  ['t', ['T']],
  ['u', ['AH']], ['v', ['V']],  ['w', ['W']],  ['x', ['K','S']],
  ['y', ['Y']],  ['z', ['Z']],
];

window.g2p = function(word) {
  word = word.toLowerCase().trim().replace(/[^a-z]/g, '');
  const phonemes = [];
  let i = 0;
  while (i < word.length) {
    let matched = false;
    for (const [graph, phones] of G2P_RULES) {
      if (word.slice(i, i + graph.length) === graph) {
        phones.forEach(p => phonemes.push(p));
        i += graph.length;
        matched = true;
        break;
      }
    }
    if (!matched) i++;
  }
  return phonemes;
};

window.textToPhonemes = function(text) {
  const result = [];
  const words = text.split(/\s+/).filter(Boolean);
  words.forEach((word, wi) => {
    g2p(word).forEach(p => result.push({ phoneme: p, word }));
    if (wi < words.length - 1) result.push({ phoneme: ' ', word: ' ' });
  });
  return result;
};
