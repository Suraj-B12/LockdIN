"""AI session scoring via OpenRouter (free-tier models) with a deterministic
algorithm fallback.

Design goals (free-tier-ready + fault-tolerant):
  • Never raise to the caller — always return a usable score dict.
  • Try the 3 configured OpenRouter models in order; on any error / 429 /
    unparseable response, fall through to the next one.
  • If all 3 LLMs fail (or no API key), fall back to the local algorithm.
  • Always attach the algorithm "breakdown" (duration / work-log / specificity
    points) for legibility, even when the LLM produced the score+summary.
"""

import json
import re
import httpx
from config import get_settings

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Sent so OpenRouter can attribute traffic (recommended by their docs).
_REFERER = "https://lockdin.app"
_TITLE = "LockdIN"

# Per-request timeout. Free-tier models can be slow on cold start, so give them
# room — the call is non-blocking from the API's perspective anyway.
_TIMEOUT_SECONDS = 20.0


async def score_session(duration_minutes: int, work_log: str) -> dict:
    """Score a study session.

    Returns: {
        "score": int,            # 0-100
        "summary": str,          # one-sentence summary
        "model_used": str,       # which model/path produced the score
        "breakdown": dict,       # algorithm factor breakdown (always present)
    }
    """
    # Compute the algorithm result up front. We always reuse its "breakdown"
    # for legibility, and it's our final fallback if every LLM call fails.
    algo = _score_with_algorithm(duration_minutes, work_log)
    breakdown = algo["breakdown"]

    settings = get_settings()
    api_key = settings.openrouter_api_key

    if not api_key:
        # No key configured — algorithm is the only path.
        return algo

    models = [
        settings.openrouter_model,
        settings.openrouter_fallback_model,
        settings.openrouter_fallback_model_2,
    ]

    prompt = _build_prompt(duration_minutes, work_log)
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": _REFERER,
        "X-Title": _TITLE,
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
        for model in models:
            try:
                parsed = await _call_openrouter(client, headers, model, prompt)
                if parsed is None:
                    continue  # unparseable — try next model

                return {
                    "score": _clamp_score(parsed.get("score")),
                    "summary": str(parsed.get("summary") or "Session completed.").strip(),
                    "model_used": model,
                    "breakdown": breakdown,
                }
            except Exception:
                # Network error, 429, bad status, JSON error — fall through.
                continue

    # Every model failed — return the deterministic algorithm result.
    return algo


def _build_prompt(duration_minutes: int, work_log: str) -> str:
    """Build the scoring prompt sent to the LLM."""
    return f"""You are a productivity scoring assistant. Score this study session.

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


async def _call_openrouter(
    client: httpx.AsyncClient,
    headers: dict,
    model: str,
    prompt: str,
) -> dict | None:
    """POST to OpenRouter and parse the model's JSON reply.

    Returns the parsed dict (containing at least "score"), or None if the reply
    could not be parsed. Raises on HTTP/network errors so the caller can fall
    through to the next model.
    """
    response = await client.post(
        OPENROUTER_URL,
        headers=headers,
        json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 200,
            "temperature": 0.2,
        },
    )
    response.raise_for_status()
    body = response.json()

    # Standard OpenAI-compatible response shape.
    content = body["choices"][0]["message"]["content"]
    return _parse_score_json(content)


def _parse_score_json(content: str) -> dict | None:
    """Defensively extract a {"score", "summary"} object from an LLM reply.

    Handles markdown code fences (```json ... ```), surrounding prose, and
    requires a numeric "score" to consider the parse successful.
    """
    if not content:
        return None

    text = content.strip()

    # Strip ```json ... ``` or ``` ... ``` fences.
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL | re.IGNORECASE)
    if fence:
        text = fence.group(1).strip()

    # Try a direct parse first, then fall back to extracting the first {...}.
    candidates = [text]
    brace_match = re.search(r"\{.*\}", text, re.DOTALL)
    if brace_match:
        candidates.append(brace_match.group(0))

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except (json.JSONDecodeError, ValueError):
            continue
        if isinstance(parsed, dict) and "score" in parsed:
            return parsed

    return None


def _clamp_score(raw) -> int:
    """Coerce a model-supplied score to an int in [0, 100]."""
    try:
        value = int(float(raw))
    except (TypeError, ValueError):
        value = 0
    return max(0, min(100, value))


def _score_with_algorithm(duration_minutes: int, work_log: str) -> dict:
    """Deterministic fallback scoring (no network).

    Also used to compute the "breakdown" attached to every result. The three
    factors are duration, work-log quality (word count), and specificity
    (keyword hits).
    """
    work_log = work_log or ""

    # Duration scoring (0-40 points)
    if duration_minutes >= 120:
        duration_points = 40
    elif duration_minutes >= 60:
        duration_points = 30
    elif duration_minutes >= 30:
        duration_points = 20
    elif duration_minutes >= 15:
        duration_points = 10
    else:
        duration_points = 5

    # Work log quality (0-40 points)
    words = len(work_log.split())
    if words >= 30:
        worklog_points = 40
    elif words >= 15:
        worklog_points = 30
    elif words >= 8:
        worklog_points = 20
    elif words >= 3:
        worklog_points = 10
    else:
        worklog_points = 5

    # Specificity bonus (0-20 points) — keywords suggest real, concrete work.
    specificity_keywords = [
        "chapter", "problem", "solved", "built", "wrote", "read",
        "reviewed", "practiced", "completed", "finished", "learned",
        "coded", "debugged", "implemented", "studied", "notes",
    ]
    keyword_hits = sum(1 for kw in specificity_keywords if kw in work_log.lower())
    specificity_points = min(20, keyword_hits * 5)

    score = min(100, duration_points + worklog_points + specificity_points)

    summary = f"Worked for {duration_minutes} minutes."
    if words >= 8:
        # Use the first sentence as a concise summary.
        summary = work_log.split(".")[0].strip() + "."

    breakdown = {
        "duration_points": duration_points,
        "worklog_points": worklog_points,
        "specificity_points": specificity_points,
        "word_count": words,
        "keyword_hits": keyword_hits,
    }

    return {
        "score": score,
        "summary": summary,
        "model_used": "algorithm-fallback",
        "breakdown": breakdown,
    }


async def check_ai_health() -> bool:
    """Report whether AI scoring is configured.

    Intentionally does NOT make a network call — health checks run frequently
    and free-tier models are rate-limited. We only verify the API key is set.
    """
    return bool(get_settings().openrouter_api_key)
