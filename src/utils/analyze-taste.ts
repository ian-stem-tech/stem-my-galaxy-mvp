import type { GalaxySpotifyTrack } from 'src/services/spotify-api';

export interface TasteResult {
  constellationId: string;
  constellationName: string;
  insight: string;
}

export function analyzeListeningTaste(tracks: GalaxySpotifyTrack[]): TasteResult {
  if (tracks.length === 0) {
    return { constellationId: 'cassiopeia', constellationName: 'Cassiopeia', insight: 'Connect Spotify to discover your constellation' };
  }

  const uniqueArtists = new Set(tracks.map((t) => t.artistId || t.artist)).size;
  const avgPop = tracks.reduce((sum, t) => sum + (t.popularity || 50), 0) / tracks.length;
  const div = uniqueArtists / tracks.length;

  // Deep + diverse → Scorpius
  if (div > 0.8 && avgPop < 40) {
    return { constellationId: 'scorpius', constellationName: 'Scorpius', insight: 'Your ears operate on frequencies most never find' };
  }
  // Eclectic/diverse deep → Aquarius
  if (div > 0.7 && avgPop < 55) {
    return { constellationId: 'aquarius', constellationName: 'Aquarius', insight: "You don't follow the algorithm — the algorithm follows you" };
  }
  // Early adopter → Leo
  if (div > 0.6 && avgPop < 50) {
    return { constellationId: 'leo', constellationName: 'Leo', insight: "You heard it first. The world just hasn't caught up yet" };
  }
  // Diverse mainstream → Cygnus
  if (div > 0.7 && avgPop >= 55) {
    return { constellationId: 'cygnus', constellationName: 'Cygnus', insight: 'Maximum range. Zero ceiling. Your taste has no borders' };
  }
  // Loyal/repeat low diversity + high pop → Ursa Major
  if (div <= 0.4 && avgPop > 70) {
    return { constellationId: 'ursa_major', constellationName: 'Ursa Major', insight: 'Devotion is a frequency — and you never change the station' };
  }
  // Repeat mid → Lyra
  if (div <= 0.5 && avgPop > 60) {
    return { constellationId: 'lyra', constellationName: 'Lyra', insight: 'Some call it obsession. You call it taste' };
  }
  // Ultra deep → Scorpius
  if (avgPop < 35) {
    return { constellationId: 'scorpius', constellationName: 'Scorpius', insight: "You listen where the light doesn't reach" };
  }
  // Mainstream → Orion
  if (avgPop > 65) {
    return { constellationId: 'orion', constellationName: 'Orion', insight: "If the world had one playlist — it'd be yours" };
  }

  // Default → Cassiopeia
  return { constellationId: 'cassiopeia', constellationName: 'Cassiopeia', insight: 'Part underground. Part spotlight. All intention' };
}
