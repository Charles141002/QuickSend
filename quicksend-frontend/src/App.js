import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import UserHome from './components/UserHome';
import CreateEmail from './components/CreateEmail';
import Navbar from './components/Navbar';

function App() {
    const token = localStorage.getItem('token');

    console.log('Token dans App.js :', token); // Ajout pour debug

    return (
        <Router>
            <div className="App">
                {token && <Navbar />}
                <Routes>
                    <Route path="/" element={!token ? <Home /> : <Navigate to="/user-home" />} />
                    <Route path="/user-home" element={<UserHome /> } /> {/* On laisse UserHome gérer la logique */}
                    <Route
                        path="/create-email"
                        element={token ? <CreateEmail /> : <Navigate to="/" />}
                    />
                </Routes>
            </div>
        </Router>
    );
}

export default App;