from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer

from app.database import engine
from app.models import User
from app.api import auth, emails, credits, sheets  # Ajout de sheets ici
from app.config import get_settings

settings = get_settings()

# Créer les tables
User.metadata.create_all(bind=engine)

security = HTTPBearer()

app = FastAPI(
    title="QuickSend API",
    description="API pour l'envoi d'emails via Gmail",
    version="1.0.0"
)

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
    prefix="/api/sheets",  # Préfixe déjà défini dans sheets.py comme /sheets
    tags=["sheets"],
    dependencies=[Depends(security)]
)

@app.get("/")
def read_root():
    return {"message": "Welcome to QuickSend API"}