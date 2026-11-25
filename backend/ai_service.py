import json
import os
import time
from typing import Any
from fastapi import HTTPException, status
from google import genai
from google.genai import types

GEMINI_MODEL = "gemini-3.1-flash-lite"
GEMINI_FALLBACK_MODEL = "gemini-4-hydrogen"


def _get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY is not configured on the server.",
        )
    return genai.Client(api_key=api_key)


def _call_with_retry(fn):
    plan = [
        (GEMINI_MODEL, 0.4),
        (GEMINI_FALLBACK_MODEL, 0.0),
    ]
    last_exc = None
    for idx, (model, delay) in enumerate(plan):
        try:
            return fn(model)
        except Exception as exc:
            last_exc = exc
            msg = str(exc)
            if any(code in msg for code in ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED")) and idx < len(plan) - 1:
                if delay > 0:
                    time.sleep(delay)
                continue
            raise
    raise last_exc


def _generate_json(prompt: str, system_instruction: str, schema: dict[str, Any]) -> Any:
    client = _get_client()
    try:
        response = _call_with_retry(
            lambda model: client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    thinking_config=types.ThinkingConfig(
                        thinking_level="MINIMAL" if model == "gemini-3.1-flash-lite" else "LOW"
                    ),
                    response_mime_type="application/json",
                    response_schema=schema,
                ),
            )
        )
        text = (response.text or "").strip()
        if not text:
            raise ValueError("Empty response from Gemini API.")
        return json.loads(text)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI generation failed: {str(exc)}",
        )


def generate_startup_recommendations(profile: dict, overrides: dict | None = None) -> list[dict]:
    overrides = overrides or {}
    budget = overrides.get("custom_budget") if overrides.get("custom_budget") is not None else profile.get("investment_budget", 0)
    location = overrides.get("custom_location") or profile.get("location") or "India"
    focus = overrides.get("focus_sector") or ""
    notes = overrides.get("additional_notes") or ""

    system_instruction = (
        "You are a pragmatic startup advisor. Return a JSON array of EXACTLY 5 distinct, realistic startup "
        "recommendations matched to the user's profile, skills, capital budget, risk appetite, and geography. "
        "Keep description and match_explanation to 1-2 crisp sentences, and each array to 2 concise items. "
        "Do not fabricate market statistics. Ensure required_investment_inr fits realistically near or within the user's budget."
    )

    prompt = (
        f"Founder Profile:\n"
        f"- Name: {profile.get('full_name', 'Founder')}\n"
        f"- Education: {profile.get('education', 'Not specified')}\n"
        f"- Technical Skills: {', '.join(profile.get('technical_skills', [])) or 'None specified'}\n"
        f"- Business Skills: {', '.join(profile.get('business_skills', [])) or 'None specified'}\n"
        f"- Interests: {', '.join(profile.get('interests', [])) or 'General'}\n"
        f"- Investment Budget: {budget} {profile.get('currency', 'INR')}\n"
        f"- Location: {location}\n"
        f"- Business Experience: {profile.get('business_experience', 'First-time founder')}\n"
        f"- Risk Preference: {profile.get('risk_preference', 'Moderate')}\n"
        f"- Optional Focus Sector: {focus or 'Open'}\n"
        f"- Additional Notes: {notes or 'None'}\n\n"
        "Return a JSON array of 5 startup recommendations."
    )

    schema = {
        "type": "ARRAY",
        "items": {
            "type": "OBJECT",
            "properties": {
                "business_name": {"type": "STRING"},
                "tagline": {"type": "STRING"},
                "description": {"type": "STRING"},
                "industry": {"type": "STRING"},
                "required_investment_inr": {"type": "NUMBER"},
                "required_investment_label": {"type": "STRING"},
                "estimated_monthly_expenses_inr": {"type": "NUMBER"},
                "estimated_monthly_revenue_inr": {"type": "NUMBER"},
                "target_customers": {"type": "STRING"},
                "required_skills": {"type": "ARRAY", "items": {"type": "STRING"}},
                "market_opportunities": {"type": "ARRAY", "items": {"type": "STRING"}},
                "business_challenges": {"type": "ARRAY", "items": {"type": "STRING"}},
                "risk_level": {"type": "STRING", "enum": ["Low", "Medium", "High"]},
                "suitability_score": {"type": "INTEGER"},
                "match_explanation": {"type": "STRING"},
            },
            "required": [
                "business_name",
                "tagline",
                "description",
                "industry",
                "required_investment_inr",
                "required_investment_label",
                "estimated_monthly_expenses_inr",
                "estimated_monthly_revenue_inr",
                "target_customers",
                "required_skills",
                "market_opportunities",
                "business_challenges",
                "risk_level",
                "suitability_score",
                "match_explanation",
            ],
        },
    }

    result = _generate_json(prompt, system_instruction, schema)
    if not isinstance(result, list) or len(result) == 0:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI did not return startup recommendations.",
        )
    return result[:5]


def generate_market_analysis(topic: str, industry: str, location: str, profile: dict | None = None) -> dict:
    system_instruction = (
        "You are a senior market research analyst. Provide qualitative, grounded market intelligence. "
        "CRITICAL: Never invent or fabricate specific unverified market size dollar figures, percentages, or proprietary revenue statistics. "
        "Explicitly distinguish established structural/regulatory context from AI-synthesized qualitative insights, "
        "and recommend official authoritative sources (e.g., IBEF, DPIIT, MoSPI, RBI, industry associations) for primary verification."
    )

    prompt = (
        f"Conduct a market analysis for:\n"
        f"- Startup / Concept: {topic}\n"
        f"- Industry: {industry}\n"
        f"- Target Geography: {location}\n"
        f"- Founder Budget Context: {(profile or {}).get('investment_budget', 'Not specified')} INR\n"
    )

    schema = {
        "type": "OBJECT",
        "properties": {
            "summary": {"type": "STRING"},
            "verified_context": {
                "type": "OBJECT",
                "properties": {
                    "disclaimer": {"type": "STRING"},
                    "structural_facts": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "official_sources_to_verify": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "name": {"type": "STRING"},
                                "purpose": {"type": "STRING"},
                            },
                            "required": ["name", "purpose"],
                        },
                    },
                },
                "required": ["disclaimer", "structural_facts", "official_sources_to_verify"],
            },
            "ai_insights": {
                "type": "OBJECT",
                "properties": {
                    "target_audience": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "market_opportunities": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "competitor_overview": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "archetype": {"type": "STRING"},
                                "positioning": {"type": "STRING"},
                                "differentiation_angle": {"type": "STRING"},
                            },
                            "required": ["archetype", "positioning", "differentiation_angle"],
                        },
                    },
                    "industry_trends": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "business_challenges": {"type": "ARRAY", "items": {"type": "STRING"}},
                },
                "required": [
                    "target_audience",
                    "market_opportunities",
                    "competitor_overview",
                    "industry_trends",
                    "business_challenges",
                ],
            },
        },
        "required": ["summary", "verified_context", "ai_insights"],
    }

    return _generate_json(prompt, system_instruction, schema)


def generate_business_plan(
    business_name: str,
    industry: str,
    profile: dict,
    startup_context: dict | None = None,
    custom_notes: str | None = None,
) -> dict:
    system_instruction = (
        "You are an experienced startup CFO and venture strategist. Write a clear, thorough, investor-ready "
        "business plan tailored to the founder's profile, location, and budget. Label financial projections clearly as estimates."
    )

    prompt = (
        f"Business Name: {business_name}\n"
        f"Industry: {industry}\n"
        f"Founder Profile: {json.dumps(profile, default=str)}\n"
        f"Selected Startup Concept: {json.dumps(startup_context, default=str) if startup_context else 'Custom Venture'}\n"
        f"Additional Founder Notes: {custom_notes or 'None'}\n\n"
        "Generate all 11 business plan sections in structured JSON."
    )

    schema = {
        "type": "OBJECT",
        "properties": {
            "executive_summary": {"type": "STRING"},
            "business_introduction": {"type": "STRING"},
            "problem_statement": {"type": "STRING"},
            "proposed_solution": {"type": "STRING"},
            "target_market": {"type": "STRING"},
            "competitor_analysis": {"type": "STRING"},
            "marketing_strategy": {"type": "STRING"},
            "investment_requirements": {"type": "STRING"},
            "revenue_model": {"type": "STRING"},
            "risk_analysis": {"type": "STRING"},
            "future_growth": {"type": "STRING"},
        },
        "required": [
            "executive_summary",
            "business_introduction",
            "problem_statement",
            "proposed_solution",
            "target_market",
            "competitor_analysis",
            "marketing_strategy",
            "investment_requirements",
            "revenue_model",
            "risk_analysis",
            "future_growth",
        ],
    }

    return _generate_json(prompt, system_instruction, schema)


def generate_startup_roadmap(business_name: str, industry: str, profile: dict, startup_context: dict | None = None) -> list[dict]:
    system_instruction = (
        "You are a startup execution mentor. Create a practical, step-by-step launch roadmap covering all 8 core phases: "
        "1. Idea Validation, 2. Market Research, 3. Business Registration, 4. Financial Planning, "
        "5. Product Development, 6. Marketing, 7. Customer Acquisition, 8. Business Launch. "
        "Each phase must contain 3 concrete, actionable tasks tailored to the user's business and location."
    )

    prompt = (
        f"Business Name: {business_name}\n"
        f"Industry: {industry}\n"
        f"Location: {profile.get('location', 'India')}\n"
        f"Budget: {profile.get('investment_budget', 0)} {profile.get('currency', 'INR')}\n"
        f"Startup Context: {json.dumps(startup_context, default=str) if startup_context else 'Custom'}\n"
    )

    schema = {
        "type": "ARRAY",
        "items": {
            "type": "OBJECT",
            "properties": {
                "phase": {"type": "STRING"},
                "summary": {"type": "STRING"},
                "tasks": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "title": {"type": "STRING"},
                            "description": {"type": "STRING"},
                            "estimated_timeline": {"type": "STRING"},
                        },
                        "required": ["title", "description", "estimated_timeline"],
                    },
                },
            },
            "required": ["phase", "summary", "tasks"],
        },
    }

    return _generate_json(prompt, system_instruction, schema)


def generate_venturebot_reply(
    user_message: str,
    profile: dict | None,
    selected_startup: dict | None,
    history: list[dict],
) -> str:
    client = _get_client()
    system_instruction = (
        "You are VentureBot, an expert AI startup advisor inside EntrepreneurAI. "
        "You advise students, graduates, and aspiring entrepreneurs on startup ideas, entrepreneurship, "
        "business planning, financial modeling, go-to-market strategy, and Indian government schemes "
        "(such as Startup India Seed Fund Scheme, DPIIT Recognition, PMEGP, PMMY/MUDRA, CGTMSE, and Stand-Up India). "
        "Always ground advice in the user's profile and selected startup when provided. "
        "Never invent fake market numbers or unverified government scheme rules; clearly label projections as estimates.\n\n"
        f"User Profile Context: {json.dumps(profile or {}, default=str)}\n"
        f"Selected Startup Context: {json.dumps(selected_startup or {}, default=str)}"
    )

    contents = []
    for item in history[-12:]:
        role = "model" if item.get("role") == "assistant" else "user"
        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=item.get("content", ""))]))
    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_message)]))

    try:
        response = _call_with_retry(
            lambda model: client.models.generate_content(
                model=model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    thinking_config=types.ThinkingConfig(
                        thinking_level="MINIMAL" if model == "gemini-3.1-flash-lite" else "LOW"
                    ),
                ),
            )
        )
        reply = (response.text or "").strip()
        if not reply:
            raise ValueError("Empty reply from VentureBot.")
        return reply
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"VentureBot failed to respond: {str(exc)}",
        )
