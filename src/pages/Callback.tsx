import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeCodeForToken } from 'src/services/spotify-auth';

const Callback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    if (errorParam) {
      setError(`Spotify denied access: ${errorParam}`);
      return;
    }

    if (!code) {
      setError('No authorization code received');
      return;
    }

    exchangeCodeForToken(code).then((success) => {
      if (success) {
        navigate('/galaxy', { replace: true });
      } else {
        setError('Failed to exchange authorization code');
      }
    });
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      background: '#000',
    }}>
      {error ? (
        <>
          <p style={{ color: 'rgba(255, 100, 100, 0.9)', fontSize: 16, marginBottom: 16 }}>{error}</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            style={{
              padding: '10px 24px',
              borderRadius: 50,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'transparent',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </>
      ) : (
        <>
          <div style={{
            width: 32,
            height: 32,
            border: '2px solid rgba(255, 255, 255, 0.15)',
            borderTopColor: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            marginBottom: 16,
          }} />
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 14 }}>Connecting to Spotify...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </div>
  );
};

export default Callback;
