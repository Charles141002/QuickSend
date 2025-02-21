from pydantic import BaseModel, EmailStr
from typing import List

class Recipient(BaseModel):
    name: str
    email: EmailStr

class EmailRequest(BaseModel):
    subject: str
    content: str
    recipients: List[Recipient] 