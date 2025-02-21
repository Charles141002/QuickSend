import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import UserHome from './components/UserHome';
import CreateEmail from './components/CreateEmail';
import AddCredits from './components/AddCredits'; // Importer le nouveau composant
import Navbar from './components/Navbar';

function App() {
    const token = localStorage.getItem('token');

    console.log('Token dans App.js :', token); // Ajout pour debug

    return (
        <Router>
            <div className="App">
                {token && <Navbar />}
                <Routes>
                    <Route path="/" element={!token ? <Navigate to="/user-home" /> : <Home />} />
                    <Route path="/user-home" element={<UserHome /> } /> {/* On laisse UserHome gérer la logique */}
                    <Route
                        path="/create-email"
                        element={token ? <CreateEmail /> : <Navigate to="/" />}
                    />
                    <Route path="/add-credits" element={token ? <AddCredits /> : <Navigate to="/" />} /> {/* Nouvelle route */}
                </Routes>
            </div>
        </Router>
    );
}

export default App;