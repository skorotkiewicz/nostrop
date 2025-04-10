import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { useStore } from "../store/useStore";

function Login() {
  const navigate = useNavigate();
  const { setKeys } = useStore();
  const [loading, setLoading] = useState(false);
  const [privateKeyInput, setPrivateKeyInput] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    try {
      let privateKey = privateKeyInput.trim();

      if (privateKey === "") {
        privateKey = generateSecretKey();
      }

      const publicKey = getPublicKey(privateKey);

      if (privateKey) {
        setKeys(publicKey, privateKey);
        navigate("/");
      }
    } catch (error) {
      console.error("Error during login:", error);
    }
    setLoading(false);
  };

  const handlePrivateKeyInputChange = (event) => {
    setPrivateKeyInput(event.target.value);
  };

  return (
    <div className="card">
      <h2>Zaloguj się</h2>
      <div>
        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="button button--full"
        >
          {loading ? "Logowanie..." : "Zaloguj się"}
        </button>
        <input
          type="text"
          placeholder="Lub wklej swój klucz prywatny"
          value={privateKeyInput}
          onChange={handlePrivateKeyInputChange}
          className="login-input"
        />
        <p className="text-light">
          {privateKeyInput
            ? "Używasz istniejącego klucza"
            : "Twój klucz prywatny zostanie bezpiecznie zapisany w przeglądarce"}
        </p>
      </div>
    </div>
  );
}


export default Login;
