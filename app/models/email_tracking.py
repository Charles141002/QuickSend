# app/models/email_tracking.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from ..database import Base

class EmailTracking(Base):
    """Modèle pour suivre les ouvertures des emails."""
    __tablename__ = "email_tracking"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    email = Column(String, index=True)  # Email du destinataire
    track_id = Column(String, unique=True, index=True)  # ID unique pour le pixel
    spreadsheet_id = Column(String)  # ID du Google Sheet
    sheet_name = Column(String)  # Nom de la feuille
    row_index = Column(Integer)  # Index de la ligne dans le Sheet (1-based)
    opened_at = Column(DateTime, nullable=True)  # Date/heure de l'ouverture