import os
import sys

# If run on Hugging Face Spaces (Gradio SDK template), run uvicorn server for FastAPI backend on port 7860
if os.environ.get("SPACE_ID") or os.environ.get("SPACES_ZERO_GPU"):
    import uvicorn
    from backend import app
    if __name__ == "__main__":
        uvicorn.run(app, host="0.0.0.0", port=7860)
    sys.exit(0)

import streamlit as st
from agent import research_agent

# Set up page configurations
st.set_page_config(
    page_title="Deep Researcher AI", 
    page_icon="🔬", 
    layout="wide"
)

# Sidebar for API keys configuration
st.sidebar.title("⚙️ Configurations")
st.sidebar.markdown("Provide your API keys to get started:")

openai_api_key = st.sidebar.text_input(
    "Groq API Key", 
    type="password", 
    placeholder="gsk-..."
)
tavily_api_key = st.sidebar.text_input(
    "Tavily API Key", 
    type="password", 
    placeholder="tvly-..."
)

st.sidebar.markdown(
    "[Get Tavily Key](https://tavily.com) | [Get Groq Key](https://console.groq.com)"
)

# Main UI
st.title("🔬 Personal Deep Researcher")
st.write("An open-source deep research agent powered by LangGraph, LangChain, and Tavily.")

query = st.text_input(
    "Enter your research topic:", 
    placeholder="e.g., Explain the latest breakthroughs in fusion energy in 2026."
)

if st.button("Start Deep Research", type="primary"):
    if not openai_api_key or not tavily_api_key:
        st.error("Please provide both OpenAI and Tavily API keys in the sidebar.")
    elif not query.strip():
        st.warning("Please enter a research topic first.")
    else:
        # Spinner and status updates
        with st.spinner("Analyzing topic and running search queries..."):
            try:
                # Compile initial state input
                initial_state = {
                    "query": query,
                    "openai_api_key": openai_api_key,
                    "tavily_api_key": tavily_api_key,
                    "search_queries": [],
                    "search_results": [],
                    "notes": "",
                    "report": ""
                }
                
                # Run the LangGraph agent
                result = research_agent.invoke(initial_state)
                
                st.success("Research completed!")
                
                # Show generated sub-queries & sources
                with st.expander("🔍 Show Research Steps & Sources"):
                    st.write("**Generated Search Queries:**")
                    for q in result.get("search_queries", []):
                        st.markdown(f"- `{q}`")
                        
                    st.write("**Found Sources:**")
                    for s in result.get("search_results", []):
                        st.markdown(s)
                
                # Display Final Report
                st.subheader("📝 Final Report")
                st.markdown(result.get("report", "No report generated."))
                
            except Exception as e:
                st.error(f"An error occurred: {str(e)}")
