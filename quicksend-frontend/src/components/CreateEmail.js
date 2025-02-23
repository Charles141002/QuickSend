import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EmailEditor from './EmailEditor';
import './CreateEmail.css';

const CreateEmail = () => {
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState(''); // État pour le contenu de l'éditeur
    const [sheets, setSheets] = useState([]);
    const [spreadsheetId, setSpreadsheetId] = useState('');
    const [sheetNames, setSheetNames] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState('');
    const [variables, setVariables] = useState([]);
    const [files, setFiles] = useState([]);
    const [message, setMessage] = useState('');
    const [showPreview, setShowPreview] = useState(false); // État pour la modale de prévisualisation
    const [previewData, setPreviewData] = useState({ subject: '', body: '' }); // Données de prévisualisation
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setMessage('Veuillez vous connecter pour créer un email.');
            navigate('/');
            return;
        }

        const fetchSheets = async () => {
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
    }, [navigate]);

    useEffect(() => {
        if (!spreadsheetId) return;

        const token = localStorage.getItem('token');
        if (!token) return navigate('/');

        const fetchSheetNames = async () => {
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
    }, [spreadsheetId, navigate]);

    useEffect(() => {
        if (!spreadsheetId || !selectedSheet) return;

        const token = localStorage.getItem('token');
        if (!token) return navigate('/');

        const fetchHeaders = async () => {
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
    }, [spreadsheetId, selectedSheet, navigate]);

    const handleFileChange = (event) => {
        setFiles(event.target.files);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            setMessage('Session expirée. Veuillez vous reconnecter.');
            navigate('/');
            return;
        }

        if (!spreadsheetId || !selectedSheet) {
            setMessage('Veuillez sélectionner un Google Sheet et une feuille.');
            return;
        }

        const formData = new FormData();
        formData.append('spreadsheet_id', spreadsheetId);
        formData.append('range_name', `${selectedSheet}!A1:Z`);
        formData.append('subject', subject);
        formData.append('content', content);
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
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
            // Réinitialisation des champs après succès
            setSubject('');
            setContent(''); // Réinitialise le contenu de l'éditeur
            setSpreadsheetId('');
            setSelectedSheet('');
            setFiles([]);
        } catch (error) {
            setMessage(`Erreur : ${error.message}`);
        }
    };

    // Générer la prévisualisation du premier email
    const generatePreview = async () => {
        const token = localStorage.getItem('token');
        if (!token || !spreadsheetId || !selectedSheet) {
            setMessage('Veuillez sélectionner un Google Sheet, une feuille, et vous connecter.');
            return;
        }

        try {
            // Récupérer les données complètes du Google Sheet
            const response = await fetch(
                `http://localhost:8000/api/sheets/${spreadsheetId}/data?range_name=${selectedSheet}!A1:Z`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (!response.ok) throw new Error('Erreur lors de la récupération des données du Sheet');
            const sheetData = await response.json();
            const data = sheetData.data || [];

            if (!data || data.length < 2) {
                setMessage('Le Google Sheet est vide ou mal configuré.');
                return;
            }

            const headers = data[0]; // En-têtes (colonnes)
            const firstRow = data[1]; // Première ligne de données (premier destinataire)

            if (!firstRow || firstRow.length === 0) {
                setMessage('Aucune donnée trouvée pour le premier destinataire.');
                return;
            }

            // Créer un objet avec les valeurs du premier destinataire
            const values = {};
            headers.forEach((header, index) => {
                values[header] = firstRow[index] || '';
            });

            // Remplacer les variables dans le sujet et le contenu
            let previewSubject = subject;
            let previewBody = content;

            variables.forEach((variable) => {
                const value = values[variable] || `Valeur de ${variable} non trouvée`;
                previewSubject = previewSubject.replace(`{{${variable}}}`, value);
                previewBody = previewBody.replace(`{{${variable}}}`, value);
            });

            // Stocker les données de prévisualisation
            setPreviewData({
                subject: previewSubject,
                body: previewBody,
            });
            setShowPreview(true);
        } catch (error) {
            setMessage(`Erreur lors de la prévisualisation : ${error.message}`);
        }
    };

    if (!localStorage.getItem('token')) {
        return navigate('/');
    }

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
                </div>
                <EmailEditor content={content} onChange={setContent} variables={variables} />
                <div className="button-group">
                    <button type="submit" className="send-button">
                        Envoyer
                    </button>
                    <button type="button" onClick={generatePreview} className="preview-button">
                        Prévisualiser
                    </button>
                </div>
            </form>
            {message && (
                <p className={`message ${message.includes('succès') ? 'success' : 'error'}`}>
                    {message}
                </p>
            )}

            {/* Modale de prévisualisation */}
            {showPreview && (
                <div className="preview-modal" onClick={() => setShowPreview(false)}>
                    <div className="preview-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Prévisualisation du premier email</h3>
                        <h4>Objet : {previewData.subject}</h4>
                        <div className="preview-body" dangerouslySetInnerHTML={{ __html: previewData.body }} />
                        <button onClick={() => setShowPreview(false)} className="preview-close">
                            Fermer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateEmail;