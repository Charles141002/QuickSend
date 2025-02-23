from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
import logging

from .api import auth, emails, credits, sheets, public_emails  # Ajoutez public_emails
from app.database import engine
from app.models import User
from app.api import auth, emails, credits, sheets
from app.config import get_settings

from .models.email_tracking import EmailTracking  # Ajoutez cette ligne


# Configurer les logs
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

settings = get_settings()

# Créer les tables
User.metadata.create_all(bind=engine)
EmailTracking.metadata.create_all(bind=engine)  # Ajoutez cette ligne

security = HTTPBearer()

app = FastAPI(
    title="QuickSend API",
    description="API pour l'envoi d'emails via Gmail",
    version="1.0.0"
)

# Application publique sans sécurité
public_app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À modifier en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

app.include_router(
    emails.router,
    prefix="/api/emails",
    tags=["emails"],
    dependencies=[Depends(security)]
)

# Route webhook sans authentification (doit être AVANT la route sécurisée)
app.include_router(
    credits.webhook_router,
    prefix="/api/credits",
    tags=["credits-webhook"]
)

# Routes crédits sécurisées
app.include_router(
    credits.router,
    prefix="/api/credits",
    tags=["credits"],
    dependencies=[Depends(security)]
)

# Routes pour Google Sheets sécurisées
app.include_router(
    sheets.router,
    prefix="/api/sheets",
    tags=["sheets"],
    dependencies=[Depends(security)]
)

# Routes publiques (montées sous /public)
app.mount("/public", public_app)
public_app.include_router(public_emails.router, prefix="/api/emails", tags=["public-emails"])

@app.get("/")
def read_root():
    return {"message": "Welcome to QuickSend API"}