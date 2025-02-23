import React, { useState } from 'react';
import './Login.css';

const Login = () => {
    const [message, setMessage] = useState('');

    const handleLogin = async () => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.authorization_url) {
                    console.log('Redirecting to:', data.authorization_url);
                    window.location.href = data.authorization_url;
                } else {
                    setMessage('URL d’autorisation manquante.');
                }
            } else {
                const errorData = await response.json();
                setMessage(errorData.message || 'Erreur lors de la connexion.');
            }
        } catch (error) {
            setMessage('Erreur réseau.');
            console.error('Erreur lors de la connexion:', error);
        }
    };

    return (
        <div className="login-container">
            <h1 className="login-title">Connexion</h1>
            <p className="login-subtitle">Connectez-vous avec Google</p>
            <button onClick={handleLogin} className="login-button">
                Se connecter avec Google
            </button>
            {message && <p className="error-message">{message}</p>}
        </div>
    );
};

export default Login;