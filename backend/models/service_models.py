from pydantic import BaseModel, ConfigDict
from typing import Optional


class ServiceCreate(BaseModel):
    offer: str
    need: str
    description: str
    location: str = ""
    service_type: str = ""
    post_type: str = "offer"  # offer | request


class ServiceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    username: str
    avatar: str = "fem-pink"
    custom_avatar: Optional[str] = ""
    offer: str
    need: str
    description: str
    location: str
    service_type: str = ""
    service_status: str = "active"
    post_type: str = "offer"
    created_at: str
    expires_at: Optional[str] = None
