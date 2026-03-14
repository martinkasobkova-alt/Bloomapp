from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from typing import List, Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str
    pronouns: str = "ona/její"
    avatar: str = "fem-pink"
    location: str = ""
    district: str = ""
    phone: str = ""
    bio: str = ""
    custom_avatar: Optional[str] = None
    secret_code: str = ""
    website: str = ""  # honeypot field — must be empty
    turnstile_token: Optional[str] = None  # Cloudflare Turnstile anti-spam

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v):
        import re
        if len(v) < 8:
            raise ValueError('Heslo musí mít alespoň 8 znaků')
        if not re.search(r'[a-z]', v):
            raise ValueError('Heslo musí obsahovat alespoň jedno malé písmeno')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Heslo musí obsahovat alespoň jedno velké písmeno')
        if not re.search(r'[0-9]', v):
            raise ValueError('Heslo musí obsahovat alespoň jedno číslo')
        if not re.search(r'[^a-zA-Z0-9]', v):
            raise ValueError('Heslo musí obsahovat alespoň jeden speciální znak (!@#$%...)')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    username: str
    pronouns: str
    avatar: str
    location: str = ""
    district: str = ""
    phone: str = ""
    bio: str = ""
    custom_avatar: Optional[str] = None
    role: str = "user"
    avg_rating: float = 0
    rating_count: int = 0
    badges: List[str] = []
    created_at: str


class UserRatingCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = ""


class JourneyUpdate(BaseModel):
    stage: str = ""
    stage_label: str = ""
    is_public: bool = False
    note: str = ""


class UserReportCreate(BaseModel):
    reason: str  # spam | nevhodne-chovani | podvod | falesny-profil | jiny
    description: str = ""
