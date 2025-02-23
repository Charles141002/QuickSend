import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './components/Home';
import UserHome from './components/UserHome';
import CreateEmail from './components/CreateEmail';
import AddCredits from './components/AddCredits';
import Navbar from './components/Navbar';

const PrivateRoute = ({ element }) => {
    const token = localStorage.getItem('token');
    console.log('PrivateRoute - Token:', token);
    return token ? element : <Navigate to="/" replace />;
};

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
    const location = useLocation();

    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const tokenFromUrl = urlParams.get('token');

        if (tokenFromUrl) {
            localStorage.setItem('token', tokenFromUrl);
            console.log('App - Token stored:');
            window.history.replaceState({}, document.title, location.pathname);
        }

        const token = localStorage.getItem('token');
        setIsAuthenticated(!!token);
    }, [location.search]);

    return (
        <div className="App">
            {isAuthenticated && <Navbar />}
            <Routes>
                <Route
                    path="/"
                    element={
                        isAuthenticated ? (
                            <Navigate to="/user-home" replace />
                        ) : (
                            <Home />
                        )
                    }
                />
                <Route path="/user-home" element={<PrivateRoute element={<UserHome />} />} />
                <Route path="/create-email" element={<PrivateRoute element={<CreateEmail />} />} />
                <Route path="/add-credits" element={<PrivateRoute element={<AddCredits />} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

export default function AppWrapper() {
    return (
        <Router>
            <App />
        </Router>
    );
}