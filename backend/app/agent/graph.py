import logging

from langchain_core.messages import SystemMessage
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition

from app.agent.llm import get_model_with_tools
from app.agent.prompts import get_system_prompt
from app.agent.state import AgentState
from app.agent.tools import tools

logger = logging.getLogger(__name__)


def _agent_node(state: AgentState) -> dict:
    model = get_model_with_tools()
    response = model.invoke(state["messages"])
    return {"messages": [response]}


def _build_graph():
    builder = StateGraph(AgentState)

    builder.add_node("agent", _agent_node)
    builder.add_node("tools", ToolNode(tools))

    builder.add_edge(START, "agent")
    builder.add_conditional_edges(
        "agent",
        tools_condition,
        {"tools": "tools", "__end__": END},
    )
    builder.add_edge("tools", "agent")

    return builder.compile()


graph = None


async def init_graph():
    global graph
    graph = _build_graph()
    logger.info("LangGraph agent compiled with %d tools", len(tools))


def get_graph():
    return graph


MAX_CONTEXT_MESSAGES = 40


async def run_agent(messages: list[dict], thread_id: str, user_id: str = "", user_timezone: str = "UTC") -> str:
    from langchain_core.messages import AIMessage, HumanMessage

    lc_messages = [SystemMessage(content=get_system_prompt(user_timezone))]

    recent = messages[-MAX_CONTEXT_MESSAGES:] if len(messages) > MAX_CONTEXT_MESSAGES else messages

    for msg in recent:
        if msg["role"] == "user":
            lc_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            lc_messages.append(AIMessage(content=msg["content"]))

    g = get_graph()
    result = await g.ainvoke(
        {"messages": lc_messages, "user_id": user_id, "user_timezone": user_timezone, "tool_cards": []},
        config={"configurable": {"thread_id": thread_id}},
    )

    for msg in reversed(result["messages"]):
        if isinstance(msg, AIMessage) and msg.content:
            if isinstance(msg.content, list):
                parts = [
                    b.get("text", "") if isinstance(b, dict) else str(b)
                    for b in msg.content
                ]
                return " ".join(parts)
            return str(msg.content)
    return ""