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
import math
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
                    # Strip first, THEN fall back, so a whitespace-only reply
                    # doesn't collapse to an empty summary.
                    "summary": (str(parsed.get("summary") or "").strip() or "Session completed."),
                    "model_used": model,
                    "breakdown": breakdown,
                }
            except Exception:
                # Network error, 429, bad status, JSON error — fall through.
                continue

    # Every model failed — return the deterministic algorithm result.
    return algo


def _build_prompt(duration_minutes: int, work_log: str) -> str:
    """Build the scoring prompt sent to the LLM.

    Calibrated to use the FULL 0-100 range with PRECISE integers — models tend to
    lazily default to round multiples of 5/10, which makes every score feel fake.
    """
    return f"""You are a strict but fair productivity coach scoring ONE focus session from 0 to 100.

Session length: {duration_minutes} minutes
Work log: "{work_log}"

Scoring bands (use the FULL range; pick the EXACT number that fits — e.g. 12, 38, 47, 63, 81 — and do NOT default to round multiples of 5 or 10):
- 0-20  : barely any focus, or an empty / vague log ("studied", "worked on stuff")
- 21-45 : a short or unfocused session, or a thin/generic log
- 46-70 : a solid, real session described with some specifics
- 71-88 : a long, focused session with concrete, detailed work and clear output
- 89-100: exceptional depth, duration, AND specificity

Judge on three things together: (1) duration, (2) how specific/concrete the work log is, (3) signs of real output (numbers, named tasks, problems solved, things built). A short session cannot score high. A long session with a vague log should not score high either. Reward precision and honesty.

Return ONLY valid JSON — no prose, no markdown, no code fences:
{{"score": <exact integer 0-100, not rounded to a multiple of 5>, "summary": "<one concrete sentence on what was accomplished>"}}"""


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
            # A little headroom so the model commits to a precise number instead
            # of lazily snapping to a round default, while staying consistent.
            "temperature": 0.35,
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
    """Coerce a model-supplied score to an int in [0, 100].

    Non-finite values (inf/-inf, which json.loads accepts as `Infinity`) would
    raise OverflowError on int() — treat those (and NaN) as 0.
    """
    try:
        f = float(raw)
        value = int(f) if math.isfinite(f) else 0
    except (TypeError, ValueError):
        value = 0
    return max(0, min(100, value))


def _score_with_algorithm(duration_minutes: int, work_log: str) -> dict:
    """Deterministic fallback scoring (no network).

    Uses CONTINUOUS curves (smooth diminishing returns) rather than coarse
    buckets, so scores are fine-grained across the full 1-100 range (e.g. 12, 49,
    83) instead of always landing on a multiple of 5. Three weighted factors:
    duration, work-log depth (word count), and specificity (concrete-work
    signals). Also produces the "breakdown" attached to every result.
    """
    work_log = (work_log or "").strip()
    words = work_log.split()
    word_count = len(words)
    lower = work_log.lower()

    # Duration — smooth diminishing returns, 0..48. ~25 at 45 min, ~37 at 90 min.
    minutes = max(0, duration_minutes)
    duration_score = 48.0 * (1.0 - math.exp(-minutes / 60.0))

    # Depth — word count with diminishing returns, 0..38. Rewards a real log
    # without letting someone farm points by rambling.
    depth_score = 38.0 * (1.0 - math.exp(-word_count / 14.0))

    # Specificity — concrete-work signals, 0..22.
    specificity_keywords = [
        "chapter", "problem", "solved", "built", "wrote", "read",
        "reviewed", "practiced", "completed", "finished", "learned",
        "coded", "debugged", "implemented", "studied", "notes",
        "tested", "designed", "fixed", "shipped", "refactored",
    ]
    keyword_hits = sum(1 for kw in specificity_keywords if kw in lower)
    has_number = 1 if re.search(r"\d", work_log) else 0
    sentences = [s for s in re.split(r"[.!?]+", work_log) if s.strip()]
    multi_sentence = 1 if len(sentences) >= 2 else 0
    specificity_score = min(
        22.0, keyword_hits * 3.5 + has_number * 3.0 + multi_sentence * 2.0
    )

    raw = duration_score + depth_score + specificity_score
    # A completed session is always worth at least 1; cap at 100.
    score = max(1, min(100, int(round(raw))))

    summary = f"Worked for {duration_minutes} minutes."
    if word_count >= 8:
        # Use the first sentence as a concise summary.
        summary = (work_log.split(".")[0].strip() or summary).rstrip(".") + "."

    breakdown = {
        "duration_points": round(duration_score, 1),
        "worklog_points": round(depth_score, 1),
        "specificity_points": round(specificity_score, 1),
        "word_count": word_count,
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
