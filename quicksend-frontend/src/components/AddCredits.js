import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './AddCredits.css';

const stripePromise = loadStripe('pk_test_51QuiCOLaNGDU6bg8H7OJf3qWFes0QNnr8J9XpYxZD8eZnjoDIOMKhE2zybQJgjT61TX4JqetNDjsQM5FR3Dx8CP100Otp3TonE');

const AddCredits = () => {
    const [amount, setAmount] = useState(200);
    const [credits, setCredits] = useState(100);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const stripe = useStripe();
    const elements = useElements();
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/');
        }
    }, [navigate]);

    const calculateCredits = (amountCents) => {
        const amountEuros = amountCents / 100;
        if (amountEuros >= 10) return amountEuros * 60;
        if (amountEuros >= 5) return amountEuros * 55;
        return amountEuros * 50;
    };

    const handleAmountChange = (e) => {
        const newAmount = parseInt(e.target.value) || 0;
        setAmount(newAmount);
        setCredits(calculateCredits(newAmount));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        const token = localStorage.getItem('token');
        if (!token) {
            setMessage('Veuillez vous connecter pour continuer.');
            navigate('/');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const response = await fetch(`http://127.0.0.1:8000/api/credits/create-payment-intent?amount=${amount}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Erreur lors de la création du paiement');
            }

            const { clientSecret } = await response.json();
            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: elements.getElement(CardElement),
                    billing_details: { name: 'Utilisateur QuickSend' },
                },
            });

            if (result.error) {
                setMessage(`Erreur : ${result.error.message}`);
            } else if (result.paymentIntent.status === 'succeeded') {
                setMessage('Paiement réussi ! Crédits ajoutés.');
                setAmount(200);
                setCredits(100);
                elements.getElement(CardElement).clear();
            }
        } catch (error) {
            setMessage(`Erreur : ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-credits-container">
            <h1 className="add-credits-title">Ajouter des Crédits</h1>
            <p className="add-credits-subtitle">Rechargez votre compte pour envoyer plus d’emails</p>
            <form onSubmit={handleSubmit} className="add-credits-form">
                <div className="form-group">
                    <label className="form-label">Montant (en centimes) :</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={handleAmountChange}
                        min="200"
                        step="100"
                        required
                        className="form-input"
                    />
                    <p className="credits-info">{amount / 100}€ = {credits} crédits</p>
                </div>
                <div className="card-element-container">
                    <CardElement options={{ /* ...options... */ }} />
                </div>
                <button
                    type="submit"
                    disabled={!stripe || loading}
                    className={`pay-button ${loading ? 'disabled' : ''}`}
                >
                    {loading ? 'Paiement en cours...' : 'Payer'}
                </button>
            </form>
            {message && (
                <p className={`message ${message.includes('réussi') ? 'success' : 'error'}`}>
                    {message}
                </p>
            )}
        </div>
    );
};

const AddCreditsWithStripe = () => (
    <Elements stripe={stripePromise}>
        <AddCredits />
    </Elements>
);

export default AddCreditsWithStripe;