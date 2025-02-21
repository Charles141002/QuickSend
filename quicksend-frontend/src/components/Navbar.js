import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
    return (
        <nav style={{ background: '#333', color: 'white', padding: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <div>
                <Link to="/user-home" style={{ color: 'white', textDecoration: 'none' }}>QuickSend</Link>
            </div>
            <div>
                <Link to="/user-home" style={{ color: 'white', marginRight: '20px', textDecoration: 'none' }}>Accueil</Link>
                <Link to="/create-email" style={{ color: 'white', marginRight: '20px', textDecoration: 'none' }}>Nouvel Email</Link>
                <Link to="/add-credits" style={{ color: 'white', textDecoration: 'none' }}>Ajouter Crédits</Link>
            </div>
        </nav>
    );
};

export default Navbar;