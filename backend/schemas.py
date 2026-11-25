from typing import Literal
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class SettingsUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    current_password: str | None = None
    new_password: str | None = Field(default=None, min_length=8, max_length=128)


class ProfileUpdateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    education: str = Field(..., min_length=2, max_length=200)
    technical_skills: list[str] = Field(default_factory=list, max_length=30)
    business_skills: list[str] = Field(default_factory=list, max_length=30)
    interests: list[str] = Field(default_factory=list, max_length=30)
    investment_budget: float = Field(..., ge=0, le=1000000000)
    currency: str = Field(default="INR", max_length=10)
    location: str = Field(..., min_length=2, max_length=150)
    business_experience: str = Field(..., min_length=2, max_length=120)
    risk_preference: Literal["Low", "Moderate", "High"]


class GenerateRecommendationsRequest(BaseModel):
    education: str | None = Field(default=None, max_length=200)
    skills: str | list[str] | None = None
    focus_sector: str | None = Field(default=None, max_length=120)
    custom_budget: float | None = Field(default=None, ge=0, le=1000000000)
    custom_location: str | None = Field(default=None, max_length=150)
    additional_notes: str | None = Field(default=None, max_length=600)


class MarketAnalysisRequest(BaseModel):
    startup_id: str | None = None
    topic: str = Field(..., min_length=2, max_length=200)
    industry: str = Field(..., min_length=2, max_length=120)
    location: str = Field(default="India", max_length=120)


class FinancialCalculateRequest(BaseModel):
    startup_id: str | None = None
    title: str = Field(default="Startup Financial Scenario", min_length=2, max_length=160)
    initial_investment: float = Field(..., ge=0, le=1000000000)
    monthly_expenses: float = Field(..., ge=0, le=500000000)
    expected_monthly_revenue: float = Field(..., ge=0, le=500000000)
    monthly_growth_rate: float = Field(default=5.0, ge=-20.0, le=100.0)
    projection_months: int = Field(default=12, ge=6, le=36)
    save: bool = Field(default=True)


class BusinessPlanRequest(BaseModel):
    startup_id: str | None = None
    business_name: str = Field(..., min_length=2, max_length=160)
    industry: str = Field(..., min_length=2, max_length=120)
    custom_notes: str | None = Field(default=None, max_length=800)


class RoadmapRequest(BaseModel):
    startup_id: str | None = None
    business_name: str = Field(..., min_length=2, max_length=160)
    industry: str = Field(..., min_length=2, max_length=120)


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    startup_id: str | None = None
