// src/components/Login.js
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
                // Rediriger l'utilisateur vers l'URL de connexion Google
                window.location.href = data.authorization_url; // Assurez-vous que la clé correspond à votre réponse
            } else {
                setMessage('Erreur lors de la récupération de l\'URL de connexion.');
            }
        } catch (error) {
            setMessage('Erreur de connexion. Veuillez réessayer.');
        }
    };

    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h2>Connexion</h2>
            <button onClick={handleLogin}>Se connecter avec Google</button>
            {message && <p>{message}</p>}
        </div>
    );
};

export default Login;