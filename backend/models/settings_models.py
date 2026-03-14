from pydantic import BaseModel, EmailStr
from typing import Optional


class CommunityPasswordUpdate(BaseModel):
    password: str


class EntryPasswordToggle(BaseModel):
    enabled: bool


class ContactEmailUpdate(BaseModel):
    email: str


class GallerySettingsUpdate(BaseModel):
    privacy: str  # public | protected
    password: str = ""


class GalleryVerify(BaseModel):
    password: str


class PhotoTagsUpdate(BaseModel):
    tags: list  # [{ user_id, username }]


class BugReportCreate(BaseModel):
    report_type: str
    description: str
    page_url: str = ""
    browser_info: str = ""


class BugReportStatusUpdate(BaseModel):
    status: str  # new | investigating | fixed


class PasswordResetRequest(BaseModel):
    email: EmailStr


class SetupFirstAdminBody(BaseModel):
    email: str
    secret: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class TextSettingUpdate(BaseModel):
    key: str
    value: str
