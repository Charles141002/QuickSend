import React from 'react';
import Login from './Login';
import './Home.css'; // Nouveau fichier CSS pour Home

const Home = () => {
    return (
        <div className="home-container">
            <h1 className="home-title">Bienvenue sur QuickSend</h1>
            <p className="home-subtitle">Votre solution pour l'envoi d'emails et l'achat de crédits</p>
            <Login />
        </div>
    );
};

export default Home;