import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const UserHome = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            // Récupérer le token depuis l'URL (après callback Google)
            const urlParams = new URLSearchParams(window.location.search);
            const tokenFromUrl = urlParams.get('token');
            console.log('Token dans UseHome.js :', tokenFromUrl); // Ajout pour debug

            // Si un token est dans l'URL, le stocker dans localStorage
            if (tokenFromUrl) {
                localStorage.setItem('token', tokenFromUrl);
                console.log("OKKKK")
                // Nettoyer l'URL pour éviter de réutiliser le token dans l'URL
                window.history.replaceState({}, document.title, '/user-home');
            }

            console.log("PAS OKKKK")

            // Utiliser le token de localStorage comme source principale
            const token = localStorage.getItem('token');

            console.log('Token dans UseHome.js :', token); // Ajout pour debug

            if (!token) {
                setError('Token manquant. Veuillez vous connecter.');
                setLoading(false);
                navigate('/');
                return;
            }

            try {
                const response = await fetch('/api/auth/me', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setUser(data);
                } else {
                    setError('Erreur lors de la récupération des informations de l’utilisateur');
                    localStorage.removeItem('token');
                    navigate('/');
                }
            } catch (err) {
                setError('Erreur réseau. Veuillez réessayer.');
                localStorage.removeItem('token');
                navigate('/');
            }
            setLoading(false);
        };

        fetchUser();
    }, [navigate]);

    if (loading) {
        return <div style={{ textAlign: 'center' }}>Chargement...</div>;
    }

    if (error) {
        return <div style={{ textAlign: 'center', color: 'red' }}>{error}</div>;
    }

    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1>Bienvenue, {user.email}!</h1>
            <p>Voici vos informations :</p>
            <pre>{JSON.stringify(user, null, 2)}</pre>
            <button onClick={() => navigate('/create-email')}>Créer un Email</button>
            <button
                onClick={() => {
                    localStorage.removeItem('token');
                    navigate('/');
                }}
                style={{ marginLeft: '10px' }}
            >
                Se déconnecter
            </button>
        </div>
    );
};

export default UserHome;