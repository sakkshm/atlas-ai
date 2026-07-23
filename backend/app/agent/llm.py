import asyncio

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.prompts import get_system_prompt
from app.agent.tools import tools
from app.core.config import settings

_llm: ChatGoogleGenerativeAI | None = None
_model_with_tools: ChatGoogleGenerativeAI | None = None


def _get_llm() -> ChatGoogleGenerativeAI:
    global _llm
    if _llm is None:
        _llm = ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            request_timeout=30,
        )
    return _llm


def get_model_with_tools() -> ChatGoogleGenerativeAI:
    global _model_with_tools
    if _model_with_tools is None:
        _model_with_tools = _get_llm().bind_tools(tools)
    return _model_with_tools


async def chat(messages: list[dict], user_timezone: str = "UTC") -> str:
    langchain_messages = [SystemMessage(content=get_system_prompt(user_timezone))]
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
