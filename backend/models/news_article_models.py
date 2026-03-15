from pydantic import BaseModel, ConfigDict
from typing import List, Optional


class NewsCreate(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = ""
    video_url: Optional[str] = ""
    thumbnail_url: Optional[str] = ""
    category: str = "local"
    image_fit: Optional[str] = "cover"  # cover | contain | cover-top | cover-center | cover-bottom


class NewsResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    content: str
    image_url: str = ""
    video_url: str = ""
    thumbnail_url: str = ""
    category: str = "local"
    image_fit: str = "cover"
    admin_id: str = ""
    admin_name: str = ""
    author_id: str = ""
    author_name: str = ""
    is_community_story: bool = False
    created_at: str


class ArticleCreate(BaseModel):
    title: str
    content: str
    category: str
    published: bool = True


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    published: Optional[bool] = None


class ArticleResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    content: str
    category: str
    author_id: str
    author_name: str
    published: bool = True
    created_at: str


class QuestionCreate(BaseModel):
    title: str
    content: str = ""
    section: str = "legal"  # "legal" or "specialists"
    category: str = "all"   # topic/category filter value, "all" = general


class AnswerCreate(BaseModel):
    content: str
    signature: str = ""  # kept for backward compat — no longer used by UI


class AnswerResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    username: str
    user_role: str = "user"
    specialization_label: str = ""
    content: str
    signature: str = ""
    thanked_by: List[str] = []
    created_at: str


class QuestionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    username: str
    title: str
    content: str = ""
    section: str = "legal"
    category: str = "all"
    answers: List[AnswerResponse] = []
    vote_count: int = 0
    created_at: str
