from pydantic import BaseModel, EmailStr
from typing import List

class Recipient(BaseModel):
    name: str
    email: EmailStr

class EmailRequest(BaseModel):
    spreadsheet_id: str
    range_name: str
    subject: str
    content: str