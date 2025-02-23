# app/api/public_emails.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import logging
from ..database import get_db
from ..models.email_tracking import EmailTracking
from ..models.user import User
from ..api.sheets import get_google_service
from google.oauth2.credentials import Credentials

# Créer un routeur sans dépendance de sécurité
router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/track/open/{track_id}")
async def track_email_open(track_id: str, db: Session = Depends(get_db)):
    """Enregistre l'ouverture d'un email et met à jour le Google Sheet."""
    logger.info(f"Requête de suivi pour track_id: {track_id}")
    tracking = db.query(EmailTracking).filter(EmailTracking.track_id == track_id).first()
    if not tracking or tracking.opened_at:
        logger.warning(f"Track_id {track_id} non trouvé ou déjà ouvert")
        return {"message": "Ouverture déjà enregistrée ou non trouvée"}

    # Mettre à jour la date d'ouverture dans la base de données
    tracking.opened_at = datetime.utcnow()
    db.commit()

    # Récupérer les informations de l'utilisateur pour les credentials Google
    user = db.query(User).filter(User.id == tracking.user_id).first()
    if not user or not user.google_tokens:
        logger.error(f"Utilisateur {tracking.user_id} ou tokens non trouvés")
        return {"message": "Erreur serveur"}

    credentials = Credentials(
        token=user.google_tokens["token"],
        refresh_token=user.google_tokens.get("refresh_token"),
        token_uri=user.google_tokens.get("token_uri"),
        client_id=user.google_tokens.get("client_id"),
        client_secret=user.google_tokens.get("client_secret"),
        scopes=user.google_tokens.get("scopes")
    )

    # Mettre à jour le Google Sheet
    sheets_service = get_google_service("sheets", "v4", credentials)
    headers = sheets_service.spreadsheets().values().get(
        spreadsheetId=tracking.spreadsheet_id,
        range=f"{tracking.sheet_name}!A1:Z1"
    ).execute().get('values', [[]])[0]
    column_letter = chr(65 + headers.index("Opened"))
    range_to_update = f"{tracking.sheet_name}!{column_letter}{tracking.row_index}"
    sheets_service.spreadsheets().values().update(
        spreadsheetId=tracking.spreadsheet_id,
        range=range_to_update,
        valueInputOption="RAW",
        body={"values": [["Yes"]]}
    ).execute()
    logger.info(f"Google Sheet mis à jour: {range_to_update}")
    return {"message": "Ouverture enregistrée"}