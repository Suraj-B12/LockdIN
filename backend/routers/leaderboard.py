"""Leaderboard endpoints — daily, weekly, all-time rankings."""

from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user
from services.supabase_client import get_supabase
from services.cache import cache_get, cache_set
from models.schemas import LeaderboardResponse, GlobalLeaderboardResponse
from datetime import date, timedelta

router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])


def _period_query(db, period: str, today: date, user_ids: list[str] | None):
    """Build the streaks query for a period. If user_ids is given, scope to them
    (friends board); otherwise scan everyone (global board)."""
    sel = db.table("streaks").select("user_id, daily_score, daily_seconds")
    if user_ids is not None:
        sel = sel.in_("user_id", user_ids)
    if period == "daily":
        sel = sel.eq("streak_date", today.isoformat())
    elif period == "weekly":
        week_start = (today - timedelta(days=today.weekday())).isoformat()
        sel = sel.gte("streak_date", week_start)
    return sel


@router.get("/global/{period}", response_model=GlobalLeaderboardResponse)
async def get_global_leaderboard(period: str, user: dict = Depends(get_current_user)):
    """Global leaderboard across ALL users (not just friends), with each entry's
    relationship to the viewer so the client can offer "Add friend". Top 50."""
    if period not in ("daily", "weekly", "alltime"):
        raise HTTPException(status_code=400, detail="Period must be: daily, weekly, or alltime")

    today = date.today()
    cache_key = f"lbglobal:{period}:{user['id']}:{today.isoformat()}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    db = get_supabase()

    # Aggregate scores across everyone for the period (explicit row cap).
    rows = _period_query(db, period, today, None).range(0, 4999).execute()
    totals: dict[str, dict] = {}
    for r in rows.data or []:
        t = totals.setdefault(r["user_id"], {"total_score": 0, "total_seconds": 0})
        t["total_score"] += r["daily_score"]
        t["total_seconds"] += r["daily_seconds"]

    ranked = sorted(totals.items(), key=lambda kv: kv[1]["total_score"], reverse=True)

    # Viewer's rank within the FULL ranked list (even if outside the top 50).
    your_rank = next((i + 1 for i, (uid, _) in enumerate(ranked) if uid == user["id"]), None)

    top = ranked[:50]
    top_ids = [uid for uid, _ in top]

    # Profiles for the shown rows.
    profile_map = {}
    if top_ids:
        profs = db.table("profiles").select("id, display_name, avatar_url").in_("id", top_ids).execute()
        profile_map = {p["id"]: p for p in (profs.data or [])}

    # The viewer's relationship to each shown user (any-status friendships).
    status_map: dict[str, str] = {}
    fr = db.table("friendships") \
        .select("user_id, friend_id, status") \
        .or_(f"user_id.eq.{user['id']},friend_id.eq.{user['id']}") \
        .execute()
    for row in fr.data or []:
        other = row["friend_id"] if row["user_id"] == user["id"] else row["user_id"]
        st = row["status"]
        if st == "accepted":
            status_map[other] = "friends"
        elif st == "blocked":
            status_map[other] = "blocked"
        elif st == "pending":
            status_map[other] = "pending_out" if row["user_id"] == user["id"] else "pending_in"

    entries = []
    for i, (uid, sc) in enumerate(top):
        p = profile_map.get(uid, {})
        entries.append({
            "user_id": uid,
            "display_name": p.get("display_name", "Anonymous"),
            "avatar_url": p.get("avatar_url"),
            "total_score": sc["total_score"],
            "total_seconds": sc["total_seconds"],
            "rank": i + 1,
            "friend_status": "self" if uid == user["id"] else status_map.get(uid, "none"),
        })

    response = {"period": period, "entries": entries, "your_rank": your_rank}
    await cache_set(cache_key, response, ttl_seconds=180)  # 3 min
    return response


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
