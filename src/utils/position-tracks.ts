import type { GalaxySpotifyTrack } from 'src/services/spotify-api';
import { getConstellation } from './constellations';
import type { ConstellationDef } from './constellations';

export interface PositionedTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  artwork: string | null;
  artworkLarge: string | null;
  popularity: number;
  spotifyUrl: string;
  x: number;
  y: number;
}

export interface DarkMatterNode {
  x: number;
  y: number;
  label: string;
}

export interface ConstellationResult {
  tracks: PositionedTrack[];
  edges: { from: number; to: number }[];
  constellationName: string;
  darkMatterNodes: DarkMatterNode[];
}

const WORLD_BOUNDS = {
  minX: -10,
  maxX: 10,
  minY: -10,
  maxY: 10,
};

export function getWorldBounds() {
  return WORLD_BOUNDS;
}

function scaleToWorld(nx: number, ny: number): { x: number; y: number } {
  const pad = 0.15;
  const sx = pad + nx * (1 - 2 * pad);
  const sy = pad + ny * (1 - 2 * pad);
  return {
    x: WORLD_BOUNDS.minX + sx * (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX),
    y: WORLD_BOUNDS.minY + sy * (WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY),
  };
}

export function positionTracksOnConstellation(
  tracks: GalaxySpotifyTrack[],
  constellationId: string,
): ConstellationResult {
  const constellation = getConstellation(constellationId);
  const starCount = constellation.stars.length;

  // Sort tracks by popularity descending so the most-listened tracks get the main star positions
  const sorted = [...tracks].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  const selected = sorted.slice(0, starCount);

  const positioned: PositionedTrack[] = selected.map((t, i) => {
    const star = constellation.stars[i];
    const { x, y } = scaleToWorld(star.x, star.y);
    return {
      id: t.id,
      name: t.name,
      artist: t.artist,
      album: t.album,
      artwork: t.artwork,
      artworkLarge: t.artworkLarge,
      popularity: t.popularity,
      spotifyUrl: t.spotifyUrl,
      x,
      y,
    };
  });

  // Safety: replace any NaN positions
  for (const t of positioned) {
    if (!Number.isFinite(t.x)) t.x = 0;
    if (!Number.isFinite(t.y)) t.y = 0;
  }

  const edges = constellation.edges.map(([from, to]) => ({ from, to }));

  const darkMatterNodes: DarkMatterNode[] = constellation.darkMatter.map((dm) => {
    const { x, y } = scaleToWorld(dm.x, dm.y);
    return { x, y, label: dm.label };
  });

  return {
    tracks: positioned,
    edges,
    constellationName: constellation.name,
    darkMatterNodes,
  };
}

// Legacy export for backward compat (unused but keeps imports valid)
export function positionTracks(tracks: GalaxySpotifyTrack[]): PositionedTrack[] {
  const result = positionTracksOnConstellation(tracks, 'cassiopeia');
  return result.tracks;
}
