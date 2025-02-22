from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage
import base64
from typing import List
import logging
import mimetypes

from ..database import get_db
from ..models.user import User
from .auth import get_current_user
from ..api.sheets import get_sheet_data

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/send", response_model=dict)
async def send_emails(
    spreadsheet_id: str = Form(...),
    range_name: str = Form(...),
    subject: str = Form(...),
    content: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Envoie des emails personnalisés avec pièces jointes en utilisant un Google Sheet"""
    logger.debug(f"spreadsheet_id: {spreadsheet_id}, range_name: {range_name}, subject: {subject}, content: {content}")
    logger.debug(f"Fichiers: {[file.filename for file in files]}")

    if not current_user.google_tokens or "token" not in current_user.google_tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tokens Google non trouvés. Veuillez vous reconnecter."
        )

    credentials = Credentials(
        token=current_user.google_tokens["token"],
        refresh_token=current_user.google_tokens["refresh_token"],
        token_uri=current_user.google_tokens["token_uri"],
        client_id=current_user.google_tokens["client_id"],
        client_secret=current_user.google_tokens["client_secret"],
        scopes=current_user.google_tokens["scopes"]
    )

    # Récupérer les données du Google Sheet
    logger.debug(f"Récupération des données du Sheet {spreadsheet_id} avec range {range_name}")
    sheet_response = await get_sheet_data(spreadsheet_id, range_name, current_user, db)
    sheet_data = sheet_response.get('data', [])
    logger.debug(f"Données brutes du Sheet : {sheet_data}")

    if not sheet_data or len(sheet_data) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le Google Sheet est vide ou mal configuré"
        )

    headers = sheet_data[0]
    rows = sheet_data[1:]
    logger.debug(f"En-têtes : {headers}")
    logger.debug(f"Nombre de lignes : {len(rows)}")
    
    if "Email" not in headers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La colonne 'Email' est requise dans le Sheet"
        )

    email_index = headers.index("Email")
    logger.debug(f"Index de la colonne Email : {email_index}")

    # Vérifier les crédits disponibles
    valid_rows = [row for row in rows if len(row) > email_index and row[email_index].strip()]
    logger.debug(f"Nombre de lignes valides avec email : {len(valid_rows)}")
    if current_user.credits < len(valid_rows):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Crédits insuffisants. Nécessaire: {len(valid_rows)}, Disponible: {current_user.credits}"
        )

    # Lire les fichiers une seule fois avant la boucle
    attachments = []
    for file in files:
        file_content = await file.read()
        filename = file.filename
        mime_type, _ = mimetypes.guess_type(filename)
        if mime_type is None:
            mime_type = 'application/octet-stream'  # Par défaut si inconnu
        attachments.append((filename, file_content, mime_type))
        logger.debug(f"Fichier préparé : {filename}, type MIME : {mime_type}")

    try:
        # Créer le service Gmail
        service = build('gmail', 'v1', credentials=credentials)

        success_count = 0
        errors = []

        # Parcourir toutes les lignes
        for i, row in enumerate(rows):
            logger.debug(f"Traitement de la ligne {i + 1} : {row}")
            if len(row) <= email_index or not row[email_index].strip():
                logger.warning(f"Ligne {i + 1} ignorée : pas d'email valide")
                continue

            try:
                # Personnaliser le contenu
                personalized_content = content
                for j, header in enumerate(headers):
                    value = row[j] if j < len(row) else ""
                    personalized_content = personalized_content.replace(f"{{{{{header}}}}}", value)
                logger.debug(f"Contenu personnalisé pour {row[email_index]} : {personalized_content}")

                # Créer le message
                message = MIMEMultipart()
                message["to"] = row[email_index]
                message["subject"] = subject
                
                # Corps du message en HTML
                html_part = MIMEText(personalized_content, "html")
                message.attach(html_part)

                # Signature
                signature = """
                <br><br>
                <div style="color: #666; font-size: 12px; margin-top: 20px;">
                    Envoyé avec QuickSend – <a href="https://quicksend.app">Envoyez vos emails facilement</a>
                </div>
                """
                signature_part = MIMEText(signature, "html")
                message.attach(signature_part)

                # Ajouter les pièces jointes
                for filename, file_content, mime_type in attachments:
                    if mime_type.startswith('image/'):
                        part = MIMEImage(file_content, name=filename, _subtype=mime_type.split('/')[1])
                    else:
                        part = MIMEApplication(file_content, Name=filename)
                    part['Content-Disposition'] = f'attachment; filename="{filename}"'
                    message.attach(part)

                # Encoder et envoyer
                raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
                service.users().messages().send(
                    userId="me",
                    body={"raw": raw}
                ).execute()
                logger.info(f"Email envoyé avec succès à {row[email_index]}")

                success_count += 1

            except Exception as e:
                error_msg = f"Erreur lors de l'envoi à {row[email_index]} : {str(e)}"
                logger.error(error_msg)
                errors.append({
                    "email": row[email_index],
                    "error": str(e)
                })

        # Déduire les crédits pour les emails réussis
        if success_count > 0:
            current_user.credits -= success_count
            db.commit()
            logger.info(f"Crédits mis à jour : {current_user.credits} restants")

        return {
            "message": f"{success_count} emails envoyés avec succès",
            "success_count": success_count,
            "error_count": len(errors),
            "errors": errors,
            "remaining_credits": current_user.credits
        }

    except Exception as e:
        logger.error(f"Erreur générale : {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )