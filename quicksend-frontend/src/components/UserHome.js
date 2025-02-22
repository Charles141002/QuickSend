import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserHome.css'; // Nouveau fichier CSS pour UserHome

const UserHome = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const tokenFromUrl = urlParams.get('token');
            console.log('Token dans UserHome.js :', tokenFromUrl);

            if (tokenFromUrl) {
                localStorage.setItem('token', tokenFromUrl);
                window.history.replaceState({}, document.title, '/user-home');
            }

            const token = localStorage.getItem('token');
            console.log('Token dans UserHome.js :', token);

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
        return (
            <div className="user-home-container">
                <div className="loader">Chargement...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="user-home-container">
                <p className="error-message">{error}</p>
            </div>
        );
    }

    return (
        <div className="user-home-container">
            <h1 className="user-home-title">Bienvenue, {user.email} !</h1>
            <p className="user-home-subtitle">Voici vos informations :</p>
            <pre className="user-info">{JSON.stringify(user, null, 2)}</pre>
            <button
                onClick={() => {
                    localStorage.removeItem('token');
                    navigate('/');
                }}
                className="logout-button"
            >
                Se déconnecter
            </button>
        </div>
    );
};

export default UserHome;