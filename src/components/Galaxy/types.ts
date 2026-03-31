export interface GalaxyTrackData {
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
  _texture?: WebGLTexture;
  _loaded?: boolean;
  _displayX: number;
  _displayY: number;
}
