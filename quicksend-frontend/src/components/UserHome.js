// src/components/UserHome.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Importer useNavigate

const UserHome = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate(); // Initialiser useNavigate

    useEffect(() => {
        const fetchUser = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token'); // Récupérer le token de l'URL

            if (!token) {
                setError('Token manquant. Veuillez vous connecter.');
                setLoading(false);
                return;
            }

            // Stocker le token dans localStorage
            localStorage.setItem('token', token);

            const response = await fetch('/api/auth/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`, // Utiliser le token récupéré
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data); // Stocker les informations de l'utilisateur
            } else {
                setError('Erreur lors de la récupération des informations de l\'utilisateur');
            }
            setLoading(false);
        };

        fetchUser();
    }, []);

    if (loading) {
        return <div>Chargement...</div>;
    }

    if (error) {
        return <div>{error}</div>; // Afficher l'erreur si elle existe
    }

    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1>Bienvenue, {user.email}!</h1>
            <p>Voici vos informations :</p>
            <pre>{JSON.stringify(user, null, 2)}</pre>
            <button onClick={() => navigate('/create-email')}>Créer un Email</button> {/* Bouton pour créer un email */}
        </div>
    );
};

export default UserHome;