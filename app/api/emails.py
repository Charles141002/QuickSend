from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import base64

from ..database import get_db
from ..models.user import User
from ..schemas.email import EmailRequest
from .auth import get_current_user

router = APIRouter()

@router.post("/send")
async def send_emails(
    request: EmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Envoie des emails personnalisés"""
    # Vérifier les crédits disponibles
    if current_user.credits < len(request.recipients):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Crédits insuffisants. Nécessaire: {len(request.recipients)}, Disponible: {current_user.credits}"
        )

    try:
        # Récupérer les credentials Google de l'utilisateur
        if not current_user.google_tokens:
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

        # Créer le service Gmail
        service = build('gmail', 'v1', credentials=credentials)

        success_count = 0
        errors = []

        for recipient in request.recipients:
            try:
                # Personnaliser le message
                personalized_content = request.content.replace(
                    "[Prénom]", recipient.name
                )

                # Créer le message
                message = MIMEMultipart()
                message["to"] = recipient.email
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
                    "email": recipient.email,
                    "error": str(e)
                })

        # Déduire les crédits pour les emails réussis
        if success_count > 0:
            current_user.credits -= success_count
            db.commit()

        return {
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

