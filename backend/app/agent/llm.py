import asyncio

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import settings

_llm: ChatGoogleGenerativeAI | None = None


def _get_llm() -> ChatGoogleGenerativeAI:
    global _llm
    if _llm is None:
        _llm = ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            request_timeout=30,
        )
    return _llm


SYSTEM_PROMPT = (
    "You are Atlas AI, a voice-enabled personal assistant. "
    "You help users manage their Google Workspace — calendar, tasks, email, contacts, and maps. "
    "Respond concisely and naturally, as if speaking aloud. "
    "Keep answers under 3 sentences unless the user asks for detail."
)


async def chat(messages: list[dict]) -> str:
    langchain_messages = [SystemMessage(content=SYSTEM_PROMPT)]
    for msg in messages:
        if msg["role"] == "user":
            langchain_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            langchain_messages.append(
                SystemMessage(content=f"Assistant: {msg['content']}")
            )
    llm = _get_llm()
    response = await asyncio.wait_for(llm.ainvoke(langchain_messages), timeout=30)
    content = response.content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and "text" in block:
                parts.append(block["text"])
            elif isinstance(block, str):
                parts.append(block)
        return " ".join(parts)
    return str(content)
