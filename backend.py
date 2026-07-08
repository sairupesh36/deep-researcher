import json
import uuid
import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from agent import research_agent

app = FastAPI()

# Allow connections from Frontend browser files
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "research_history.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            query TEXT,
            report TEXT,
            search_queries TEXT,
            search_results TEXT,
            logs TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

# Initialize DB on startup
init_db()

# 1. API: Get all history
@app.get("/api/history")
async def get_history():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, query, created_at FROM reports ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        
        history = [{"id": r[0], "query": r[1], "created_at": r[2]} for r in rows]
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 2. API: Get specific report details
@app.get("/api/history/{thread_id}")
async def get_report_detail(thread_id: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, query, report, search_queries, search_results, logs, created_at FROM reports WHERE id = ?", (thread_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="Report session not found")
            
        return {
            "id": row[0],
            "query": row[1],
            "report": row[2],
            "search_queries": json.loads(row[3]) if row[3] else [],
            "search_results": json.loads(row[4]) if row[4] else [],
            "logs": json.loads(row[5]) if row[5] else [],
            "created_at": row[6]
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 3. API: Stream research progress via Server-Sent Events (SSE)
@app.get("/api/research/stream")
async def stream_research(query: str, google_api_key: str, tavily_api_key: str, thread_id: str = None):
    if not thread_id:
        thread_id = str(uuid.uuid4())
        
    def event_generator():
        initial_state = {
            "query": query,
            "openai_api_key": google_api_key, # gemini key mapped to openai_api_key internally in state
            "tavily_api_key": tavily_api_key,
            "search_queries": [],
            "search_results": [],
            "notes": "",
            "report": "",
            "plan": "",
            "loop_count": 0,
            "logs": []
        }
        
        # Initial status event
        yield f"event: log\ndata: Initiating connection for session {thread_id}...\n\n"
        
        try:
            final_state = {
                "search_queries": [],
                "search_results": [],
                "logs": []
            }
            
            # Run LangGraph streaming
            for chunk in research_agent.stream(initial_state):
                node_name = list(chunk.keys())[0]
                node_output = chunk[node_name]
                
                # Merge outputs
                for k, v in node_output.items():
                    if k in ["logs", "search_results"]:
                        final_state[k].extend(v)
                    else:
                        final_state[k] = v
                
                # Stream the latest logs
                new_logs = node_output.get("logs", [])
                for log_msg in new_logs:
                    yield f"event: log\ndata: {log_msg}\n\n"
            
            # Save the final results to SQLite
            report_content = final_state.get("report", "No report generated.")
            search_queries = final_state.get("search_queries", [])
            search_results = final_state.get("search_results", [])
            all_logs = final_state.get("logs", [])
            
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO reports (id, query, report, search_queries, search_results, logs) VALUES (?, ?, ?, ?, ?, ?)",
                (
                    thread_id,
                    query,
                    report_content,
                    json.dumps(search_queries),
                    json.dumps(search_results),
                    json.dumps(all_logs)
                )
            )
            conn.commit()
            conn.close()
            
            # Complete event sending final data
            payload = json.dumps({
                "thread_id": thread_id,
                "report": report_content,
                "search_queries": search_queries,
                "search_results": search_results,
                "logs": all_logs
            })
            yield f"event: complete\ndata: {payload}\n\n"
            
        except Exception as e:
            yield f"event: error\ndata: {str(e)}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")
