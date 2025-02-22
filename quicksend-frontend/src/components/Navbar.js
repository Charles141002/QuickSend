import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css'; // Nouveau fichier CSS pour la Navbar

const Navbar = () => {
    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/user-home" className="navbar-logo">QuickSend</Link>
            </div>
            <div className="navbar-links">
                <Link to="/user-home" className="navbar-link">Accueil</Link>
                <Link to="/create-email" className="navbar-link">Nouvel Email</Link>
                <Link to="/add-credits" className="navbar-link">Ajouter Crédits</Link>
            </div>
        </nav>
    );
};

export default Navbar;