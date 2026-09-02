"""
llm.py

One chat interface over three providers, selected by configuration.

    LLM_PROVIDER=ollama   local llama3.1:8b, the development default
    LLM_PROVIDER=claude   Anthropic Claude Sonnet
    LLM_PROVIDER=groq     Groq

Two properties this module exists to guarantee:

1. Every answer says which provider produced it. `LLMResponse.provider` is set
   from the call that actually returned text, never from configuration. A
   caller cannot render an answer without knowing its source.

2. A degraded answer can never be presented as a primary one. Fallback is off
   unless LLM_FALLBACK_PROVIDER is set. When it is used, `degraded` is True and
   `primary_error` carries the reason the configured provider failed. Callers
   are expected to surface both.

Failures raise LLMError. Nothing here returns a plausible string in place of an
answer, and no provider silently substitutes for another.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field, asdict

import httpx

OLLAMA = "ollama"
CLAUDE = "claude"
GROQ = "groq"
PROVIDERS = (OLLAMA, CLAUDE, GROQ)

DEFAULT_PROVIDER = OLLAMA
DEFAULT_TIMEOUT = 120.0


class LLMError(RuntimeError):
    """A provider failed. Carries the provider so the caller can report it."""

    def __init__(self, provider: str, message: str):
        super().__init__(f"[{provider}] {message}")
        self.provider = provider
        self.message = message


@dataclass
class LLMResponse:
    text: str
    provider: str          # the provider that actually answered
    model: str             # the model that actually answered
    degraded: bool = False  # True when this came from the fallback, not the configured provider
    primary_error: str | None = None  # why the configured provider failed, when degraded

    def to_dict(self) -> dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# Configuration — read at call time, never frozen at import
# ---------------------------------------------------------------------------
def configured_provider() -> str:
    """The provider this deployment is set to use."""
    value = (os.getenv("LLM_PROVIDER") or DEFAULT_PROVIDER).strip().lower()
    return value if value in PROVIDERS else DEFAULT_PROVIDER


def fallback_provider() -> str | None:
    """
    Optional second provider, tried only if the configured one fails.

    Unset by default. Silent fallback is how a degraded answer gets mistaken
    for a primary one, so it must be opted into explicitly.
    """
    value = (os.getenv("LLM_FALLBACK_PROVIDER") or "").strip().lower()
    if value in PROVIDERS and value != configured_provider():
        return value
    return None


def model_for(provider: str) -> str:
    if provider == OLLAMA:
        return os.getenv("OLLAMA_MODEL", "llama3.1:8b")
    if provider == CLAUDE:
        return os.getenv("CLAUDE_MODEL", "claude-sonnet-5")
    if provider == GROQ:
        return os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    return "unknown"


def _missing_settings(provider: str) -> list[str]:
    if provider == CLAUDE and not os.getenv("ANTHROPIC_API_KEY"):
        return ["ANTHROPIC_API_KEY"]
    if provider == GROQ and not os.getenv("GROQ_API_KEY"):
        return ["GROQ_API_KEY"]
    return []  # Ollama needs no key, only a reachable daemon


def provider_status() -> dict:
    """
    What /api/health reports. Describes configuration only — it does not call
    any provider, so `configured` never implies `reachable`.
    """
    provider = configured_provider()
    missing = _missing_settings(provider)
    fallback = fallback_provider()
    return {
        "provider": provider,
        "model": model_for(provider),
        "configured": not missing,
        "missing_settings": missing,
        "fallback_provider": fallback,
        "fallback_model": model_for(fallback) if fallback else None,
        "note": "Reports configuration, not reachability. No provider is called to build this.",
    }


# ---------------------------------------------------------------------------
# Message normalisation
#
# The frontend sends history as [{role: 'user'|'model', content}]. Three things
# have to be right before any provider sees it, and each was wrong at some
# point in this codebase's history:
#   - the system prompt is a real parameter, never smuggled into a user turn
#   - 'model' maps to 'assistant'
#   - consecutive same-role turns are collapsed, and the sequence starts with
#     a user turn, because every provider here rejects or mishandles otherwise
# ---------------------------------------------------------------------------
def normalise_messages(history: list, user_input: str) -> list[dict]:
    turns: list[dict] = []

    for entry in history or []:
        if not isinstance(entry, dict):
            continue
        content = (entry.get("content") or "").strip()
        if not content:
            continue
        raw_role = (entry.get("role") or "user").strip().lower()
        role = "assistant" if raw_role in ("model", "assistant") else "user"
        turns.append({"role": role, "content": content})

    if (user_input or "").strip():
        turns.append({"role": "user", "content": user_input.strip()})

    # Drop any leading assistant turns — the conversation must open with a user.
    while turns and turns[0]["role"] == "assistant":
        turns.pop(0)

    # Collapse consecutive same-role turns into one.
    collapsed: list[dict] = []
    for turn in turns:
        if collapsed and collapsed[-1]["role"] == turn["role"]:
            collapsed[-1]["content"] += "\n\n" + turn["content"]
        else:
            collapsed.append(dict(turn))

    return collapsed


# ---------------------------------------------------------------------------
# Providers
# ---------------------------------------------------------------------------
async def _complete_ollama(system: str, messages: list[dict]) -> LLMResponse:
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    model = model_for(OLLAMA)

    payload = {
        "model": model,
        "messages": ([{"role": "system", "content": system}] if system else []) + messages,
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            response = await client.post(f"{base_url}/api/chat", json=payload)
    except Exception as exc:
        raise LLMError(OLLAMA, f"could not reach Ollama at {base_url}: {exc}") from exc

    if response.status_code != 200:
        raise LLMError(OLLAMA, f"HTTP {response.status_code}: {response.text[:400]}")

    text = ((response.json().get("message") or {}).get("content") or "").strip()
    if not text:
        raise LLMError(OLLAMA, "returned an empty message")

    return LLMResponse(text=text, provider=OLLAMA, model=model)


async def _complete_claude(system: str, messages: list[dict]) -> LLMResponse:
    """
    UNVERIFIED: this path has not been run against the Anthropic API. It is
    written from the current SDK documentation but no request has been made
    with a real key. Treat it as untested until it is.

    Note: Sonnet 5 rejects `temperature`, `top_p`, `top_k` and `budget_tokens`
    with a 400, so none are sent. The system prompt is passed as the `system`
    parameter, not as a message.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise LLMError(CLAUDE, "ANTHROPIC_API_KEY is not set")

    try:
        import anthropic
    except ImportError as exc:
        raise LLMError(CLAUDE, "the 'anthropic' package is not installed") from exc

    model = model_for(CLAUDE)
    max_tokens = int(os.getenv("CLAUDE_MAX_TOKENS", "4096"))

    client = anthropic.AsyncAnthropic(api_key=api_key)
    kwargs = {"model": model, "max_tokens": max_tokens, "messages": messages}
    if system:
        kwargs["system"] = system

    try:
        response = await client.messages.create(**kwargs)
    except anthropic.AuthenticationError as exc:
        raise LLMError(CLAUDE, f"authentication failed: {exc}") from exc
    except anthropic.NotFoundError as exc:
        raise LLMError(CLAUDE, f"unknown model {model!r}: {exc}") from exc
    except anthropic.RateLimitError as exc:
        raise LLMError(CLAUDE, f"rate limited: {exc}") from exc
    except anthropic.BadRequestError as exc:
        raise LLMError(CLAUDE, f"bad request: {exc}") from exc
    except anthropic.APIStatusError as exc:
        raise LLMError(CLAUDE, f"API error {exc.status_code}: {exc}") from exc
    except anthropic.APIConnectionError as exc:
        raise LLMError(CLAUDE, f"connection error: {exc}") from exc

    if getattr(response, "stop_reason", None) == "refusal":
        raise LLMError(CLAUDE, "the model declined to answer this request")

    text = "".join(
        block.text for block in response.content if getattr(block, "type", None) == "text"
    ).strip()
    if not text:
        raise LLMError(CLAUDE, "returned no text content")

    return LLMResponse(text=text, provider=CLAUDE, model=model)


async def _complete_groq(system: str, messages: list[dict]) -> LLMResponse:
    """
    UNVERIFIED: written against Groq's OpenAI-compatible chat completions
    endpoint but not run. Uses httpx rather than the groq SDK so the backend
    gains no new dependency.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise LLMError(GROQ, "GROQ_API_KEY is not set")

    base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
    model = model_for(GROQ)

    payload = {
        "model": model,
        "messages": ([{"role": "system", "content": system}] if system else []) + messages,
    }

    try:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {api_key}"},
            )
    except Exception as exc:
        raise LLMError(GROQ, f"could not reach Groq: {exc}") from exc

    if response.status_code != 200:
        # The body can echo the key back in some error shapes; keep it short
        # and never log the Authorization header.
        raise LLMError(GROQ, f"HTTP {response.status_code}: {response.text[:400]}")

    choices = response.json().get("choices") or []
    text = ((choices[0].get("message") or {}).get("content") or "").strip() if choices else ""
    if not text:
        raise LLMError(GROQ, "returned an empty message")

    return LLMResponse(text=text, provider=GROQ, model=model)


_DISPATCH = {OLLAMA: _complete_ollama, CLAUDE: _complete_claude, GROQ: _complete_groq}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
async def complete(system: str, history: list, user_input: str) -> LLMResponse:
    """
    Answer using the configured provider.

    Raises LLMError if it fails and no fallback is configured. If a fallback is
    configured and used, the returned response has degraded=True and
    primary_error set — callers must surface both rather than rendering the
    text as though it came from the primary.
    """
    messages = normalise_messages(history, user_input)
    if not messages:
        raise LLMError(configured_provider(), "no user input to answer")

    primary = configured_provider()
    try:
        return await _DISPATCH[primary](system, messages)
    except LLMError as primary_error:
        fallback = fallback_provider()
        if not fallback:
            raise

        try:
            response = await _DISPATCH[fallback](system, messages)
        except LLMError as fallback_error:
            raise LLMError(
                primary,
                f"{primary_error.message}; fallback {fallback} also failed: "
                f"{fallback_error.message}",
            ) from fallback_error

        response.degraded = True
        response.primary_error = str(primary_error)
        return response
