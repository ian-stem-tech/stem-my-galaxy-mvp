export interface ConstellationDef {
  id: string;
  name: string;
  stars: { x: number; y: number }[];
  edges: [number, number][];
  darkMatter: { x: number; y: number; label: string }[];
}

// Coordinates normalized to 0-1 range, based on real IAU constellation geometries
// Scaled and centered for visual appeal

export const CONSTELLATIONS: Record<string, ConstellationDef> = {
  orion: {
    id: 'orion',
    name: 'Orion',
    stars: [
      { x: 0.42, y: 0.12 }, // Betelgeuse (left shoulder)
      { x: 0.58, y: 0.15 }, // Bellatrix (right shoulder)
      { x: 0.45, y: 0.38 }, // Mintaka (belt left)
      { x: 0.50, y: 0.40 }, // Alnilam (belt center)
      { x: 0.55, y: 0.42 }, // Alnitak (belt right)
      { x: 0.38, y: 0.72 }, // Saiph (left foot)
      { x: 0.62, y: 0.75 }, // Rigel (right foot)
    ],
    edges: [[0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]],
    darkMatter: [
      { x: 0.50, y: 0.25, label: 'Nebula zone' },
      { x: 0.30, y: 0.50, label: 'Hidden frequency' },
      { x: 0.70, y: 0.55, label: 'Uncharted sound' },
    ],
  },

  scorpius: {
    id: 'scorpius',
    name: 'Scorpius',
    stars: [
      { x: 0.50, y: 0.08 }, // Dschubba (head)
      { x: 0.45, y: 0.12 }, // Acrab (head left)
      { x: 0.55, y: 0.12 }, // Head right
      { x: 0.48, y: 0.22 }, // Upper body
      { x: 0.50, y: 0.32 }, // Antares
      { x: 0.52, y: 0.42 }, // Mid body
      { x: 0.55, y: 0.50 }, // Lower body
      { x: 0.60, y: 0.58 }, // Tail curve 1
      { x: 0.67, y: 0.64 }, // Tail curve 2
      { x: 0.72, y: 0.72 }, // Tail curve 3
      { x: 0.74, y: 0.80 }, // Tail curve 4
      { x: 0.70, y: 0.86 }, // Shaula (stinger left)
      { x: 0.76, y: 0.88 }, // Lesath (stinger right)
    ],
    edges: [[0, 1], [0, 2], [0, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [10, 12]],
    darkMatter: [
      { x: 0.35, y: 0.35, label: 'Void frequency' },
      { x: 0.80, y: 0.45, label: 'Shadow resonance' },
      { x: 0.40, y: 0.70, label: 'Deep space signal' },
      { x: 0.60, y: 0.30, label: 'Unheard wavelength' },
    ],
  },

  lyra: {
    id: 'lyra',
    name: 'Lyra',
    stars: [
      { x: 0.50, y: 0.15 }, // Vega (brightest)
      { x: 0.42, y: 0.40 }, // Sheliak
      { x: 0.58, y: 0.40 }, // Sulafat
      { x: 0.40, y: 0.65 }, // Delta1
      { x: 0.60, y: 0.65 }, // Delta2
    ],
    edges: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [1, 2]],
    darkMatter: [
      { x: 0.50, y: 0.50, label: 'Inner resonance' },
      { x: 0.30, y: 0.25, label: 'Lost harmony' },
      { x: 0.70, y: 0.80, label: 'Silent octave' },
    ],
  },

  cassiopeia: {
    id: 'cassiopeia',
    name: 'Cassiopeia',
    stars: [
      { x: 0.20, y: 0.35 }, // Caph
      { x: 0.35, y: 0.20 }, // Schedar
      { x: 0.50, y: 0.40 }, // Gamma Cas
      { x: 0.65, y: 0.18 }, // Ruchbah
      { x: 0.80, y: 0.38 }, // Segin
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
    darkMatter: [
      { x: 0.50, y: 0.60, label: 'Dark channel' },
      { x: 0.25, y: 0.55, label: 'Parallel sound' },
      { x: 0.75, y: 0.58, label: 'Ghost frequency' },
    ],
  },

  ursa_major: {
    id: 'ursa_major',
    name: 'Ursa Major',
    stars: [
      { x: 0.25, y: 0.30 }, // Dubhe
      { x: 0.32, y: 0.25 }, // Merak
      { x: 0.42, y: 0.28 }, // Phecda
      { x: 0.48, y: 0.22 }, // Megrez
      { x: 0.58, y: 0.20 }, // Alioth
      { x: 0.68, y: 0.25 }, // Mizar
      { x: 0.78, y: 0.32 }, // Alkaid
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [0, 3]],
    darkMatter: [
      { x: 0.50, y: 0.50, label: 'Hidden orbit' },
      { x: 0.35, y: 0.55, label: 'Dim wavelength' },
      { x: 0.65, y: 0.48, label: 'Subspace echo' },
    ],
  },

  cygnus: {
    id: 'cygnus',
    name: 'Cygnus',
    stars: [
      { x: 0.50, y: 0.10 }, // Deneb (tail)
      { x: 0.50, y: 0.35 }, // Sadr (center)
      { x: 0.50, y: 0.70 }, // Albireo (head)
      { x: 0.30, y: 0.45 }, // Gienah (left wing)
      { x: 0.70, y: 0.45 }, // Delta Cyg (right wing)
      { x: 0.20, y: 0.55 }, // Wing tip left
    ],
    edges: [[0, 1], [1, 2], [1, 3], [1, 4], [3, 5]],
    darkMatter: [
      { x: 0.80, y: 0.55, label: 'Wing tip void' },
      { x: 0.40, y: 0.20, label: 'Stellar gap' },
      { x: 0.60, y: 0.60, label: 'Cosmic blind spot' },
    ],
  },

  leo: {
    id: 'leo',
    name: 'Leo',
    stars: [
      { x: 0.30, y: 0.20 }, // Regulus
      { x: 0.35, y: 0.12 }, // Eta Leo
      { x: 0.45, y: 0.10 }, // Algieba
      { x: 0.52, y: 0.15 }, // Zosma
      { x: 0.62, y: 0.18 }, // Chertan
      { x: 0.72, y: 0.25 }, // Denebola
      { x: 0.38, y: 0.30 }, // Lower mane
      { x: 0.28, y: 0.28 }, // Chin
      { x: 0.55, y: 0.28 }, // Body mid
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [0, 7], [0, 6], [6, 2], [3, 8], [8, 5]],
    darkMatter: [
      { x: 0.50, y: 0.50, label: 'Muted roar' },
      { x: 0.20, y: 0.45, label: 'Silent pride' },
      { x: 0.75, y: 0.50, label: 'Tail whisper' },
      { x: 0.45, y: 0.70, label: 'Underbelly' },
    ],
  },

  aquarius: {
    id: 'aquarius',
    name: 'Aquarius',
    stars: [
      { x: 0.40, y: 0.12 }, // Sadalmelik
      { x: 0.50, y: 0.15 }, // Sadalsuud
      { x: 0.45, y: 0.25 }, // Sadachbia
      { x: 0.55, y: 0.28 }, // Ancha
      { x: 0.42, y: 0.38 }, // Water jar
      { x: 0.48, y: 0.48 }, // Stream 1
      { x: 0.44, y: 0.58 }, // Stream 2
      { x: 0.50, y: 0.65 }, // Stream 3
      { x: 0.46, y: 0.75 }, // Stream 4
      { x: 0.52, y: 0.82 }, // Stream 5
      { x: 0.55, y: 0.90 }, // Fomalhaut region
    ],
    edges: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]],
    darkMatter: [
      { x: 0.70, y: 0.40, label: 'Dry current' },
      { x: 0.30, y: 0.55, label: 'Upstream void' },
      { x: 0.65, y: 0.70, label: 'Evaporated wave' },
      { x: 0.35, y: 0.85, label: 'Still water' },
    ],
  },
};

export function getConstellation(id: string): ConstellationDef {
  return CONSTELLATIONS[id] || CONSTELLATIONS.cassiopeia;
}

export function getAllConstellationIds(): string[] {
  return Object.keys(CONSTELLATIONS);
}
