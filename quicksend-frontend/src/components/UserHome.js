import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserHome.css';

const UserHome = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('token');

            if (!token) {
                console.log('UserHome - No token, redirecting to /');
                setError('Veuillez vous connecter.');
                setLoading(false);
                navigate('/');
                return;
            }

            try {
                const response = await fetch('/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (response.ok) {
                    const data = await response.json();
                    setUser(data);
                } else {
                    console.error('UserHome - Fetch failed:', response.status);
                    setError('Erreur lors de la récupération des informations.');
                    localStorage.removeItem('token');
                    navigate('/');
                }
            } catch (err) {
                console.error('UserHome - Network error:', err);
                setError('Erreur réseau.');
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
            <p className="user-home-subtitle">Nombre de crédits disponibles :</p>
            <div className="user-info">{user.credits}</div>
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