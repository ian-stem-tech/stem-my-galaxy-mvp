import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeCodeForToken, clearTokens } from 'src/services/spotify-auth';

const Callback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    if (errorParam) {
      clearTokens();
      setError(errorParam === 'access_denied'
        ? 'You declined the Spotify connection. Tap below to try again.'
        : `Spotify error: ${errorParam}`);
      return;
    }

    if (!code) {
      clearTokens();
      setError('No authorization code received. Please try connecting again.');
      return;
    }

    exchangeCodeForToken(code).then((success) => {
      if (success) {
        navigate('/galaxy', { replace: true });
      } else {
        clearTokens();
        setError('Could not complete the connection. Please try again.');
      }
    });
  }, [navigate]);

  const handleTryAgain = () => {
    clearTokens();
    navigate('/', { replace: true });
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', background: '#000', padding: 24, textAlign: 'center',
    }}>
      {error ? (
        <>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginBottom: 20, maxWidth: 320 }}>{error}</p>
          <button
            onClick={handleTryAgain}
            style={{
              padding: '12px 28px', borderRadius: 50, border: 'none',
              background: '#1DB954', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Connect Spotify
          </button>
        </>
      ) : (
        <>
          <div style={{
            width: 32, height: 32,
            border: '2px solid rgba(255,255,255,0.15)',
            borderTopColor: 'rgba(255,255,255,0.8)',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 16,
          }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Connecting to Spotify...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </div>
  );
};

export default Callback;
