import { getValidToken } from './spotify-auth';

const API_BASE = 'https://api.spotify.com/v1';

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

export interface SpotifyImage {
  url: string;
  width: number;
  height: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres?: string[];
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  release_date: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  popularity: number;
  external_urls: { spotify: string };
  uri: string;
}

export interface AudioFeatures {
  id: string;
  energy: number;
  valence: number;
  danceability: number;
  acousticness: number;
  instrumentalness: number;
  tempo: number;
}

export interface GalaxySpotifyTrack {
  id: string;
  name: string;
  artist: string;
  artistId: string;
  album: string;
  artwork: string | null;
  artworkLarge: string | null;
  popularity: number;
  spotifyUrl: string;
  features: AudioFeatures | null;
  timeRange: TimeRange;
}

async function spotifyFetch<T>(endpoint: string): Promise<T | null> {
  const token = await getValidToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  return res.json();
}

function getArtworkUrl(images: SpotifyImage[]): string | null {
  if (!images.length) return null;
  // images[0] = 640px, images[1] = 300px, images[2] = 64px
  // Use 300px for WebGL textures (good quality, reasonable size)
  return (images[1] ?? images[0])?.url ?? null;
}

function getArtworkUrlLarge(images: SpotifyImage[]): string | null {
  if (!images.length) return null;
  // images[0] = highest resolution (640px)
  return images[0].url;
}

export async function fetchTopTracks(
  timeRange: TimeRange,
  limit = 50,
): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{ items: SpotifyTrack[] }>(
    `/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
  );
  return data?.items ?? [];
}

export async function fetchAudioFeatures(
  trackIds: string[],
): Promise<Map<string, AudioFeatures>> {
  const map = new Map<string, AudioFeatures>();
  if (trackIds.length === 0) return map;

  // Spotify allows max 100 IDs per request
  const chunks: string[][] = [];
  for (let i = 0; i < trackIds.length; i += 100) {
    chunks.push(trackIds.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const data = await spotifyFetch<{ audio_features: (AudioFeatures | null)[] }>(
      `/audio-features?ids=${chunk.join(',')}`,
    );
    if (data?.audio_features) {
      for (const f of data.audio_features) {
        if (f) map.set(f.id, f);
      }
    }
  }

  return map;
}

export async function fetchUserGalaxyTracks(
  timeRange: TimeRange = 'medium_term',
): Promise<GalaxySpotifyTrack[]> {
  const tracks = await fetchTopTracks(timeRange, 50);

  const trackIds = tracks.map((t) => t.id);
  let featuresMap: Map<string, AudioFeatures>;
  try {
    featuresMap = await fetchAudioFeatures(trackIds);
  } catch {
    featuresMap = new Map();
  }

  const result = tracks.map((t) => ({
    id: t.id,
    name: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    artistId: t.artists[0]?.id ?? '',
    album: t.album.name,
    artwork: getArtworkUrl(t.album.images),
    artworkLarge: getArtworkUrlLarge(t.album.images),
    popularity: t.popularity,
    spotifyUrl: t.external_urls.spotify,
    features: featuresMap.get(t.id) ?? null,
    timeRange,
  }));

  console.log('[Spotify] Fetched', result.length, 'tracks. Sample artwork:', result[0]?.artwork, 'Features:', result.filter(t => t.features).length);
  return result;
}

export async function fetchAllTimeRanges(): Promise<GalaxySpotifyTrack[]> {
  const [short, medium, long] = await Promise.all([
    fetchUserGalaxyTracks('short_term'),
    fetchUserGalaxyTracks('medium_term'),
    fetchUserGalaxyTracks('long_term'),
  ]);

  // Deduplicate: prefer the shortest time range (most recent)
  const seen = new Map<string, GalaxySpotifyTrack>();
  for (const track of [...short, ...medium, ...long]) {
    if (!seen.has(track.id)) {
      seen.set(track.id, track);
    }
  }

  return Array.from(seen.values());
}

export async function fetchUserProfile(): Promise<{ displayName: string } | null> {
  const data = await spotifyFetch<{ display_name: string }>('/me');
  if (!data) return null;
  return { displayName: data.display_name };
}
