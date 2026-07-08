import os
import operator
from typing import Annotated, TypedDict, List
from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
from tavily import TavilyClient

# Define the state schema
class ResearchState(TypedDict):
    query: str
    search_queries: List[str]
    search_results: Annotated[List[str], operator.add]
    notes: str
    report: str
    openai_api_key: str
    tavily_api_key: str
    # Advanced state variables
    plan: str
    loop_count: int
    logs: Annotated[List[str], operator.add]

# Node 1: Planner - Generate research checklist & initial queries
def planner(state: ResearchState):
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", 
        google_api_key=state["openai_api_key"]
    )
    
    plan_prompt = f"Create a structured research plan/checklist to cover all aspects of the topic: '{state['query']}'. " \
                  f"Keep it concise, bulleted, and detailed."
    plan_response = llm.invoke(plan_prompt)
    plan_text = plan_response.content
    
    query_prompt = f"Based on the research plan:\n{plan_text}\n\n" \
                   f"Generate 3 distinct, highly targeted search queries to start researching. " \
                   f"Output ONLY the queries, one per line. Do not number them."
    query_response = llm.invoke(query_prompt)
    queries = [q.strip() for q in query_response.content.split("\n") if q.strip()][:3]
    
    return {
        "plan": plan_text,
        "search_queries": queries,
        "loop_count": 0,
        "logs": [
            "Planner: Analyzed topic and created research plan checklist.",
            f"Planner: Scheduled initial web search targets: {', '.join(queries)}"
        ]
    }

# Node 2: Search Web - Run search queries using Tavily
def search_web(state: ResearchState):
    tavily = TavilyClient(api_key=state["tavily_api_key"])
    results = []
    
    for q in state["search_queries"]:
        try:
            response = tavily.search(query=q, max_results=2)
            for r in response.get('results', []):
                results.append(f"Source: {r['title']} ({r['url']})\nContent: {r['content']}")
        except Exception as e:
            results.append(f"Failed to search for '{q}': {str(e)}")
            
    return {
        "search_results": results,
        "logs": [
            f"Search Agent: Completed crawling for scheduled queries.",
            f"Search Agent: Retrieved {len(results)} search snippets/references."
        ]
    }

# Node 3: Critic - Review findings, check for gaps, and loop if needed
def critic(state: ResearchState):
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", 
        google_api_key=state["openai_api_key"]
    )
    
    loop_cnt = state.get("loop_count", 0)
    
    # Stop loop if threshold reached
    if loop_cnt >= 2:
        return {
            "search_queries": [],
            "logs": ["Critic: Maximum verification iterations reached. Directing to final report synthesis."]
        }
        
    context = "\n\n---\n\n".join(state["search_results"][-10:])
    prompt = f"You are a research quality critic. Review the user research query: '{state['query']}' and the gathered search findings:\n\n" \
             f"{context}\n\n" \
             f"Compare the gathered info with the research needs. If we need more detailed statistics, records, or history, generate 2 specific search queries to fill the gaps, one per line. " \
             f"If the information is already sufficient to write a comprehensive report, output ONLY the word 'SUFFICIENT'."
             
    response = llm.invoke(prompt)
    content = response.content.strip()
    
    if "SUFFICIENT" in content.upper() or len(content) < 5:
        return {
            "search_queries": [],
            "loop_count": loop_cnt + 1,
            "logs": ["Critic: Gap analysis complete. Gathered data is sufficient to write a comprehensive report."]
        }
    else:
        new_queries = [q.strip() for q in content.split("\n") if q.strip()][:2]
        return {
            "search_queries": new_queries,
            "loop_count": loop_cnt + 1,
            "logs": [
                f"Critic: Gap analysis complete (Iteration {loop_cnt + 1}/2). Found missing information.",
                f"Critic: Scheduled supplementary web searches: {', '.join(new_queries)}"
            ]
        }

# Node 4: Writer - Synthesize search results and write final report
def generate_report(state: ResearchState):
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", 
        google_api_key=state["openai_api_key"]
    )
    
    context = "\n\n---\n\n".join(state["search_results"])
    prompt = f"You are an expert deep researcher. Write a comprehensive, well-structured, and highly detailed report on the topic: '{state['query']}'.\n\n" \
             f"Use the following web search findings and references to write the report. Include citations (URLs and source titles) where appropriate:\n\n" \
             f"{context}\n\n" \
             f"Provide the final report in beautifully formatted Markdown."
             
    response = llm.invoke(prompt)
    return {
        "report": response.content,
        "logs": ["Writer: Completed writing and formatting final research report."]
    }

# Router: Decide whether to search again or generate report
def route_after_critic(state: ResearchState):
    if len(state.get("search_queries", [])) > 0:
        return "search_web"
    else:
        return "generate_report"

# Build the Graph workflow
builder = StateGraph(ResearchState)
builder.add_node("planner", planner)
builder.add_node("search_web", search_web)
builder.add_node("critic", critic)
builder.add_node("generate_report", generate_report)

# Define transitions
builder.add_edge(START, "planner")
builder.add_edge("planner", "search_web")
builder.add_edge("search_web", "critic")
builder.add_conditional_edges(
    "critic",
    route_after_critic,
    {
        "search_web": "search_web",
        "generate_report": "generate_report"
    }
)
builder.add_edge("generate_report", END)

# Compile into a runnable agent
research_agent = builder.compile()
