// src/components/CreateEmail.js
import React, { useState } from 'react';

const CreateEmail = () => {
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [recipients, setRecipients] = useState([]);
    const [message, setMessage] = useState('');

    const token = localStorage.getItem('token'); // Récupérer le token stocké

    console.log('Token dans CreateEmail.js :', token); // Ajout pour debug

    const handleAddRecipient = () => {
        if (recipientName && recipientEmail) {
            setRecipients([...recipients, { name: recipientName, email: recipientEmail }]);
            setRecipientName('');
            setRecipientEmail('');
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const response = await fetch('/api/emails/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, // Inclure le token pour l'authentification
            },
            body: JSON.stringify({
                subject,
                content,
                recipients,
            }),
        });
        console.log(response);
        if (response.ok) {
            setMessage('Email envoyé avec succès !');
            // Réinitialiser le formulaire si nécessaire
            setSubject('');
            setContent('');
            setRecipients([]);
        } else {
            setMessage('Erreur lors de l\'envoi de l\'email.');
        }
    };

    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1>Créer un Email</h1>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Objet"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                />
                <br />
                <textarea
                    placeholder="Contenu de l'email"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                ></textarea>
                <br />
                <h3>Ajouter un destinataire</h3>
                <input
                    type="text"
                    placeholder="Nom"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                />
                <button type="button" onClick={handleAddRecipient}>Ajouter</button>
                <br />
                <button type="submit">Envoyer</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default CreateEmail;