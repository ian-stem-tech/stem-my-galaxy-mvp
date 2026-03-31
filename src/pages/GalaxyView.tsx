import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import GalaxyCanvas from 'src/components/Galaxy/GalaxyCanvas';
import { fetchUserGalaxyTracks, fetchUserProfile } from 'src/services/spotify-api';
import type { GalaxySpotifyTrack } from 'src/services/spotify-api';
import { positionTracksOnConstellation } from 'src/utils/position-tracks';
import type { PositionedTrack, DarkMatterNode, ConstellationResult } from 'src/utils/position-tracks';
import { isAuthenticated, clearTokens } from 'src/services/spotify-auth';
import { analyzeListeningTaste } from 'src/utils/analyze-taste';
import type { TasteResult } from 'src/utils/analyze-taste';

const STORAGE_KEY_NAME = 'galaxy_constellation_name';
const STORAGE_KEY_INSIGHT_SEEN = 'galaxy_insight_seen';

const glassBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: '50%',
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 16px rgba(255,255,255,0.04)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', transition: 'all 0.2s ease', padding: 0,
};
const glassBtnHover = { background: 'rgba(255,255,255,0.1)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 0 24px rgba(255,255,255,0.07)' };
const glassBtnNormal = { background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 16px rgba(255,255,255,0.04)' };

const GalaxyView: React.FC = () => {
  const navigate = useNavigate();

  const [tracks, setTracks] = useState<PositionedTrack[]>([]);
  const [edges, setEdges] = useState<{ from: number; to: number }[]>([]);
  const [darkMatterNodes, setDarkMatterNodes] = useState<DarkMatterNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [constellationName, setConstellationName] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY_NAME),
  );
  const [starSignName, setStarSignName] = useState<string | null>(null);
  const [isNaming, setIsNaming] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const galaxyRef = useRef<HTMLDivElement>(null);

  const [tasteResult, setTasteResult] = useState<TasteResult | null>(null);
  const [showInsight, setShowInsight] = useState(false);

  const loadTracks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [spotifyTracks, profile] = await Promise.all([
        fetchUserGalaxyTracks('long_term'),
        fetchUserProfile(),
      ]);
      if (!localStorage.getItem(STORAGE_KEY_NAME) && profile?.displayName) {
        const autoName = `${profile.displayName}'s Galaxy`;
        setConstellationName(autoName);
        localStorage.setItem(STORAGE_KEY_NAME, autoName);
      }
      if (spotifyTracks.length === 0) {
        setError('No tracks found. Listen to more music on Spotify and try again.');
        setTracks([]);
        return;
      }

      const taste = analyzeListeningTaste(spotifyTracks);
      setTasteResult(taste);
      setStarSignName(taste.constellationName);

      const result = positionTracksOnConstellation(spotifyTracks, taste.constellationId);
      setTracks(result.tracks);
      setEdges(result.edges);
      setDarkMatterNodes(result.darkMatterNodes);
    } catch (err) {
      console.error('Failed to fetch tracks:', err);
      setError('Failed to load your listening data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) { navigate('/', { replace: true }); return; }
    loadTracks();
  }, [loadTracks, navigate]);

  useEffect(() => {
    if (!tasteResult || loading) return;
    const seen = localStorage.getItem(STORAGE_KEY_INSIGHT_SEEN);
    if (seen) return;
    const timer = setTimeout(() => {
      setShowInsight(true);
      localStorage.setItem(STORAGE_KEY_INSIGHT_SEEN, '1');
    }, 7000);
    return () => clearTimeout(timer);
  }, [tasteResult, loading]);

  useEffect(() => {
    if (isNaming && nameInputRef.current) nameInputRef.current.focus();
  }, [isNaming]);

  const handleDisconnect = useCallback(() => {
    clearTokens();
    localStorage.removeItem(STORAGE_KEY_NAME);
    localStorage.removeItem(STORAGE_KEY_INSIGHT_SEEN);
    navigate('/', { replace: true });
  }, [navigate]);

  const handleStartNaming = useCallback(() => {
    setNameInput(constellationName || '');
    setIsNaming(true);
  }, [constellationName]);

  const handleSaveName = useCallback(() => {
    const name = nameInput.trim();
    if (name) { setConstellationName(name); localStorage.setItem(STORAGE_KEY_NAME, name); }
    setIsNaming(false);
  }, [nameInput]);

  const handleDownload = useCallback(async () => {
    const container = galaxyRef.current;
    if (!container) return;
    const glCanvas = container.querySelector('canvas');
    if (!glCanvas) return;

    const W = 1080, H = 1920;
    const storyCanvas = document.createElement('canvas');
    storyCanvas.width = W; storyCanvas.height = H;
    const ctx = storyCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Draw star field (WebGL canvas)
    const srcAspect = glCanvas.width / glCanvas.height;
    const dstW = W;
    const dstH = dstW / srcAspect;
    const yOff = (H - dstH) / 2;
    ctx.drawImage(glCanvas, 0, yOff, dstW, dstH);

    // Scale factor from screen to story canvas
    const screenW = container.clientWidth;
    const screenH = container.clientHeight;
    const sx = dstW / screenW;
    const sy = dstH / screenH;

    // Draw constellation lines from SVG
    const svgLines = container.querySelectorAll('.galaxy-constellation-line');
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(255,255,255,0.15)';
    ctx.shadowBlur = 6;
    svgLines.forEach((line) => {
      const x1 = Number(line.getAttribute('x1')) * sx;
      const y1 = Number(line.getAttribute('y1')) * sy + yOff;
      const x2 = Number(line.getAttribute('x2')) * sx;
      const y2 = Number(line.getAttribute('y2')) * sy + yOff;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });
    ctx.shadowBlur = 0;

    // Draw album art circles
    const imgs = container.querySelectorAll('.galaxy-art-item') as NodeListOf<HTMLImageElement>;
    const drawPromises: Promise<void>[] = [];
    imgs.forEach((img) => {
      const left = parseFloat(img.style.left);
      const top = parseFloat(img.style.top);
      const size = parseFloat(img.style.width);
      const cx = left * sx;
      const cy = top * sy + yOff;
      const r = (size * sx) / 2;

      drawPromises.push(new Promise<void>((resolve) => {
        if (!img.complete || !img.naturalWidth) { resolve(); return; }
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
        ctx.restore();
        // White border
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        resolve();
      }));
    });
    await Promise.all(drawPromises);

    // Text overlays
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '600 48px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(constellationName || 'My Galaxy', W / 2, 140);

    if (starSignName) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '400 28px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(starSignName, W / 2, 190);
    }
    if (tasteResult) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '400 22px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(tasteResult.insight, W / 2, H - 120);
    }

    const dataUrl = storyCanvas.toDataURL('image/png');
    const blob = dataURLToBlob(dataUrl);

    if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'my-galaxy.png', { type: 'image/png' })] })) {
      navigator.share({ title: constellationName || 'My Galaxy', files: [new File([blob], 'my-galaxy.png', { type: 'image/png' })] })
        .catch(() => downloadBlob(blob, `${constellationName || 'my-galaxy'}.png`));
    } else {
      downloadBlob(blob, `${constellationName || 'my-galaxy'}.png`);
    }
  }, [constellationName, starSignName, tasteResult]);

  const applyHover = (e: React.MouseEvent) => { const el = e.currentTarget as HTMLElement; el.style.background = glassBtnHover.background; el.style.boxShadow = glassBtnHover.boxShadow; };
  const removeHover = (e: React.MouseEvent) => { const el = e.currentTarget as HTMLElement; el.style.background = glassBtnNormal.background; el.style.boxShadow = glassBtnNormal.boxShadow; };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }} ref={galaxyRef}>
      <GalaxyCanvas tracks={tracks} edges={edges} darkMatterNodes={darkMatterNodes} />

      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', zIndex: 100 }}>
          <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.8)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 16 }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Loading your galaxy...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && !loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', zIndex: 100 }}>
          <p style={{ color: 'rgba(255,150,150,0.9)', fontSize: 14, marginBottom: 16, maxWidth: 320, textAlign: 'center' }}>{error}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={loadTracks} style={{ padding: '8px 20px', borderRadius: 50, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: 13, cursor: 'pointer' }}>Retry</button>
            <button onClick={handleDisconnect} style={{ padding: '8px 20px', borderRadius: 50, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}>Start Over</button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', zIndex: 20, pointerEvents: 'none',
        background: 'rgba(0,0,0,0.8)',
      }}>
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.85)' }}>
            {constellationName || 'My Galaxy'}
          </h1>
          <button
            onClick={handleStartNaming}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.4, transition: 'opacity 0.2s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.4'; }}
            title="Rename constellation"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
        <div style={{ pointerEvents: 'auto' }}>
          <button onClick={handleDisconnect} style={{
            padding: '6px 14px', borderRadius: 8,
            border: '1px solid rgba(180,50,50,0.15)', background: 'rgba(180,50,50,0.12)',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            color: 'rgba(200,60,60,0.6)', fontSize: 12, cursor: 'pointer', transition: 'all 0.2s ease',
          }}>Disconnect</button>
        </div>
      </div>

      {/* Constellation name -- subtle bottom-left, above info button */}
      {!loading && starSignName && (
        <div style={{
          position: 'fixed', bottom: 68, left: 24, zIndex: 15,
          fontSize: 11, color: 'rgba(255,255,255,0.2)',
          letterSpacing: '0.1em', textTransform: 'uppercase' as const,
          fontWeight: 400, pointerEvents: 'none',
        }}>
          {starSignName}
        </div>
      )}

      {/* Insight pill -- bottom center, above social icons */}
      {showInsight && tasteResult && (
        <div style={{
          position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 30, maxWidth: 520, width: 'calc(100% - 40px)',
          animation: 'pill-in 0.5s ease both',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 20px',
            borderRadius: 50,
            background: 'rgba(15,15,18,0.7)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 0 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
              {starSignName}
            </span>
            <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 400 }}>
              {tasteResult.insight}
            </span>
            <button
              onClick={() => setShowInsight(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0, opacity: 0.4, transition: 'opacity 0.2s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.4'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <style>{`@keyframes pill-in { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
        </div>
      )}

      {/* Bottom-left info button */}
      <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 20 }}>
        <button style={glassBtn} onClick={() => setShowInsight(true)} onMouseEnter={applyHover} onMouseLeave={removeHover} title="Listening insight">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>
      </div>

      {/* Bottom-right action bar */}
      <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 20, display: 'flex', flexDirection: 'row', gap: 10 }}>
        <button style={glassBtn} onClick={() => window.open('https://tiktok.com', '_blank')} onMouseEnter={applyHover} onMouseLeave={removeHover} title="TikTok">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V9.05a8.27 8.27 0 0 0 4.76 1.5V7.12a4.83 4.83 0 0 1-1-.43z"/>
          </svg>
        </button>
        <button style={glassBtn} onClick={() => window.open('https://instagram.com', '_blank')} onMouseEnter={applyHover} onMouseLeave={removeHover} title="Instagram">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1.5" fill="rgba(255,255,255,0.6)" stroke="none" />
          </svg>
        </button>
        <button style={glassBtn} onClick={handleDownload} onMouseEnter={applyHover} onMouseLeave={removeHover} title="Download story image">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </div>

      {/* Naming overlay */}
      {isNaming && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        }} onClick={(e) => { if (e.target === e.currentTarget) setIsNaming(false); }}>
          <div style={{ background: 'rgba(15,15,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '32px 40px', textAlign: 'center', maxWidth: 400 }}>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Rename Your Galaxy</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24 }}>Give your constellation a name</p>
            <input ref={nameInputRef} type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); }}
              placeholder="e.g. Midnight Orbit" maxLength={40}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 16, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'center' }}>
              <button onClick={handleSaveName} style={{ padding: '10px 28px', borderRadius: 50, border: 'none', background: 'rgba(255,255,255,0.9)', color: '#000', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Save</button>
              <button onClick={() => setIsNaming(false)} style={{ padding: '10px 28px', borderRadius: 50, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function dataURLToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const raw = atob(parts[1]);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default GalaxyView;
