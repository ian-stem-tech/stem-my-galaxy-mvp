# My Galaxy MVP

Visualize your Spotify listening history as a galaxy of album artwork.

## Setup

### 1. Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://127.0.0.1:5173/callback` as a Redirect URI in your app settings
4. Copy the **Client ID**

### 2. Configure Environment

Edit `.env` and replace with your Client ID:

```
VITE_SPOTIFY_CLIENT_ID=your_actual_client_id
```

### 3. Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173` and click **Connect Spotify**.

## How It Works

- Authenticates via Spotify OAuth (PKCE flow, fully client-side)
- Fetches your top tracks for the selected time range
- Retrieves audio features (energy, valence) for each track
- Positions tracks in 2D space: **X = valence** (sad to happy), **Y = energy** (calm to intense)
- Renders album artwork as textured quads in a WebGL2 galaxy canvas
- Background star field is procedurally generated

## Controls

- **Scroll/Pinch**: Zoom in/out
- **Click + Drag**: Pan
- **Hover**: See track name and artist
- **Click track**: Select and see details with "Open in Spotify" link
- **Time range toggle**: Switch between Last 4 Weeks, Last 6 Months, and All Time
