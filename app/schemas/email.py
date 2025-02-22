from pydantic import BaseModel, EmailStr
from typing import List, Optional

class Recipient(BaseModel):
    name: str
    email: EmailStr

class EmailRequest(BaseModel):
    spreadsheet_id: str
    range_name: str
    subject: str
    content: str
    attachments: Optional[List[str]] = None  # Liste optionnelle des chemins ou noms de fichiers