from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware

import ai_service
from auth import create_access_token, get_current_user, hash_password, verify_password
from database import close_db, ensure_indexes, get_db
from schemas import (
    BusinessPlanRequest,
    ChatMessageRequest,
    FinancialCalculateRequest,
    GenerateRecommendationsRequest,
    LoginRequest,
    MarketAnalysisRequest,
    ProfileUpdateRequest,
    RegisterRequest,
    RoadmapRequest,
    SettingsUpdateRequest,
)
from schemes_data import VERIFIED_GOVERNMENT_SCHEMES

load_dotenv()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def compute_profile_completion(profile: dict | None) -> int:
    if not profile:
        return 0
    checks = [
        bool(profile.get("full_name")),
        bool(profile.get("education")),
        len(profile.get("technical_skills") or []) > 0,
        len(profile.get("business_skills") or []) > 0,
        len(profile.get("interests") or []) > 0,
        profile.get("investment_budget") is not None and float(profile.get("investment_budget", 0)) > 0,
        bool(profile.get("location")),
        bool(profile.get("business_experience")),
        bool(profile.get("risk_preference")),
    ]
    return round((sum(checks) / len(checks)) * 100)


async def log_activity(user_id: str, action: str, category: str, detail: str) -> None:
    db = get_db()
    await db.activities.insert_one({
        "id": str(uuid4()),
        "user_id": user_id,
        "action": action,
        "category": category,
        "detail": detail,
        "created_at": now_iso(),
    })


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await ensure_indexes()
    yield
    await close_db()


app = FastAPI(title="EntrepreneurAI API", version="1.0.0", lifespan=lifespan)

raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8080,http://127.0.0.1:8080")
allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "database": "mongodb", "ai_configured": bool(os.getenv("GEMINI_API_KEY"))}


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, response: Response):
    db = get_db()
    email = payload.email.strip().lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    user_id = str(uuid4())
    created_at = now_iso()
    user_doc = {
        "id": user_id,
        "name": payload.name.strip(),
        "email": email,
        "password_hash": hash_password(payload.password),
        "created_at": created_at,
    }
    await db.users.insert_one(user_doc)
    await db.profiles.insert_one({
        "user_id": user_id,
        "full_name": payload.name.strip(),
        "education": "",
        "technical_skills": [],
        "business_skills": [],
        "interests": [],
        "investment_budget": 0,
        "currency": "INR",
        "location": "",
        "business_experience": "",
        "risk_preference": "Moderate",
        "updated_at": created_at,
    })
    await log_activity(user_id, "Account Created", "auth", "Registered on EntrepreneurAI")

    token = create_access_token(user_id, email)
    response.set_cookie(
        key="eai_session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_id, "name": user_doc["name"], "email": email, "created_at": created_at},
    }


@app.post("/api/auth/login")
async def login(payload: LoginRequest, response: Response):
    db = get_db()
    email = payload.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    token = create_access_token(user["id"], user["email"])
    response.set_cookie(
        key="eai_session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,
    )
    await log_activity(user["id"], "Signed In", "auth", "Logged into EntrepreneurAI workspace")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "created_at": user.get("created_at"),
        },
    }


@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("eai_session")
    return {"status": "logged_out"}


@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    db = get_db()
    profile = await db.profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return {"user": current_user, "profile_completion": compute_profile_completion(profile)}


@app.put("/api/auth/settings")
async def update_settings(payload: SettingsUpdateRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"id": current_user["id"]})
    updates: dict = {}
    if payload.name:
        updates["name"] = payload.name.strip()
    if payload.new_password:
        if not payload.current_password or not verify_password(payload.current_password, user["password_hash"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
        updates["password_hash"] = hash_password(payload.new_password)
    if updates:
        await db.users.update_one({"id": current_user["id"]}, {"$set": updates})
        await log_activity(current_user["id"], "Account Updated", "settings", "Updated account settings")
    updated = await db.users.find_one({"id": current_user["id"]})
    return {"user": {"id": updated["id"], "name": updated["name"], "email": updated["email"]}}


@app.delete("/api/auth/account")
async def delete_account(response: Response, current_user: dict = Depends(get_current_user)):
    db = get_db()
    uid = current_user["id"]
    for col in ["users", "profiles", "recommendations", "market_analyses", "financial_analyses", "business_plans", "roadmaps", "chat_history", "activities"]:
        key = "id" if col == "users" else "user_id"
        await db[col].delete_many({key: uid})
    response.delete_cookie("eai_session")
    return {"status": "deleted"}


@app.get("/api/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    db = get_db()
    profile = await db.profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not profile:
        profile = {
            "user_id": current_user["id"],
            "full_name": current_user["name"],
            "education": "",
            "technical_skills": [],
            "business_skills": [],
            "interests": [],
            "investment_budget": 0,
            "currency": "INR",
            "location": "",
            "business_experience": "",
            "risk_preference": "Moderate",
        }
    return {"profile": profile, "completion_percentage": compute_profile_completion(profile)}


@app.put("/api/profile")
async def update_profile(payload: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    doc = {
        "user_id": current_user["id"],
        **payload.model_dump(),
        "updated_at": now_iso(),
    }
    await db.profiles.update_one({"user_id": current_user["id"]}, {"$set": doc}, upsert=True)
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"name": payload.full_name.strip()}})
    await log_activity(current_user["id"], "Profile Updated", "profile", f"Updated founder profile ({payload.location})")
    return {"profile": doc, "completion_percentage": compute_profile_completion(doc)}


@app.get("/api/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    db = get_db()
    uid = current_user["id"]
    profile = await db.profiles.find_one({"user_id": uid}, {"_id": 0})
    recs = await db.recommendations.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(100)
    plans = await db.business_plans.find({"user_id": uid}, {"_id": 0}).to_list(100)
    roadmaps = await db.roadmaps.find({"user_id": uid}, {"_id": 0}).to_list(100)
    financials = await db.financial_analyses.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(5)
    activities = await db.activities.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(10)

    total_tasks = 0
    completed_tasks = 0
    for rm in roadmaps:
        for stage in rm.get("stages", []):
            for t in stage.get("tasks", []):
                total_tasks += 1
                if t.get("completed"):
                    completed_tasks += 1

    latest_financial = financials[0] if financials else None
    return {
        "user": current_user,
        "profile_completion": compute_profile_completion(profile),
        "total_recommendations": len(recs),
        "saved_ideas_count": sum(1 for r in recs if r.get("is_saved")),
        "business_plans_count": len(plans),
        "roadmap_progress": {
            "completed": completed_tasks,
            "total": total_tasks,
            "percentage": round((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0,
        },
        "recent_activities": activities,
        "financial_overview": latest_financial,
    }


@app.get("/api/recommendations")
async def list_recommendations(saved_only: bool = Query(default=False), current_user: dict = Depends(get_current_user)):
    db = get_db()
    query: dict = {"user_id": current_user["id"]}
    if saved_only:
        query["is_saved"] = True
    items = await db.recommendations.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"recommendations": items}


@app.post("/api/recommendations/generate")
async def create_recommendations(payload: GenerateRecommendationsRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    uid = current_user["id"]
    profile = await db.profiles.find_one({"user_id": uid}, {"_id": 0})
    if not profile:
        profile = {
            "user_id": uid,
            "full_name": current_user["name"],
            "education": "",
            "technical_skills": [],
            "business_skills": [],
            "interests": [],
            "investment_budget": 0,
            "currency": "INR",
            "location": "",
            "business_experience": "Student / First-time founder",
            "risk_preference": "Moderate",
            "updated_at": now_iso(),
        }

    inline_edu = (payload.education or "").strip()
    raw_skills = payload.skills
    inline_skills = (
        [s.strip() for s in raw_skills if isinstance(s, str) and s.strip()]
        if isinstance(raw_skills, list)
        else [s.strip() for s in (raw_skills or "").split(",") if s.strip()]
    )
    custom_loc = (payload.custom_location or "").strip()
    custom_budget = payload.custom_budget

    changed = False
    if inline_edu and not profile.get("education"):
        profile["education"] = inline_edu
        changed = True
    if inline_skills and not profile.get("technical_skills"):
        profile["technical_skills"] = inline_skills
        changed = True
    if custom_loc and not profile.get("location"):
        profile["location"] = custom_loc
        changed = True
    if custom_budget is not None and custom_budget > 0 and (profile.get("investment_budget") or 0) == 0:
        profile["investment_budget"] = custom_budget
        changed = True

    if changed:
        profile["updated_at"] = now_iso()
        await db.profiles.update_one({"user_id": uid}, {"$set": profile}, upsert=True)

    has_context = any([
        bool(inline_edu or profile.get("education")),
        len(inline_skills or profile.get("technical_skills") or []) > 0,
        len(profile.get("business_skills") or []) > 0,
        len(profile.get("interests") or []) > 0,
        bool(custom_loc or profile.get("location")),
        bool((payload.focus_sector or "").strip()),
        bool((payload.additional_notes or "").strip()),
    ])
    if not has_context:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide at least your education, skills, location, or target sector to generate tailored startup ideas.",
        )

    effective_profile = {
        **profile,
        "education": inline_edu or profile.get("education", ""),
        "technical_skills": inline_skills or profile.get("technical_skills", []),
    }
    ideas = ai_service.generate_startup_recommendations(effective_profile, payload.model_dump())
    batch_id = str(uuid4())
    timestamp = now_iso()
    docs = []
    for idea in ideas:
        doc = {
            "id": str(uuid4()),
            "batch_id": batch_id,
            "user_id": uid,
            **idea,
            "is_saved": False,
            "created_at": timestamp,
        }
        docs.append(doc)
    await db.recommendations.insert_many([{**d} for d in docs])
    await log_activity(uid, "Generated Startup Ideas", "recommendations", f"Generated {len(docs)} AI startup recommendations")
    return {
        "recommendations": docs,
        "profile": profile,
        "completion_percentage": compute_profile_completion(profile),
    }


@app.patch("/api/recommendations/{rec_id}/save")
async def toggle_save_recommendation(rec_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    item = await db.recommendations.find_one({"id": rec_id, "user_id": current_user["id"]}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Startup recommendation not found.")
    new_saved = not bool(item.get("is_saved"))
    await db.recommendations.update_one(
        {"id": rec_id, "user_id": current_user["id"]},
        {"$set": {"is_saved": new_saved}},
    )
    await log_activity(
        current_user["id"],
        "Saved Startup Idea" if new_saved else "Removed Saved Idea",
        "recommendations",
        item["business_name"],
    )
    item["is_saved"] = new_saved
    return {"recommendation": item}


@app.delete("/api/recommendations/{rec_id}")
async def delete_recommendation(rec_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    res = await db.recommendations.delete_one({"id": rec_id, "user_id": current_user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Startup recommendation not found.")
    return {"status": "deleted"}


@app.get("/api/market-analysis")
async def list_market_analyses(current_user: dict = Depends(get_current_user)):
    db = get_db()
    items = await db.market_analyses.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"analyses": items}


@app.post("/api/market-analysis/generate")
async def create_market_analysis(payload: MarketAnalysisRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    profile = await db.profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    result = ai_service.generate_market_analysis(payload.topic, payload.industry, payload.location, profile)
    doc = {
        "id": str(uuid4()),
        "user_id": current_user["id"],
        "startup_id": payload.startup_id,
        "topic": payload.topic,
        "industry": payload.industry,
        "location": payload.location,
        **result,
        "created_at": now_iso(),
    }
    await db.market_analyses.insert_one({**doc})
    await log_activity(current_user["id"], "Market Analysis Generated", "market", f"{payload.topic} ({payload.location})")
    return {"analysis": doc}


@app.get("/api/financial-analysis")
async def list_financial_analyses(current_user: dict = Depends(get_current_user)):
    db = get_db()
    items = await db.financial_analyses.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"scenarios": items}


@app.post("/api/financial-analysis/calculate")
async def calculate_financials(payload: FinancialCalculateRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    months = payload.projection_months
    growth = payload.monthly_growth_rate / 100.0
    series = []
    cumulative_cashflow = -payload.initial_investment
    break_even_month = None
    total_revenue = 0.0
    total_expenses = 0.0

    for m in range(1, months + 1):
        rev = payload.expected_monthly_revenue * ((1 + growth) ** (m - 1))
        exp = payload.monthly_expenses
        net = rev - exp
        cumulative_cashflow += net
        total_revenue += rev
        total_expenses += exp
        if break_even_month is None and cumulative_cashflow >= 0:
            break_even_month = m
        series.append({
            "month": m,
            "label": f"M{m}",
            "revenue": round(rev, 2),
            "expenses": round(exp, 2),
            "net_profit": round(net, 2),
            "cumulative_cashflow": round(cumulative_cashflow, 2),
        })

    monthly_net_month1 = payload.expected_monthly_revenue - payload.monthly_expenses
    total_net_profit = total_revenue - total_expenses
    roi_percent = round(((total_net_profit - payload.initial_investment) / payload.initial_investment) * 100, 2) if payload.initial_investment > 0 else 0.0

    scenario = {
        "id": str(uuid4()),
        "user_id": current_user["id"],
        "startup_id": payload.startup_id,
        "title": payload.title,
        "is_estimate": True,
        "assumptions": {
            "initial_investment": payload.initial_investment,
            "monthly_expenses": payload.monthly_expenses,
            "expected_monthly_revenue": payload.expected_monthly_revenue,
            "monthly_growth_rate": payload.monthly_growth_rate,
            "projection_months": months,
        },
        "metrics": {
            "estimated_monthly_profit_m1": round(monthly_net_month1, 2),
            "estimated_total_revenue": round(total_revenue, 2),
            "estimated_total_expenses": round(total_expenses, 2),
            "estimated_net_profit": round(total_net_profit, 2),
            "break_even_month": break_even_month,
            "estimated_roi_percent": roi_percent,
        },
        "series": series,
        "created_at": now_iso(),
    }

    if payload.save:
        await db.financial_analyses.insert_one({**scenario})
        await log_activity(current_user["id"], "Financial Estimate Saved", "financial", payload.title)

    return {"scenario": scenario}


@app.delete("/api/financial-analysis/{scenario_id}")
async def delete_financial_analysis(scenario_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    res = await db.financial_analyses.delete_one({"id": scenario_id, "user_id": current_user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Financial scenario not found.")
    return {"status": "deleted"}


@app.get("/api/business-plans")
async def list_business_plans(current_user: dict = Depends(get_current_user)):
    db = get_db()
    items = await db.business_plans.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"plans": items}


@app.post("/api/business-plans/generate")
async def create_business_plan(payload: BusinessPlanRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    uid = current_user["id"]
    profile = await db.profiles.find_one({"user_id": uid}, {"_id": 0}) or {}
    startup = None
    if payload.startup_id:
        startup = await db.recommendations.find_one({"id": payload.startup_id, "user_id": uid}, {"_id": 0})
    sections = ai_service.generate_business_plan(
        payload.business_name,
        payload.industry,
        profile,
        startup,
        payload.custom_notes,
    )
    doc = {
        "id": str(uuid4()),
        "user_id": uid,
        "startup_id": payload.startup_id,
        "business_name": payload.business_name,
        "industry": payload.industry,
        "sections": sections,
        "created_at": now_iso(),
    }
    await db.business_plans.insert_one({**doc})
    await log_activity(uid, "Business Plan Created", "plans", payload.business_name)
    return {"plan": doc}


@app.delete("/api/business-plans/{plan_id}")
async def delete_business_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    res = await db.business_plans.delete_one({"id": plan_id, "user_id": current_user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business plan not found.")
    return {"status": "deleted"}


@app.get("/api/roadmaps")
async def list_roadmaps(current_user: dict = Depends(get_current_user)):
    db = get_db()
    items = await db.roadmaps.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"roadmaps": items}


@app.post("/api/roadmaps/generate")
async def create_roadmap(payload: RoadmapRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    uid = current_user["id"]
    profile = await db.profiles.find_one({"user_id": uid}, {"_id": 0}) or {}
    startup = None
    if payload.startup_id:
        startup = await db.recommendations.find_one({"id": payload.startup_id, "user_id": uid}, {"_id": 0})
    raw_stages = ai_service.generate_startup_roadmap(payload.business_name, payload.industry, profile, startup)
    stages = []
    for stage in raw_stages:
        tasks = []
        for task in stage.get("tasks", []):
            tasks.append({
                "id": str(uuid4()),
                "title": task["title"],
                "description": task["description"],
                "estimated_timeline": task["estimated_timeline"],
                "completed": False,
            })
        stages.append({
            "phase": stage["phase"],
            "summary": stage["summary"],
            "tasks": tasks,
        })
    doc = {
        "id": str(uuid4()),
        "user_id": uid,
        "startup_id": payload.startup_id,
        "business_name": payload.business_name,
        "industry": payload.industry,
        "stages": stages,
        "created_at": now_iso(),
    }
    await db.roadmaps.insert_one({**doc})
    await log_activity(uid, "Startup Roadmap Generated", "roadmap", payload.business_name)
    return {"roadmap": doc}


@app.patch("/api/roadmaps/{roadmap_id}/tasks/{task_id}")
async def toggle_roadmap_task(roadmap_id: str, task_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    roadmap = await db.roadmaps.find_one({"id": roadmap_id, "user_id": current_user["id"]}, {"_id": 0})
    if not roadmap:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap not found.")

    found = False
    toggled_title = ""
    toggled_state = False
    for stage in roadmap.get("stages", []):
        for task in stage.get("tasks", []):
            if task["id"] == task_id:
                task["completed"] = not bool(task.get("completed"))
                found = True
                toggled_title = task["title"]
                toggled_state = task["completed"]
                break
        if found:
            break

    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    await db.roadmaps.update_one(
        {"id": roadmap_id, "user_id": current_user["id"]},
        {"$set": {"stages": roadmap["stages"]}},
    )
    if toggled_state:
        await log_activity(current_user["id"], "Completed Roadmap Task", "roadmap", toggled_title)
    return {"roadmap": roadmap}


@app.delete("/api/roadmaps/{roadmap_id}")
async def delete_roadmap(roadmap_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    res = await db.roadmaps.delete_one({"id": roadmap_id, "user_id": current_user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap not found.")
    return {"status": "deleted"}


@app.get("/api/chat/history")
async def get_chat_history(current_user: dict = Depends(get_current_user)):
    db = get_db()
    messages = await db.chat_history.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return {"messages": messages}


@app.post("/api/chat/message")
async def send_chat_message(payload: ChatMessageRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    uid = current_user["id"]
    profile = await db.profiles.find_one({"user_id": uid}, {"_id": 0})
    selected_startup = None
    if payload.startup_id:
        selected_startup = await db.recommendations.find_one({"id": payload.startup_id, "user_id": uid}, {"_id": 0})
    history = await db.chat_history.find({"user_id": uid}, {"_id": 0}).sort("created_at", 1).to_list(20)

    reply = ai_service.generate_venturebot_reply(payload.message, profile, selected_startup, history)

    user_msg = {
        "id": str(uuid4()),
        "user_id": uid,
        "startup_id": payload.startup_id,
        "role": "user",
        "content": payload.message,
        "created_at": now_iso(),
    }
    assistant_msg = {
        "id": str(uuid4()),
        "user_id": uid,
        "startup_id": payload.startup_id,
        "role": "assistant",
        "content": reply,
        "created_at": now_iso(),
    }
    await db.chat_history.insert_many([{**user_msg}, {**assistant_msg}])
    await log_activity(uid, "Consulted VentureBot", "chat", payload.message[:80])
    return {"reply": reply, "user_message": user_msg, "assistant_message": assistant_msg}


@app.delete("/api/chat/history")
async def clear_chat_history(current_user: dict = Depends(get_current_user)):
    db = get_db()
    await db.chat_history.delete_many({"user_id": current_user["id"]})
    return {"status": "cleared"}


@app.get("/api/schemes")
async def list_schemes(category: str | None = None, q: str | None = None):
    results = VERIFIED_GOVERNMENT_SCHEMES
    if category and category != "All":
        results = [s for s in results if s["category"].lower() == category.lower()]
    if q:
        needle = q.strip().lower()
        results = [
            s for s in results
            if needle in s["name"].lower()
            or needle in s["ministry"].lower()
            or any(needle in b.lower() for b in s["benefits"])
        ]
    return {"schemes": results}
