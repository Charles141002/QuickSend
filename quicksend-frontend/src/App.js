// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Home from './components/Home';
import UserHome from './components/UserHome';
import CreateEmail from './components/CreateEmail'; // Importer le nouveau composant

function App() {
    const token = localStorage.getItem('token'); // Vérifier si le token est présent

    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/user-home" element={<UserHome /> } />
                    <Route path="/create-email" element={<CreateEmail />} /> {/* Ajouter la route pour la création d'email */}
                </Routes>
            </div>
        </Router>
    );
}

export default App;