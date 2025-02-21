import React, { useState } from 'react';

const Login = () => {
    const [message, setMessage] = useState('');

    const handleLogin = async () => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.authorization_url) {
                    // Rediriger vers l'URL d'autorisation Google
                    window.location.href = data.authorization_url;
                } else {
                    setMessage('URL d’autorisation manquante dans la réponse.');
                }
            } else {
                const errorData = await response.json();
                setMessage(errorData.message || 'Erreur lors de la récupération de l’URL de connexion.');
            }
        } catch (error) {
            setMessage('Erreur réseau. Veuillez réessayer.');
            console.error('Erreur lors de la connexion :', error);
        }
    };

    return (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
                onClick={handleLogin}
                style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
            >
                Se connecter avec Google
            </button>
            {message && <p style={{ color: 'red' }}>{message}</p>}
        </div>
    );
};

export default Login;