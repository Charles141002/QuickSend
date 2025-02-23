from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from datetime import datetime, timedelta
import jwt
from fastapi.responses import RedirectResponse
import logging
from ..database import get_db
from ..config import get_settings
from ..models.user import User
from ..schemas.user import User as UserSchema
import uuid

router = APIRouter()
settings = get_settings()
security = HTTPBearer()
logger = logging.getLogger(__name__)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Récupère l'utilisateur actuel à partir du token JWT"""
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Token invalide")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token invalide")

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    return user

@router.get("/login")
async def login(request: Request):
    """Génère l'URL de connexion Google"""
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
            }
        },
        scopes=[
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/spreadsheets.readonly"  # Ajouté pour cohérence
        ]
    )
    
    redirect_uri = request.query_params.get("redirect_uri") or settings.GOOGLE_REDIRECT_URI
    state = request.query_params.get("state") or str(uuid.uuid4())  # Générer un state si absent
    flow.redirect_uri = redirect_uri
    
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        state=state,
        prompt="consent"
    )
    logger.info(f"URL d'autorisation générée avec state: {state}")
    return {"authorization_url": authorization_url, "state": state}

@router.get("/callback", include_in_schema=False)
async def auth_callback(code: str, state: str = None, db: Session = Depends(get_db)):
    """Gère le callback de Google OAuth"""
    logger.info(f"Callback appelé avec code: {code}, state: {state}")
    try:
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
                }
            },
            scopes=[
                "openid",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/gmail.send",
                "https://www.googleapis.com/auth/drive.readonly",
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/spreadsheets.readonly"  # Ajouté pour cohérence
            ]
        )
        flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
        logger.info(f"Tentative de fetch_token avec code: {code}, state: {state}")
        
        # Récupérer les tokens avec le code
        flow.fetch_token(code=code)
        credentials = flow.credentials
        logger.info(f"Credentials récupérés: {credentials.token[:10]}...")

        # Récupérer les informations de l'utilisateur
        service = build('oauth2', 'v2', credentials=credentials)
        user_info = service.userinfo().get().execute()
        email = user_info['email']
        logger.info(f"Utilisateur identifié: {email}")

        # Créer ou mettre à jour l'utilisateur dans la DB
        db_user = db.query(User).filter(User.email == email).first()
        if not db_user:
            db_user = User(
                email=email,
                credits=100,
                google_tokens={
                    "token": credentials.token,
                    "refresh_token": credentials.refresh_token,
                    "token_uri": credentials.token_uri,
                    "client_id": credentials.client_id,
                    "client_secret": credentials.client_secret,
                    "scopes": credentials.scopes
                }
            )
            db.add(db_user)
            logger.info(f"Nouvel utilisateur créé: {email}")
        else:
            db_user.google_tokens = {
                "token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "token_uri": credentials.token_uri,
                "client_id": credentials.client_id,
                "client_secret": credentials.client_secret,
                "scopes": credentials.scopes
            }
            logger.info(f"Utilisateur existant mis à jour: {email}")

        db.commit()
        db.refresh(db_user)

        # Générer le JWT
        access_token = create_access_token(data={"sub": email})
        logger.info(f"JWT généré, redirection vers frontend")
        return RedirectResponse(url=f"http://localhost:3000/user-home?token={access_token}")

    except Exception as e:
        logger.error(f"Erreur dans callback: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

def create_access_token(data: dict):
    """Crée un JWT token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt 

@router.get("/me")
async def get_current_user_endpoint(current_user: User = Depends(get_current_user)):
    return current_user