import React, { useState, useEffect } from 'react';
import EmailEditor from './EmailEditor';
import './CreateEmail.css';

const CreateEmail = () => {
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [sheets, setSheets] = useState([]);
    const [spreadsheetId, setSpreadsheetId] = useState('');
    const [sheetNames, setSheetNames] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState('');
    const [variables, setVariables] = useState([]);
    const [message, setMessage] = useState('');
    const [files, setFiles] = useState([]);

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

    const handleFileChange = (e) => {
        setFiles([...e.target.files]);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const token = localStorage.getItem('token');

        if (!spreadsheetId || !selectedSheet) {
            setMessage('Veuillez sélectionner un Google Sheet et une feuille.');
            return;
        }

        const formData = new FormData();
        formData.append('spreadsheet_id', spreadsheetId);
        formData.append('range_name', `${selectedSheet}!A1:Z`);
        formData.append('subject', subject);
        formData.append('content', content);
        files.forEach(file => formData.append('files', file));

        // Débogage
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value instanceof File ? value.name : value}`);
        }

        try {
            const response = await fetch('http://localhost:8000/api/emails/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
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
            setFiles([]);
        } catch (error) {
            const errorMessage = error.message || (error.detail ? JSON.stringify(error.detail) : 'Erreur inconnue');
            setMessage(`Erreur : ${errorMessage}`);
        }
    };

    return (
        <div className="create-email-container">
            <h1 className="create-email-title">Créer un Email</h1>
            <form onSubmit={handleSubmit} className="create-email-form" encType="multipart/form-data">
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
                <div className="form-group">
                    <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="form-input"
                    />
                    {files.length > 0 && (
                        <p>{files.length} fichier(s) sélectionné(s)</p>
                    )}
                </div>
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