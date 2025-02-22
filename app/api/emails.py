from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import base64
from typing import Dict

from ..database import get_db
from ..models.user import User
from ..schemas.email import EmailRequest
from .auth import get_current_user
from ..api.sheets import get_sheet_data  # Importer depuis sheets.py

router = APIRouter()

@router.post("/send")
async def send_emails(
    request: EmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Envoie des emails personnalisés en utilisant un Google Sheet"""
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

    # Récupérer les données du Google Sheet avec await
    sheet_response = await get_sheet_data(request.spreadsheet_id, request.range_name, current_user, db)
    sheet_data = sheet_response.get('data', [])  # Extraire la liste depuis la clé 'data'
    print(sheet_data, "sheet_data")
    print(len(sheet_data), "len(sheet_data)")
    if not sheet_data or len(sheet_data) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le Google Sheet est vide ou mal configuré"
        )

    headers = sheet_data[0]
    rows = sheet_data[1:]
    if "Email" not in headers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La colonne 'Email' est requise dans le Sheet"
        )

    email_index = headers.index("Email")
    
    # Vérifier les crédits disponibles (compter les lignes avec un email valide)
    valid_rows = [row for row in rows if len(row) > email_index and row[email_index]]
    if current_user.credits < len(valid_rows):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Crédits insuffisants. Nécessaire: {len(valid_rows)}, Disponible: {current_user.credits}"
        )

    try:
        # Créer le service Gmail
        service = build('gmail', 'v1', credentials=credentials)

        success_count = 0
        errors = []

        # Itérer directement sur toutes les lignes du Sheet
        for row in rows:
            if len(row) <= email_index or not row[email_index]:
                continue  # Ignorer les lignes sans email valide

            try:
                # Personnaliser le contenu pour chaque ligne
                personalized_content = request.content
                for i, header in enumerate(headers):
                    value = row[i] if i < len(row) else ""
                    personalized_content = personalized_content.replace(f"{{{{{header}}}}}", value)

                # Créer le message
                message = MIMEMultipart()
                message["to"] = row[email_index]
                message["subject"] = request.subject
                
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

                # Encoder et envoyer
                raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
                service.users().messages().send(
                    userId="me",
                    body={"raw": raw}
                ).execute()

                success_count += 1

            except Exception as e:
                errors.append({
                    "email": row[email_index],
                    "error": str(e)
                })

        # Déduire les crédits pour les emails réussis
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

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )