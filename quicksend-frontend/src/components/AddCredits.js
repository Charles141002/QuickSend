import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './AddCredits.css'; // Nouveau fichier CSS pour AddCredits

// Charger Stripe avec ta clé publique
const stripePromise = loadStripe('pk_test_51QuiCOLaNGDU6bg8H7OJf3qWFes0QNnr8J9XpYxZD8eZnjoDIOMKhE2zybQJgjT61TX4JqetNDjsQM5FR3Dx8CP100Otp3TonE');

const AddCredits = () => {
    const [amount, setAmount] = useState(200); // Montant en centimes (2€ par défaut)
    const [credits, setCredits] = useState(100); // Crédits calculés
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const stripe = useStripe();
    const elements = useElements();

    // Calculer les crédits basé sur le montant (logique identique au backend)
    const calculateCredits = (amountCents) => {
        const amountEuros = amountCents / 100;
        if (amountEuros >= 10) return amountEuros * 60;
        if (amountEuros >= 5) return amountEuros * 55;
        return amountEuros * 50;
    };

    // Gérer le changement de montant
    const handleAmountChange = (e) => {
        const newAmount = parseInt(e.target.value) || 0;
        setAmount(newAmount);
        setCredits(calculateCredits(newAmount));
    };

    // Soumettre le paiement
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setLoading(true);
        setMessage('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://127.0.0.1:8000/api/credits/create-payment-intent?amount=${amount}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            console.log('Réponse du serveur :', response);
            if (!response.ok) {
                throw new Error('Erreur lors de la création du PaymentIntent');
            }

            const { clientSecret } = await response.json();

            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: elements.getElement(CardElement),
                    billing_details: {
                        name: 'Utilisateur QuickSend',
                    },
                },
            });

            if (result.error) {
                setMessage(`Erreur de paiement : ${result.error.message}`);
            } else if (result.paymentIntent.status === 'succeeded') {
                setMessage('Paiement réussi ! Vos crédits ont été ajoutés.');
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
                    <CardElement
                        options={{
                            style: {
                                base: {
                                    fontSize: '16px',
                                    color: '#424770',
                                    '::placeholder': {
                                        color: '#aab7c4',
                                    },
                                },
                                invalid: {
                                    color: '#9e2146',
                                },
                            },
                        }}
                    />
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

// Envelopper dans Elements pour utiliser Stripe
const AddCreditsWithStripe = () => (
    <Elements stripe={stripePromise}>
        <AddCredits />
    </Elements>
);

export default AddCreditsWithStripe;