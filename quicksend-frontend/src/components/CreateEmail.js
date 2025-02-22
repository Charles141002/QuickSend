import React, { useState, useEffect } from 'react';
import EmailEditor from './EmailEditor';
import './CreateEmail.css'; // On va créer ce fichier pour les styles

const CreateEmail = () => {
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [sheets, setSheets] = useState([]);
    const [spreadsheetId, setSpreadsheetId] = useState('');
    const [sheetNames, setSheetNames] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState('');
    const [variables, setVariables] = useState([]);
    const [message, setMessage] = useState('');

    // Récupérer la liste des Google Sheets au montage
    useEffect(() => {
        const fetchSheets = async () => {
            const token = localStorage.getItem('token');
            try {
                const response = await fetch('http://localhost:8000/api/sheets', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!response.ok) throw new Error('Erreur lors de la récupération des Sheets');
                const data = await response.json();
                setSheets(data);
            } catch (error) {
                setMessage(`Erreur : ${error.message}`);
            }
        };
        fetchSheets();
    }, []);

    // Récupérer les noms des feuilles quand un Sheet est sélectionné
    useEffect(() => {
        if (!spreadsheetId) return;

        const fetchSheetNames = async () => {
            const token = localStorage.getItem('token');
            try {
                const response = await fetch(`http://localhost:8000/api/sheets/${spreadsheetId}/sheet-names`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!response.ok) throw new Error('Erreur lors de la récupération des noms des feuilles');
                const data = await response.json();
                setSheetNames(data);
                setSelectedSheet(data[0] || '');
            } catch (error) {
                setMessage(`Erreur : ${error.message}`);
            }
        };
        fetchSheetNames();
    }, [spreadsheetId]);

    // Récupérer les en-têtes quand une feuille est sélectionnée
    useEffect(() => {
        if (!spreadsheetId || !selectedSheet) return;

        const fetchHeaders = async () => {
            const token = localStorage.getItem('token');
            try {
                const response = await fetch(
                    `http://localhost:8000/api/sheets/${spreadsheetId}/headers?range_name=${selectedSheet}!A1:Z`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                if (!response.ok) throw new Error('Erreur lors de la récupération des en-têtes');
                const data = await response.json();
                setVariables(data.headers);
            } catch (error) {
                setMessage(`Erreur : ${error.message}`);
            }
        };
        fetchHeaders();
    }, [spreadsheetId, selectedSheet]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const token = localStorage.getItem('token');

        if (!spreadsheetId || !selectedSheet) {
            setMessage('Veuillez sélectionner un Google Sheet et une feuille.');
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/api/emails/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    spreadsheet_id: spreadsheetId,
                    range_name: `${selectedSheet}!A1:Z`,
                    subject,
                    content,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Erreur lors de l’envoi des emails');
            }

            const result = await response.json();
            setMessage(result.message || 'Emails envoyés avec succès !');
            setSubject('');
            setContent('');
            setSpreadsheetId('');
            setSelectedSheet('');
        } catch (error) {
            setMessage(`Erreur : ${error.message}`);
        }
    };

    return (
        <div className="create-email-container">
            <h1 className="create-email-title">Créer un Email</h1>
            <form onSubmit={handleSubmit} className="create-email-form">
                <div className="form-group">
                    <input
                        type="text"
                        placeholder="Objet de l'email"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                        className="form-input"
                    />
                </div>
                <div className="form-group">
                    <select
                        value={spreadsheetId}
                        onChange={(e) => setSpreadsheetId(e.target.value)}
                        required
                        className="form-select"
                    >
                        <option value="">Choisir un Google Sheet</option>
                        {sheets.map((sheet) => (
                            <option key={sheet.id} value={sheet.id}>{sheet.name}</option>
                        ))}
                    </select>
                </div>
                {spreadsheetId && (
                    <div className="form-group">
                        <select
                            value={selectedSheet}
                            onChange={(e) => setSelectedSheet(e.target.value)}
                            required
                            className="form-select"
                        >
                            <option value="">Choisir une feuille</option>
                            {sheetNames.map((name) => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <EmailEditor content={content} onChange={setContent} variables={variables} />
                <button type="submit" className="send-button">
                    Envoyer
                </button>
            </form>
            {message && (
                <p className={`message ${message.includes('succès') ? 'success' : 'error'}`}>
                    {message}
                </p>
            )}
        </div>
    );
};

export default CreateEmail;