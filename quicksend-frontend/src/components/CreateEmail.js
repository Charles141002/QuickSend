import React, { useState } from 'react';
import EmailEditor from './EmailEditor';

const CreateEmail = () => {
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState(''); // État pour stocker le contenu de l'éditeur
    const [recipientName, setRecipientName] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [recipients, setRecipients] = useState([]);
    const [message, setMessage] = useState('');

    const handleAddRecipient = () => {
        if (recipientName && recipientEmail) {
            setRecipients([...recipients, { name: recipientName, email: recipientEmail }]);
            setRecipientName('');
            setRecipientEmail('');
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const token = localStorage.getItem('token');

        const response = await fetch('/api/emails/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                subject,
                content, // Envoyer le contenu récupéré de l'éditeur
                recipients,
            }),
        });

        if (response.ok) {
            setMessage('Email envoyé avec succès !');
            setSubject('');
            setContent(''); // Réinitialiser le contenu
            setRecipients([]);
        } else {
            setMessage('Erreur lors de l’envoi de l’email.');
        }
    };

    return (
        <div style={{ textAlign: 'center', marginTop: '50px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Créer un Email</h1>
            <form onSubmit={handleSubmit}>
                {/* Champ Objet */}
                <input
                    type="text"
                    placeholder="Objet"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
                />

                {/* Éditeur Tiptap */}
                <EmailEditor content={content} onChange={setContent} />

                {/* Destinataires */}
                <h3 style={{ marginTop: '20px' }}>Ajouter un destinataire</h3>
                <input
                    type="text"
                    placeholder="Nom"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    style={{ padding: '8px', margin: '5px' }}
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    style={{ padding: '8px', margin: '5px' }}
                />
                <button
                    type="button"
                    onClick={handleAddRecipient}
                    style={{ padding: '8px 15px', margin: '5px' }}
                >
                    Ajouter
                </button>

                {/* Liste des destinataires */}
                {recipients.length > 0 && (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {recipients.map((recipient, index) => (
                            <li key={index}>{`${recipient.name} <${recipient.email}>`}</li>
                        ))}
                    </ul>
                )}

                {/* Bouton Envoyer */}
                <button
                    type="submit"
                    style={{
                        padding: '10px 20px',
                        marginTop: '20px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                >
                    Envoyer
                </button>
            </form>

            {/* Message de feedback */}
            {message && (
                <p style={{ marginTop: '10px', color: message.includes('succès') ? 'green' : 'red' }}>
                    {message}
                </p>
            )}
        </div>
    );
};

export default CreateEmail;