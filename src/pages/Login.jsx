import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { useStore } from '../store/useStore';

function Login() {
  const navigate = useNavigate();
  const { setKeys } = useStore();
  const [loading, setLoading] = useState(false);

  const handleGenerateKeys = async () => {
    setLoading(true);
    try {
      const privateKey = generateSecretKey();
      const publicKey = getPublicKey(privateKey);
      setKeys(publicKey, privateKey);
      navigate('/');
    } catch (error) {
      console.error('Error generating keys:', error);
    }
    setLoading(false);
  };

  return (
    <div className="card">
      <h2>Zaloguj się</h2>
      <div>
        <button
          onClick={handleGenerateKeys}
          disabled={loading}
          className="button button--full"
        >
          {loading ? 'Generowanie...' : 'Wygeneruj nowy klucz'}
        </button>
        <p className="text-light">
          Twój klucz prywatny zostanie bezpiecznie zapisany w przeglądarce
        </p>
      </div>
    </div>
  );
}

export default Login;