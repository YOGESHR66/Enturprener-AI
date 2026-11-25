import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://mongo:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "entrepreneur_ai")

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGODB_URI)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    return get_client()[MONGODB_DB_NAME]


async def ensure_indexes() -> None:
    db = get_db()
    await db.users.create_index("email", unique=True)
    await db.profiles.create_index("user_id", unique=True)
    await db.recommendations.create_index([("user_id", 1), ("created_at", -1)])
    await db.market_analyses.create_index([("user_id", 1), ("created_at", -1)])
    await db.financial_analyses.create_index([("user_id", 1), ("created_at", -1)])
    await db.business_plans.create_index([("user_id", 1), ("created_at", -1)])
    await db.roadmaps.create_index([("user_id", 1), ("created_at", -1)])
    await db.chat_history.create_index([("user_id", 1), ("created_at", 1)])
    await db.activities.create_index([("user_id", 1), ("created_at", -1)])


async def close_db() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
