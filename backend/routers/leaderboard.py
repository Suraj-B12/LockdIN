"""Leaderboard endpoints — daily, weekly, all-time rankings."""

from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user
from services.supabase_client import get_supabase
from services.cache import cache_get, cache_set
from models.schemas import LeaderboardResponse, LeaderboardEntry
from datetime import date, timedelta

router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])


@router.get("/{period}", response_model=LeaderboardResponse)
async def get_leaderboard(period: str, user: dict = Depends(get_current_user)):
    """
    Get friend leaderboard for a time period.
    period: "daily", "weekly", "alltime"
    """
    if period not in ("daily", "weekly", "alltime"):
        raise HTTPException(status_code=400, detail="Period must be: daily, weekly, or alltime")

    cache_key = f"lb:{period}:{user['id']}:{date.today().isoformat()}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    db = get_supabase()

    # Get user's accepted friends
    friends_result = db.table("friendships") \
        .select("user_id, friend_id") \
        .eq("status", "accepted") \
        .or_(f"user_id.eq.{user['id']},friend_id.eq.{user['id']}") \
        .execute()

    # Collect all friend IDs + self
    friend_ids = {user["id"]}
    for row in friends_result.data:
        friend_ids.add(row["user_id"])
        friend_ids.add(row["friend_id"])

    friend_ids = list(friend_ids)

    # Build date filter
    today = date.today()
    if period == "daily":
        date_filter = today.isoformat()
        query = db.table("streaks").select("user_id, daily_score, daily_seconds") \
            .in_("user_id", friend_ids) \
            .eq("streak_date", date_filter)
    elif period == "weekly":
        week_start = (today - timedelta(days=today.weekday())).isoformat()
        query = db.table("streaks").select("user_id, daily_score, daily_seconds") \
            .in_("user_id", friend_ids) \
            .gte("streak_date", week_start)
    else:  # alltime
        query = db.table("streaks").select("user_id, daily_score, daily_seconds") \
            .in_("user_id", friend_ids)

    scores_result = query.execute()

    # Aggregate scores per user
    user_scores = {}
    for row in scores_result.data:
        uid = row["user_id"]
        if uid not in user_scores:
            user_scores[uid] = {"total_score": 0, "total_seconds": 0}
        user_scores[uid]["total_score"] += row["daily_score"]
        user_scores[uid]["total_seconds"] += row["daily_seconds"]

    # Get profile info
    profiles_result = db.table("profiles") \
        .select("id, display_name, avatar_url") \
        .in_("id", friend_ids) \
        .execute()

    profile_map = {p["id"]: p for p in profiles_result.data}

    # Build leaderboard entries sorted by score
    entries = []
    for uid, scores in user_scores.items():
        profile = profile_map.get(uid, {})
        entries.append({
            "user_id": uid,
            "display_name": profile.get("display_name", "Unknown"),
            "avatar_url": profile.get("avatar_url"),
            "total_score": scores["total_score"],
            "total_seconds": scores["total_seconds"],
            "rank": 0
        })

    entries.sort(key=lambda x: x["total_score"], reverse=True)

    # Assign ranks
    your_rank = None
    for i, entry in enumerate(entries):
        entry["rank"] = i + 1
        if entry["user_id"] == user["id"]:
            your_rank = i + 1

    response = {
        "period": period,
        "entries": entries[:20],  # Top 20
        "your_rank": your_rank
    }

    ttl = 300 if period == "daily" else 600  # 5 min for daily, 10 min for weekly/alltime
    await cache_set(cache_key, response, ttl_seconds=ttl)

    return response
