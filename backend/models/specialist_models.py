from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional


class SpecialistCreate(BaseModel):
    name: str
    specialty: str
    description: str = ""
    subcategory: str = ""
    address: str
    city: str
    region: str = ""
    country: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    website: Optional[str] = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    assigned_locations: List[str] = []


class ReviewCreate(BaseModel):
    specialist_id: str
    rating: int = Field(ge=1, le=5)
    content: str


class ReviewResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    specialist_id: str
    user_id: str
    username: str
    rating: int
    content: str
    created_at: str


class SpecialistResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    specialty: str
    description: str = ""
    subcategory: str = ""
    address: str
    city: str
    region: str = ""
    country: str
    phone: str
    email: str
    website: str
    lat: Optional[float]
    lng: Optional[float]
    avg_rating: float = 0
    review_count: int = 0
    status: str = "approved"
    assigned_locations: List[str] = []


class SpecialistCategoryUpdate(BaseModel):
    name: str
