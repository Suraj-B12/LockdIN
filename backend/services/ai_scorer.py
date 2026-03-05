"""AI scoring via Ollama (local) with fallback algorithm."""

import json
import httpx
from config import get_settings


async def score_session(duration_minutes: int, work_log: str) -> dict:
    """
    Score a study session using Ollama (local LLM).
    Falls back to algorithm-based scoring if Ollama is unavailable.
    
    Returns: {"score": int, "summary": str, "model_used": str}
    """
    try:
        return await _score_with_ollama(duration_minutes, work_log)
    except Exception:
        return _score_with_algorithm(duration_minutes, work_log)


async def _score_with_ollama(duration_minutes: int, work_log: str) -> dict:
    """Use local Ollama to score the session."""
    settings = get_settings()

    prompt = f"""You are a productivity scoring assistant. Score this study session.

Session duration: {duration_minutes} minutes
Work log: "{work_log}"

Rules:
- Score from 0 to 100
- Consider: session length, specificity of work described, quality indicators
- Short sessions (<15 min) cap at 40 unless very productive
- Vague logs like "studied" score lower than specific logs like "Solved 5 LeetCode problems on trees"
- Longer focused sessions (2+ hours) with specific work score highest

Return ONLY valid JSON, nothing else:
{{"score": <integer 0-100>, "summary": "<one sentence summary of what was accomplished>"}}"""

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{settings.ollama_url}/api/generate",
            json={
                "model": "mistral",
                "prompt": prompt,
                "stream": False,
                "format": "json"
            }
        )
        response.raise_for_status()
        result = response.json()
        parsed = json.loads(result["response"])

        return {
            "score": max(0, min(100, int(parsed["score"]))),
            "summary": str(parsed.get("summary", "Session completed.")),
            "model_used": "mistral"
        }


def _score_with_algorithm(duration_minutes: int, work_log: str) -> dict:
    """Fallback scoring when Ollama is unavailable."""
    score = 0

    # Duration scoring (0-40 points)
    if duration_minutes >= 120:
        score += 40
    elif duration_minutes >= 60:
        score += 30
    elif duration_minutes >= 30:
        score += 20
    elif duration_minutes >= 15:
        score += 10
    else:
        score += 5

    # Work log quality (0-40 points)
    words = len(work_log.split())
    if words >= 30:
        score += 40
    elif words >= 15:
        score += 30
    elif words >= 8:
        score += 20
    elif words >= 3:
        score += 10
    else:
        score += 5

    # Specificity bonus (0-20 points) — keywords suggest real work
    specificity_keywords = [
        "chapter", "problem", "solved", "built", "wrote", "read",
        "reviewed", "practiced", "completed", "finished", "learned",
        "coded", "debugged", "implemented", "studied", "notes"
    ]
    keyword_hits = sum(1 for kw in specificity_keywords if kw in work_log.lower())
    score += min(20, keyword_hits * 5)

    score = min(100, score)

    summary = f"Worked for {duration_minutes} minutes."
    if words >= 8:
        # Use first sentence as summary
        summary = work_log.split(".")[0].strip() + "."

    return {
        "score": score,
        "summary": summary,
        "model_used": "algorithm-fallback"
    }


async def check_ollama_health() -> bool:
    """Check if Ollama is reachable."""
    try:
        settings = get_settings()
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.ollama_url}/api/tags")
            return response.status_code == 200
    except Exception:
        return False
