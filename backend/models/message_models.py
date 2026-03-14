from pydantic import BaseModel, ConfigDict
from typing import Optional


class MessageCreate(BaseModel):
    to_user_id: str
    content: str = ""
    media_url: Optional[str] = ""  # Legacy: public Cloudinary URL. New restricted: omit, use media_public_id.
    media_type: Optional[str] = ""  # "image" | "video" | "audio"
    media_public_id: Optional[str] = ""  # For restricted media: Cloudinary public_id
    media_resource_type: Optional[str] = ""  # For restricted media: "image" | "video" | "raw"


class MessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    from_user_id: str
    from_username: str
    to_user_id: str
    to_username: str
    content: str
    media_url: Optional[str] = ""
    media_type: Optional[str] = ""
    read: bool = False
    created_at: str


class ConversationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    username: str
    avatar: str
    last_message: str
    last_message_time: str
    unread_count: int = 0
