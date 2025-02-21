// src/components/Home.js
import React from 'react';
import Login from './Login';

const Home = () => {
    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1>Bienvenue sur QuickSend</h1>
            <p>Votre solution pour l'envoi d'emails et l'achat de crédits.</p>
            <Login />
        </div>
    );
};

export default Home;