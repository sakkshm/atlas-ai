import asyncio
import json
import logging

import redis

from app.core.celery import celery_app
from app.core.config import settings

logger = logging.getLogger(__name__)

_redis = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


def _publish(channel: str, event: dict):
    _redis.xadd(channel, {"data": json.dumps(event)})


def _extract_tool_cards(result: dict) -> list[dict]:
    cards = []
    for msg in result.get("messages", []):
        if hasattr(msg, "content") and isinstance(msg.content, str):
            try:
                data = json.loads(msg.content)
                if isinstance(data, dict) and "card" in data:
                    cards.append(data["card"])
            except (json.JSONDecodeError, TypeError):
                pass
    return cards


@celery_app.task(
    bind=True,
    name="app.tasks.agent.run_agent",
    queue="agent",
    max_retries=2,
    default_retry_delay=30,
)
def run_agent_task(
    self,
    task_id: str,
    session_id: str,
    message_history: list[dict],
    user_id: str = "",
):
    channel = f"stream:{session_id}"
    logger.info("run_agent_task received user_id=%r", user_id)

    try:
        _publish(channel, {
            "type": "status",
            "message": "Thinking...",
            "task_id": task_id,
        })

        response, cards = asyncio.run(
            _execute_agent(message_history, channel, task_id, user_id)
        )

        for card in cards:
            _publish(channel, {
                "type": "tool_result",
                "card": card,
                "task_id": task_id,
            })

        _publish(channel, {
            "type": "done",
            "task_id": task_id,
            "response": response,
        })

        return {"task_id": task_id, "response": response}

    except Exception as exc:
        logger.exception("Agent task failed")
        _publish(channel, {
            "type": "error",
            "task_id": task_id,
            "message": str(exc),
        })
        raise self.retry(exc=exc)


async def _execute_agent(
    message_history: list[dict],
    channel: str,
    task_id: str,
    user_id: str = "",
) -> tuple[str, list[dict]]:
    from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
    from langgraph.graph import END, START, StateGraph
    from langgraph.prebuilt import ToolNode, tools_condition

    from app.agent.llm import get_model_with_tools
    from app.agent.prompts import SYSTEM_PROMPT
    from app.agent.state import AgentState
    from app.agent.tools import tools

    def agent_node(state: AgentState) -> dict:
        model = get_model_with_tools()
        response = model.invoke(state["messages"])
        return {"messages": [response]}

    builder = StateGraph(AgentState)
    builder.add_node("agent", agent_node)
    builder.add_node("tools", ToolNode(tools))
    builder.add_edge(START, "agent")
    builder.add_conditional_edges("agent", tools_condition, {"tools": "tools", "__end__": END})
    builder.add_edge("tools", "agent")
    graph = builder.compile()

    lc_messages = [SystemMessage(content=SYSTEM_PROMPT)]
    for msg in message_history:
        if msg["role"] == "user":
            lc_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            lc_messages.append(AIMessage(content=msg["content"]))

    initial_state = {
        "messages": lc_messages,
        "user_id": user_id,
        "tool_cards": [],
    }

    logger.info("_execute_agent starting with user_id=%r", user_id)

    final_state = None
    async for event in graph.astream_events(initial_state, version="v2"):
        kind = event.get("event", "")
        name = event.get("name", "")

        if kind == "on_tool_start":
            _publish(channel, {
                "type": "tool_start",
                "name": name,
                "task_id": task_id,
            })

        elif kind == "on_tool_end":
            _publish(channel, {
                "type": "tool_end",
                "name": name,
                "task_id": task_id,
            })
            _publish(channel, {
                "type": "status",
                "message": "Thinking...",
                "task_id": task_id,
            })

        elif kind == "on_chain_end" and name == "LangGraph":
            final_state = event.get("data", {}).get("output", {})

    if not final_state:
        final_state = await graph.ainvoke(initial_state)

    cards = _extract_tool_cards(final_state)

    for msg in reversed(final_state.get("messages", [])):
        if isinstance(msg, AIMessage) and msg.content:
            if isinstance(msg.content, list):
                parts = [
                    b.get("text", "") if isinstance(b, dict) else str(b)
                    for b in msg.content
                ]
                return " ".join(parts), cards
            return str(msg.content), cards
    return "", cards
