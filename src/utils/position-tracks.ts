import type { GalaxySpotifyTrack } from 'src/services/spotify-api';
import { getConstellation } from './constellations';

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

const WORLD_BOUNDS = { minX: -10, maxX: 10, minY: -10, maxY: 10 };
const MIN_TRACKS = 25;

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

/**
 * Generate interpolated positions along constellation edges
 * to fill up to the target track count.
 */
function generateInterpolatedPositions(
  constellation: ReturnType<typeof getConstellation>,
  target: number,
): { positions: { x: number; y: number }[]; edges: { from: number; to: number }[] } {
  const mainStars = constellation.stars;
  const mainEdges = constellation.edges;
  const positions = mainStars.map((s) => ({ x: s.x, y: s.y }));
  const edges: { from: number; to: number }[] = [];

  const extraNeeded = target - mainStars.length;
  if (extraNeeded <= 0) {
    return { positions, edges: mainEdges.map(([from, to]) => ({ from, to })) };
  }

  // Distribute extra positions evenly across edges
  const edgeCount = mainEdges.length || 1;
  const perEdge = Math.max(1, Math.ceil(extraNeeded / edgeCount));
  let placed = 0;

  for (const [fromIdx, toIdx] of mainEdges) {
    const a = mainStars[fromIdx];
    const b = mainStars[toIdx];
    if (!a || !b) continue;

    // Build chain: fromIdx → interp1 → interp2 → ... → toIdx
    const pointsOnEdge = Math.min(perEdge, extraNeeded - placed);
    let prevIdx = fromIdx;

    for (let j = 0; j < pointsOnEdge; j++) {
      const t = (j + 1) / (pointsOnEdge + 1);
      const ix = a.x + (b.x - a.x) * t;
      const iy = a.y + (b.y - a.y) * t;
      const newIdx = positions.length;
      positions.push({ x: ix, y: iy });
      edges.push({ from: prevIdx, to: newIdx });
      prevIdx = newIdx;
      placed++;
    }

    // Connect last interpolated point to the edge endpoint
    edges.push({ from: prevIdx, to: toIdx });
  }

  // Any remaining main edges that didn't get interpolated points
  // (only if we ran out of tracks to place before covering all edges)
  if (placed >= extraNeeded) {
    // Add edges for any remaining original edges that weren't processed
    for (let i = Math.ceil(placed / perEdge); i < mainEdges.length; i++) {
      const [from, to] = mainEdges[i];
      edges.push({ from, to });
    }
  }

  return { positions, edges };
}

export function positionTracksOnConstellation(
  tracks: GalaxySpotifyTrack[],
  constellationId: string,
): ConstellationResult {
  const constellation = getConstellation(constellationId);

  const target = Math.min(Math.max(MIN_TRACKS, constellation.stars.length), tracks.length);

  const { positions, edges } = generateInterpolatedPositions(constellation, target);

  // Sort tracks by popularity descending -- most popular get the main star positions
  const sorted = [...tracks].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  const selected = sorted.slice(0, positions.length);

  const positioned: PositionedTrack[] = selected.map((t, i) => {
    const pos = positions[i];
    const { x, y } = scaleToWorld(pos.x, pos.y);
    return {
      id: t.id, name: t.name, artist: t.artist, album: t.album,
      artwork: t.artwork, artworkLarge: t.artworkLarge,
      popularity: t.popularity, spotifyUrl: t.spotifyUrl, x, y,
    };
  });

  for (const t of positioned) {
    if (!Number.isFinite(t.x)) t.x = 0;
    if (!Number.isFinite(t.y)) t.y = 0;
  }

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

export function positionTracks(tracks: GalaxySpotifyTrack[]): PositionedTrack[] {
  return positionTracksOnConstellation(tracks, 'cassiopeia').tracks;
}
