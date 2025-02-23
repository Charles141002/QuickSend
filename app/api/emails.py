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
import uuid
from ..database import get_db
from ..models.user import User
from ..models.email_tracking import EmailTracking  # Ajoutez cette ligne
from .auth import get_current_user
from ..api.sheets import get_google_service  # Importez pour réutiliser

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/send", response_model=dict)
async def send_emails(
    spreadsheet_id: str = Form(...),
    range_name: str = Form(...),
    subject: str = Form(...),
    content: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    track_emails: bool = Form(False),  # Nouveau paramètre pour activer le suivi
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Envoie des emails personnalisés avec suivi optionnel des ouvertures."""
    if not current_user.google_tokens or "token" not in current_user.google_tokens:
        raise HTTPException(status_code=401, detail="Tokens Google non trouvés.")

    credentials = Credentials(
        token=current_user.google_tokens["token"],
        refresh_token=current_user.google_tokens["refresh_token"],
        token_uri=current_user.google_tokens["token_uri"],
        client_id=current_user.google_tokens["client_id"],
        client_secret=current_user.google_tokens["client_secret"],
        scopes=current_user.google_tokens["scopes"]
    )

    # Récupérer les données du Google Sheet
    sheets_service = get_google_service("sheets", "v4", credentials)
    result = sheets_service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id,
        range=range_name
    ).execute()
    sheet_data = result.get('values', [])

    if not sheet_data or len(sheet_data) < 2:
        raise HTTPException(status_code=400, detail="Le Google Sheet est vide ou mal configuré")

    headers = sheet_data[0]
    rows = sheet_data[1:]
    if "Email" not in headers:
        raise HTTPException(status_code=400, detail="La colonne 'Email' est requise")
    
    # Ajouter la colonne "Opened" si elle n'existe pas
    if "Opened" not in headers:
        headers.append("Opened")
        sheets_service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=f"{range_name.split('!')[0]}!A1:{chr(65 + len(headers) - 1)}1",
            valueInputOption="RAW",
            body={"values": [headers]}
        ).execute()

    email_index = headers.index("Email")
    valid_rows = [row for row in rows if len(row) > email_index and row[email_index].strip()]
    if current_user.credits < len(valid_rows):
        raise HTTPException(status_code=400, detail=f"Crédits insuffisants: {len(valid_rows)} nécessaires, {current_user.credits} disponibles")

    # Préparer les pièces jointes
    attachments = [(file.filename, await file.read(), mimetypes.guess_type(file.filename)[0] or 'application/octet-stream') for file in files]

    # Service Gmail
    gmail_service = build('gmail', 'v1', credentials=credentials)
    success_count = 0
    errors = []

    for i, row in enumerate(rows):
        if len(row) <= email_index or not row[email_index].strip():
            continue

        try:
            # Personnaliser le contenu
            personalized_content = content
            for j, header in enumerate(headers[:-1]):  # Exclure "Opened"
                value = row[j] if j < len(row) else ""
                personalized_content = personalized_content.replace(f"{{{{{header}}}}}", value)

            message = MIMEMultipart()
            message["to"] = row[email_index]
            message["subject"] = subject
            html_part = MIMEText(personalized_content, "html")
            message.attach(html_part)

            # Ajouter le pixel de suivi si activé
            if track_emails:
                track_id = str(uuid.uuid4())
                tracking_pixel = f'<img src="https://4e48-2a01-e0a-130-2470-550f-8a4d-95b3-9dfd.ngrok-free.app/public/api/emails/track/open/{track_id}" width="100" height="100" style="background-color: black;" alt="Suivi d\'ouverture" />'
                message.attach(MIMEText(tracking_pixel, "html"))
                # Enregistrer le tracking
                db.add(EmailTracking(
                    user_id=current_user.id,
                    email=row[email_index],
                    track_id=track_id,
                    spreadsheet_id=spreadsheet_id,
                    sheet_name=range_name.split('!')[0],
                    row_index=i + 2  # 1-based index + header row
                ))

            # Signature
            signature = """
            <br><br>
            <div style="color: #666; font-size: 12px; margin-top: 20px;">
                Envoyé avec QuickSend – <a href="https://quicksend.app">Envoyez vos emails facilement</a>
            </div>
            """
            message.attach(MIMEText(signature, "html"))

            # Pièces jointes
            for filename, file_content, mime_type in attachments:
                if mime_type.startswith('image/'):
                    part = MIMEImage(file_content, name=filename, _subtype=mime_type.split('/')[1])
                else:
                    part = MIMEApplication(file_content, Name=filename)
                part['Content-Disposition'] = f'attachment; filename="{filename}"'
                message.attach(part)

            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
            gmail_service.users().messages().send(userId="me", body={"raw": raw}).execute()
            success_count += 1

        except Exception as e:
            errors.append({"email": row[email_index], "error": str(e)})

    if success_count > 0:
        current_user.credits -= success_count
        db.commit()

    return {
        "message": f"{success_count} emails envoyés avec succès",
        "success_count": success_count,
        "error_count": len(errors),
        "errors": errors,
        "remaining_credits": current_user.credits
    }
