from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from typing import List, Dict
import logging

from ..database import get_db
from ..models.user import User
from ..config import get_settings
from .auth import get_current_user

router = APIRouter()
settings = get_settings()

# Configurer le logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fonction utilitaire pour créer un service Google avec les credentials de l'utilisateur
def get_google_service(service_name: str, version: str, credentials: Credentials):
    try:
        if credentials.expired and credentials.refresh_token:
            logger.info("Rafraîchissement du token OAuth pour Google Sheets")
            credentials.refresh(Request())
        return build(service_name, version, credentials=credentials)
    except Exception as e:
        logger.error(f"Erreur lors de la création du service Google : {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur Google API : {str(e)}")

# Lister les Google Sheets de l'utilisateur
@router.get("", response_model=List[Dict[str, str]])
async def list_user_sheets(current_user: User = Depends(get_current_user)):
    """Liste tous les Google Sheets accessibles à l'utilisateur connecté"""
    if not current_user.google_tokens or "token" not in current_user.google_tokens:
        raise HTTPException(status_code=400, detail="Connexion Google requise. Veuillez vous connecter via OAuth.")
    
    credentials = Credentials(
        token=current_user.google_tokens["token"],
        refresh_token=current_user.google_tokens.get("refresh_token"),
        token_uri=current_user.google_tokens.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=current_user.google_tokens.get("client_id", settings.GOOGLE_CLIENT_ID),
        client_secret=current_user.google_tokens.get("client_secret", settings.GOOGLE_CLIENT_SECRET),
        scopes=current_user.google_tokens.get("scopes")
    )

    drive_service = get_google_service("drive", "v3", credentials)
    try:
        results = drive_service.files().list(
            q="mimeType='application/vnd.google-apps.spreadsheet'",
            fields="files(id, name)"
        ).execute()
        sheets = results.get('files', [])
        logger.info(f"{len(sheets)} Google Sheets trouvés pour l'utilisateur {current_user.email}")
        return [{"id": sheet['id'], "name": sheet['name']} for sheet in sheets]
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des Sheets : {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des Sheets : {str(e)}")

# Récupérer les noms des feuilles d’un Google Sheet
@router.get("/{spreadsheet_id}/sheet-names", response_model=List[str])
async def get_sheet_names(
    spreadsheet_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupère les noms des feuilles (onglets) d’un Google Sheet spécifique"""
    if not current_user.google_tokens or "token" not in current_user.google_tokens:
        raise HTTPException(status_code=400, detail="Connexion Google requise.")

    credentials = Credentials(
        token=current_user.google_tokens["token"],
        refresh_token=current_user.google_tokens.get("refresh_token"),
        token_uri=current_user.google_tokens.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=current_user.google_tokens.get("client_id", settings.GOOGLE_CLIENT_ID),
        client_secret=current_user.google_tokens.get("client_secret", settings.GOOGLE_CLIENT_SECRET),
        scopes=current_user.google_tokens.get("scopes")
    )

    sheets_service = get_google_service("sheets", "v4", credentials)
    try:
        # Récupérer les métadonnées du classeur
        result = sheets_service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        sheet_names = [sheet['properties']['title'] for sheet in result.get('sheets', [])]
        
        if not sheet_names:
            raise HTTPException(status_code=400, detail="Aucune feuille trouvée dans ce Google Sheet")
        
        logger.info(f"Noms des feuilles pour le Sheet {spreadsheet_id} : {sheet_names}")
        
        # Mettre à jour le token si rafraîchi
        if credentials.token != current_user.google_tokens["token"]:
            current_user.google_tokens["token"] = credentials.token
            db.commit()
            logger.info(f"Token OAuth mis à jour pour l'utilisateur {current_user.email}")
        
        return sheet_names
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des noms des feuilles : {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des noms des feuilles : {str(e)}")

# Récupérer les en-têtes d’un Google Sheet
@router.get("/{spreadsheet_id}/headers")
async def get_sheet_headers(
    spreadsheet_id: str,
    range_name: str = "Sheet1!A1:Z",  # Par défaut, mais sera remplacé dynamiquement
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupère les en-têtes (première ligne) d’un Google Sheet spécifique"""
    if not current_user.google_tokens or "token" not in current_user.google_tokens:
        raise HTTPException(status_code=400, detail="Connexion Google requise.")

    credentials = Credentials(
        token=current_user.google_tokens["token"],
        refresh_token=current_user.google_tokens.get("refresh_token"),
        token_uri=current_user.google_tokens.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=current_user.google_tokens.get("client_id", settings.GOOGLE_CLIENT_ID),
        client_secret=current_user.google_tokens.get("client_secret", settings.GOOGLE_CLIENT_SECRET),
        scopes=current_user.google_tokens.get("scopes")
    )

    sheets_service = get_google_service("sheets", "v4", credentials)
    try:
        result = sheets_service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id,
            range=range_name
        ).execute()
        sheet_data = result.get('values', [])
        if not sheet_data:
            raise HTTPException(status_code=400, detail="Le Google Sheet est vide ou inaccessible")
        
        headers = sheet_data[0]
        logger.info(f"En-têtes récupérés pour le Sheet {spreadsheet_id} : {headers}")
        
        if credentials.token != current_user.google_tokens["token"]:
            current_user.google_tokens["token"] = credentials.token
            db.commit()
            logger.info(f"Token OAuth mis à jour pour l'utilisateur {current_user.email}")
        
        return {"headers": headers}
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des en-têtes : {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des en-têtes : {str(e)}")

# Récupérer les données complètes d’un Google Sheet
@router.get("/{spreadsheet_id}/data")
async def get_sheet_data(
    spreadsheet_id: str,
    range_name: str = "Sheet1!A1:Z",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupère toutes les données d’un Google Sheet spécifique"""
    if not current_user.google_tokens or "token" not in current_user.google_tokens:
        raise HTTPException(status_code=400, detail="Connexion Google requise.")

    credentials = Credentials(
        token=current_user.google_tokens["token"],
        refresh_token=current_user.google_tokens.get("refresh_token"),
        token_uri=current_user.google_tokens.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=current_user.google_tokens.get("client_id", settings.GOOGLE_CLIENT_ID),
        client_secret=current_user.google_tokens.get("client_secret", settings.GOOGLE_CLIENT_SECRET),
        scopes=current_user.google_tokens.get("scopes")
    )

    sheets_service = get_google_service("sheets", "v4", credentials)
    try:
        result = sheets_service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id,
            range=range_name
        ).execute()
        sheet_data = result.get('values', [])
        if not sheet_data:
            raise HTTPException(status_code=400, detail="Le Google Sheet est vide ou inaccessible")
        
        logger.info(f"Données récupérées pour le Sheet {spreadsheet_id}, {len(sheet_data)} lignes")
        
        if credentials.token != current_user.google_tokens["token"]:
            current_user.google_tokens["token"] = credentials.token
            db.commit()
            logger.info(f"Token OAuth mis à jour pour l'utilisateur {current_user.email}")
        
        return {"data": sheet_data}
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des données : {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des données : {str(e)}")