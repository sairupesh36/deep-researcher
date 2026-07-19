"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { 
  Search, 
  Settings, 
  Cpu, 
  Compass, 
  FileText, 
  Copy, 
  Check, 
  Download, 
  ArrowRight, 
  RefreshCw,
  ExternalLink,
  ChevronRight,
  History,
  Plus,
  Terminal as TerminalIcon,
  Clock,
  Sparkles
} from "lucide-react";

const API_BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL || (window.location.port === "3000" ? "http://localhost:8000" : ""))
  : "";

const MOCK_REPORTS = [
  {
    id: "mock-1",
    query: "Explain the Transformer Architecture and Self-Attention",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    report: `# Transformer Architecture & Self-Attention

Introduced in the seminal paper *"Attention Is All You Need"* (Vaswani et al., 2017), the Transformer architecture revolutionized natural language processing (NLP) and computer vision.

## 1. Core Component: Self-Attention
Self-attention allows the model to associate each word in the input sequence with every other word, creating dynamic context representations.

$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$

## 2. Encoder-Decoder Block Structure
- **Encoder**: Processes the input sequence into continuous representations.
- **Decoder**: Generates output sequences, attending to the encoder's output.

## 3. Key Strengths
- **Parallelization**: RNNs process tokens sequentially, while Transformers process all tokens simultaneously, drastically reducing training times.
- **Long-range Dependencies**: Attention has a constant path length between any two tokens, bypassing the vanishing gradient limitations of RNNs/LSTMs.`,
    search_queries: [
      "Transformer architecture attention is all you need vaswani",
      "Mathematical explanation of self attention mechanism",
      "Transformer encoder decoder structure block diagram"
    ],
    search_results: [
      "Source: Attention Is All You Need paper (https://arxiv.org/abs/1706.03762)\nContent: The Transformer is the first transduction model relying entirely on self-attention to compute representations of its input and output without using sequence-aligned RNNs or convolution.",
      "Source: Illustrated Transformer (https://jalammar.github.io/illustrated-transformer/)\nContent: Detailed visual guide to how the Transformer operates, explaining query, key, and value vectors."
    ],
    logs: [
      "Planner: Analyzed topic and created research plan checklist.",
      "Planner: Scheduled initial web search targets: Attention Is All You Need paper, self attention math, transformer structure",
      "Search Agent: Completed crawling for scheduled queries.",
      "Search Agent: Retrieved 2 search snippets/references.",
      "Critic: Gap analysis complete (Iteration 1/2). Found missing information, scheduling supplementary searches.",
      "Search Agent: Completed supplementary crawling.",
      "Critic: Gap analysis complete. Gathered data is sufficient to write a comprehensive report.",
      "Writer: Completed writing and formatting final research report."
    ]
  },
  {
    id: "mock-2",
    query: "Breakthroughs in Fusion Energy in 2026",
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    report: `# Breakthroughs in Fusion Energy (2026)

In recent years, nuclear fusion has transitioned from a theoretical energy source to a highly anticipated commercial sector. Highlights in 2026 include advancements in high-temperature superconducting (HTS) magnets and magnetic confinement systems.

## 1. High-Temperature Superconducting Magnets
New designs using Rare-Earth Barium Copper Oxide (REBCO) tapes have achieved magnetic fields exceeding 20 Tesla, reducing the required volume of tokamak reactors by a factor of ten and making commercial deployment economically viable.

## 2. Net Energy Gain Milestones
Multiple private ventures have reported Q-factors (ratio of fusion power produced to input heating power) exceeding $Q > 1.2$ for sustained runs of over 100 seconds.

## 3. Commercialization Timeline
Companies like Commonwealth Fusion Systems and Helion Energy are targeting first-grid electricity delivery before 2030, leveraging advanced plasma confinement diagnostics.`,
    search_queries: [
      "Fusion energy breakthroughs 2026 milestones",
      "Commercial tokamak developments REBCO magnets",
      "Q factor achievements fusion reactors"
    ],
    search_results: [
      "Source: World Nuclear News (https://world-nuclear-news.org)\nContent: Fusion developers report major progress in scaling high-field magnets, bringing tokamak designs closer to pilot plant deployment.",
      "Source: ITER Project Status (https://www.iter.org)\nContent: ITER updates assembly plans to integrate new plasma confinement diagnostics ahead of deuterium-tritium campaigns."
    ],
    logs: [
      "Planner: Analyzed topic and created research plan checklist.",
      "Planner: Scheduled initial web search targets: Fusion energy breakthroughs, REBCO magnets, Q factor achievements",
      "Search Agent: Completed crawling for scheduled queries.",
      "Search Agent: Retrieved 2 search snippets/references.",
      "Critic: Gap analysis complete. Gathered data is sufficient to write a comprehensive report.",
      "Writer: Completed writing and formatting final research report."
    ]
  }
];

export default function Home() {
  // Key inputs & search query states
  const [googleKey, setGoogleKey] = useState("");
  const [tavilyKey, setTavilyKey] = useState("");
  const [backendUrl, setBackendUrl] = useState("");
  const [isBackendOffline, setIsBackendOffline] = useState(true);
  const [query, setQuery] = useState("");
  
  // App UI states
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState(null);
  
  // Real-time streaming logs
  const [streamingLogs, setStreamingLogs] = useState([]);
  
  // History lists state
  const [historyList, setHistoryList] = useState([]);
  
  // Results states
  const [report, setReport] = useState("");
  const [searchQueries, setSearchQueries] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [copied, setCopied] = useState(false);

  // Ref for log terminal autoscroll
  const terminalEndRef = useRef(null);

  // Load keys from localStorage and fetch history on mount
  useEffect(() => {
    const savedGoogleKey = localStorage.getItem("deep_research_groq_key") || "";
    const savedTavilyKey = localStorage.getItem("deep_research_tavily_key") || "";
    const savedBackendUrl = localStorage.getItem("deep_research_backend_url") || "";
    setGoogleKey(savedGoogleKey);
    setTavilyKey(savedTavilyKey);
    setBackendUrl(savedBackendUrl);
    
    // Default keys to what user provided for ease of testing
    if (!savedGoogleKey) {
      const defaultGoogle = "";
      setGoogleKey(defaultGoogle);
      localStorage.setItem("deep_research_google_key", defaultGoogle);
    }
    if (!savedTavilyKey) {
      const defaultTavily = "";
      setTavilyKey(defaultTavily);
      localStorage.setItem("deep_research_tavily_key", defaultTavily);
    }

    fetchHistory();
  }, [backendUrl]);

  // Autoscroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamingLogs]);

  const getBackendUrl = () => {
    return backendUrl.trim() || API_BASE;
  };

  // Fetch past reports list
  const fetchHistory = async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/history`);
      if (response.ok) {
        const data = await response.json();
        setHistoryList(data);
        setIsBackendOffline(false);
      } else {
        throw new Error("Backend offline status");
      }
    } catch (error) {
      console.warn("Backend offline, loading mock history for portfolio demo:", error);
      setHistoryList(MOCK_REPORTS);
      setIsBackendOffline(true);
    }
  };

  // Load a report from history
  const loadHistoryItem = async (id) => {
    if (isLoading) return;
    setIsLoading(false);
    
    try {
      const response = await fetch(`${getBackendUrl()}/api/history/${id}`);
      if (response.ok) {
        const data = await response.json();
        setActiveThreadId(data.id);
        setQuery(data.query);
        setReport(data.report);
        setSearchQueries(data.search_queries || []);
        setSearchResults(data.search_results || []);
        setStreamingLogs(data.logs || []);
        return;
      }
    } catch (error) {
      console.warn("Failed to load online report, searching in mock reports...", error);
    }

    // Fallback to mock item
    const mockItem = MOCK_REPORTS.find(item => item.id === id);
    if (mockItem) {
      setActiveThreadId(mockItem.id);
      setQuery(mockItem.query);
      setReport(mockItem.report);
      setSearchQueries(mockItem.search_queries || []);
      setSearchResults(mockItem.search_results || []);
      setStreamingLogs(mockItem.logs || []);
    } else {
      alert("Failed to load historical report.");
    }
  };

  // Reset page state to start new research
  const handleNewResearch = () => {
    if (isLoading) return;
    setActiveThreadId(null);
    setQuery("");
    setReport("");
    setSearchQueries([]);
    setSearchResults([]);
    setStreamingLogs([]);
  };

  // Save keys helper
  const saveKeys = (gKey, tKey, bUrl) => {
    localStorage.setItem("deep_research_groq_key", gKey);
    localStorage.setItem("deep_research_tavily_key", tKey);
    localStorage.setItem("deep_research_backend_url", bUrl || "");
  };

  const runSimulatedResearch = () => {
    setIsLoading(true);
    setReport("");
    setSearchQueries([]);
    setSearchResults([]);
    setStreamingLogs([]);

    const steps = [
      { log: "Planner: Analyzed topic and created research plan checklist.", delay: 1000 },
      { log: "Planner: Scheduled initial web search targets: " + query.trim() + " overview, current breakthroughs, main components", delay: 2500 },
      { log: "Search Agent: Initiated Tavily API search crawling...", delay: 4000 },
      { log: "Search Agent: Completed crawling. Retrieved 4 search references.", delay: 6000 },
      { log: "Critic: Gap analysis complete (Iteration 1/2). Found missing information, scheduling supplementary searches.", delay: 7500 },
      { log: "Search Agent: Completed supplementary crawling.", delay: 9000 },
      { log: "Critic: Gap analysis complete. Gathered data is sufficient to write report.", delay: 10500 },
      { log: "Writer: Consolidating findings and synthesizing final report...", delay: 12000 },
      { log: "Writer: Completed writing and formatting final research report.", delay: 14000 }
    ];

    steps.forEach((step) => {
      setTimeout(() => {
        setStreamingLogs((prev) => [...prev, step.log]);
      }, step.delay);
    });

    setTimeout(() => {
      setSearchQueries([
        `${query.trim()} general overview and facts`,
        `${query.trim()} recent news and status`,
        `${query.trim()} detailed analysis and references`
      ]);
      setSearchResults([
        `Source: Global Science Index (https://example.org/science/${encodeURIComponent(query.trim().toLowerCase())})\nContent: Comprehensive overview detailing the structural advancements and key parameters of ${query.trim()}.`,
        `Source: Technology Review (https://example.org/tech-review)\nContent: In-depth analysis of the current state, industry adoption, and future outlook for ${query.trim()}.`
      ]);
      setReport(`# Simulated Research Report: ${query.trim()}

This is a **simulated research report** generated in Demo Mode because the backend Python server is currently offline.

## 1. Overview
Researching a topic like **${query.trim()}** involves multiple agent checkpoints. In a live environment, the LangGraph Planner designs a custom search checklist, the Search Agent crawls Google index via the Tavily Search API, and the Critic agent ensures all gaps are resolved.

## 2. Key Findings
- **Agent Framework**: Built using LangGraph state charts with persistent SQLite checkpoints.
- **Data Crawling**: Powered by asynchronous Tavily searches.
- **LaTeX Capabilities**: Supports mathematical equations like $\\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e$ parsed via KaTeX.

## 3. How to run live
You can boot up the FastAPI backend using **GitHub Codespaces** and link it via the **API Configurations** drawer to perform real, live research!`);
      setIsLoading(false);
    }, 14500);
  };

  // Handle Form Submission (SSE stream)
  const handleResearch = (e) => {
    e.preventDefault();
    if (!query.trim()) {
      alert("Please enter a research topic!");
      return;
    }

    if (isBackendOffline) {
      runSimulatedResearch();
      return;
    }

    if (!googleKey || !tavilyKey) {
      setIsConfigOpen(true);
      alert("Please provide both Groq and Tavily API keys first!");
      return;
    }

    setIsLoading(true);
    setReport("");
    setSearchQueries([]);
    setSearchResults([]);
    setStreamingLogs([]);
    
    const threadId = activeThreadId || "";
    
    const url = `${getBackendUrl()}/api/research/stream?query=${encodeURIComponent(query.trim())}&groq_api_key=${encodeURIComponent(googleKey.trim())}&tavily_api_key=${encodeURIComponent(tavilyKey.trim())}&thread_id=${threadId}`;
    
    const eventSource = new EventSource(url);
    
    // Listen for log steps
    eventSource.addEventListener("log", (event) => {
      setStreamingLogs((prev) => [...prev, event.data]);
    });
    
    // Listen for completion
    eventSource.addEventListener("complete", (event) => {
      const result = JSON.parse(event.data);
      setReport(result.report);
      setSearchQueries(result.search_queries || []);
      setSearchResults(result.search_results || []);
      setStreamingLogs(result.logs || []);
      setActiveThreadId(result.thread_id);
      setIsLoading(false);
      eventSource.close();
      fetchHistory(); // Refresh history list
    });
    
    // Listen for errors
    eventSource.addEventListener("error", (event) => {
      console.error("SSE Error:", event);
      setStreamingLogs((prev) => [...prev, `[CRITICAL ERROR]: Connection lost or request failed.`]);
      setIsLoading(false);
      eventSource.close();
    });
  };

  // Copy to clipboard helper
  const copyToClipboard = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download markdown file helper
  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${query.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}_report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Parse source helper (extracts title, url, content from raw strings)
  const parseSource = (sourceStr) => {
    const titleMatch = sourceStr.match(/Source:\s*(.*?)\s*\(/);
    const urlMatch = sourceStr.match(/\((https?:\/\/.*?)\)/);
    const contentMatch = sourceStr.match(/Content:\s*([\s\S]*)/);
    
    return {
      title: titleMatch ? titleMatch[1] : "Web Source",
      url: urlMatch ? urlMatch[1] : "#",
      snippet: contentMatch ? contentMatch[1] : sourceStr
    };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex relative overflow-x-hidden selection:bg-indigo-500 selection:text-white font-sans">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-1%] w-[45%] h-[45%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Sidebar - History */}
      <aside className="w-80 border-r border-slate-900 bg-slate-950/70 backdrop-blur-md hidden md:flex flex-col shrink-0 z-30">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-indigo-400" />
            <h2 className="text-sm font-bold tracking-wide uppercase text-slate-300">Research Log</h2>
          </div>
          <button 
            onClick={handleNewResearch}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all disabled:opacity-40"
            title="Start New Research"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Sidebar List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {historyList.length === 0 ? (
            <div className="text-center py-8 px-4 flex flex-col gap-2 items-center justify-center">
              <Clock className="h-8 w-8 text-slate-700" />
              <p className="text-xs text-slate-500 leading-normal">No past research logs found. Write your first query to start.</p>
            </div>
          ) : (
            historyList.map((item) => (
              <button
                key={item.id}
                onClick={() => loadHistoryItem(item.id)}
                disabled={isLoading}
                className={`w-full text-left p-3 rounded-xl border text-xs leading-normal transition-all flex flex-col gap-1.5 ${
                  activeThreadId === item.id 
                    ? 'border-indigo-500/30 bg-indigo-950/20 text-indigo-200 shadow-md shadow-indigo-500/5' 
                    : 'border-slate-900 bg-slate-900/20 text-slate-400 hover:text-slate-200 hover:border-slate-800 hover:bg-slate-900/50'
                }`}
              >
                <span className="font-semibold line-clamp-2">{item.query}</span>
                <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium font-mono">
                  <Clock className="h-3 w-3" />
                  {new Date(item.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-h-screen relative z-10">
        
        {/* Header */}
        <header className="border-b border-slate-900 backdrop-blur-md bg-slate-950/80 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Cpu className="h-5.5 w-5.5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-200 via-slate-100 to-blue-200 bg-clip-text text-transparent flex items-center gap-1.5">
                  Deep Researcher AI <Sparkles className="h-4 w-4 text-indigo-400 fill-indigo-400/20" />
                </h1>
                {isBackendOffline ? (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold uppercase tracking-wider">
                    <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
                    <span>Demo Mode</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Connected</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium">Multi-Agent System & Stateful logs</p>
            </div>
          </div>

          <button 
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-900 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-800 transition-all text-sm font-medium"
          >
            <Settings className={`h-4 w-4 text-slate-400 ${isConfigOpen ? 'rotate-90' : ''} transition-transform duration-300`} />
            <span>API Configurations</span>
          </button>
        </header>

        {/* Workspace Body */}
        <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 flex flex-col gap-8">
          
          {/* API Configurations Drawer */}
          {isConfigOpen && (
            <div className="border border-slate-900 bg-slate-900/30 backdrop-blur-xl rounded-2xl p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Settings className="h-4 w-4" /> API Settings
                </h2>
                <p className="text-xs text-slate-500">Keys are saved locally in your browser storage.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Groq API Key</label>
                  <input 
                    type="password"
                    value={googleKey}
                    onChange={(e) => {
                      setGoogleKey(e.target.value);
                      saveKeys(e.target.value, tavilyKey, backendUrl);
                    }}
                    placeholder="gsk-..."
                    className="bg-slate-950/80 border border-slate-900 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-800 font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Tavily Search API Key</label>
                  <input 
                    type="password"
                    value={tavilyKey}
                    onChange={(e) => {
                      setTavilyKey(e.target.value);
                      saveKeys(googleKey, e.target.value, backendUrl);
                    }}
                    placeholder="tvly-..."
                    className="bg-slate-950/80 border border-slate-900 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-800 font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Backend API URL (Optional)</label>
                  <input 
                    type="text"
                    value={backendUrl}
                    onChange={(e) => {
                      setBackendUrl(e.target.value);
                      saveKeys(googleKey, tavilyKey, e.target.value);
                    }}
                    placeholder="e.g. https://your-username-your-space.hf.space"
                    className="bg-slate-950/80 border border-slate-900 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-800 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Query Input Section */}
          <section className="flex flex-col gap-4">
            <form onSubmit={handleResearch} className="flex flex-col gap-3">
              <div className="relative flex items-center">
                <Search className="absolute left-4 text-slate-500 h-5.5 w-5.5" />
                <input 
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={isLoading}
                  placeholder="Enter your research topic... (e.g. Explain quantum computing advancements in 2026)"
                  className="w-full pl-12 pr-36 py-4.5 bg-slate-900/10 backdrop-blur-md border border-slate-900 hover:border-slate-800 focus:border-indigo-500/50 rounded-2xl outline-none transition-all text-slate-100 shadow-xl placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/10 text-base"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="absolute right-3 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 disabled:from-slate-800 disabled:to-slate-800 text-white font-semibold rounded-xl text-sm transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2 border border-indigo-500/10"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Researching...</span>
                    </>
                  ) : (
                    <>
                      <span>Search</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* Real-time streaming log console during loading or when displayed */}
          {streamingLogs.length > 0 && (
            <div className="border border-slate-900 bg-slate-950 rounded-2xl p-5 flex flex-col gap-3 shadow-xl relative overflow-hidden font-mono">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <TerminalIcon className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Agent Processing Terminal</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[10px] text-slate-500 font-bold">STREAM ACTIVE</span>
                </div>
              </div>
              <div className="h-40 overflow-y-auto flex flex-col gap-2 text-xs text-slate-300 pr-1 select-text">
                {streamingLogs.map((log, idx) => {
                  let logColor = "text-slate-400";
                  if (log.startsWith("Planner")) logColor = "text-indigo-400";
                  if (log.startsWith("Search")) logColor = "text-blue-400";
                  if (log.startsWith("Critic")) logColor = "text-amber-400";
                  if (log.startsWith("Writer")) logColor = "text-emerald-400 animate-pulse";
                  if (log.includes("[CRITICAL ERROR]")) logColor = "text-rose-500 font-semibold";

                  return (
                    <div key={idx} className="flex gap-2 items-start leading-normal">
                      <span className="text-slate-600 select-none">&gt;</span>
                      <span className={logColor}>{log}</span>
                    </div>
                  );
                })}
                <div ref={terminalEndRef} />
              </div>
            </div>
          )}

          {/* Results Report Display */}
          {report && !isLoading && (
            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-6 duration-300">
              
              {/* Metadata (Sub-queries & sources) */}
              {searchQueries.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Search Queries Card */}
                  <div className="md:col-span-1 border border-slate-900 bg-slate-900/10 backdrop-blur-md rounded-2xl p-5 flex flex-col gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                      <Compass className="h-4 w-4" /> Search Targets
                    </h3>
                    <div className="flex flex-col gap-2">
                      {searchQueries.map((q, idx) => (
                        <div key={idx} className="flex gap-2.5 items-start p-2.5 rounded-xl bg-slate-900/30 border border-slate-900">
                          <ChevronRight className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                          <span className="text-xs text-slate-300 leading-normal font-medium">{q}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sources Card */}
                  <div className="md:col-span-2 border border-slate-900 bg-slate-900/10 backdrop-blur-md rounded-2xl p-5 flex flex-col gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" /> Web Sources Found
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                      {searchResults.map((s, idx) => {
                        const parsed = parseSource(s);
                        return (
                          <a 
                            key={idx}
                            href={parsed.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 rounded-xl bg-slate-900/30 border border-slate-900 hover:border-blue-500/20 transition-all flex flex-col gap-1.5 group"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-200 line-clamp-1 group-hover:text-blue-400 transition-colors">
                                {parsed.title}
                              </span>
                              <ExternalLink className="h-3.5 w-3.5 text-slate-500 shrink-0 group-hover:text-blue-400 transition-colors" />
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono break-all line-clamp-1">{parsed.url}</span>
                            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{parsed.snippet}</p>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Main Report Document Card */}
              <div className="border border-slate-900 bg-slate-900/10 backdrop-blur-md rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-2xl">
                
                {/* Header inside Card */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-950 border border-indigo-500/20 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100">Research Documentation</h3>
                      <p className="text-xs text-slate-400">Synthesized report from findings</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900 hover:border-slate-700 transition-all text-xs font-semibold"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 text-slate-400" />
                          <span>Copy Markdown</span>
                        </>
                      )}
                    </button>
                    <button 
                      onClick={downloadReport}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all text-xs font-semibold shadow-lg shadow-indigo-500/10"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Report</span>
                    </button>
                  </div>
                </div>

                {/* Rendered Markdown Content */}
                <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed md:text-base space-y-4">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-slate-100 pt-6 pb-2 border-b border-slate-850" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-bold text-indigo-300 pt-5 pb-2" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-blue-300 pt-4" {...props} />,
                      p: ({node, ...props}) => <p className="leading-relaxed text-slate-300 mb-4" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-2 mb-4" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-6 space-y-2 mb-4" {...props} />,
                      li: ({node, ...props}) => <li className="text-slate-300" {...props} />,
                      a: ({node, ...props}) => <a className="text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center gap-1 font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
                      code: ({node, ...props}) => <code className="bg-slate-950 border border-slate-850 rounded px-1.5 py-0.5 text-indigo-300 font-mono text-sm" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-500 bg-indigo-950/10 pl-4 py-2 text-slate-400 italic rounded-r-lg" {...props} />,
                      table: ({node, ...props}) => <table className="w-full border-collapse border border-slate-800 text-sm mb-4" {...props} />,
                      th: ({node, ...props}) => <th className="border border-slate-850 bg-slate-900/60 p-2 text-left font-bold" {...props} />,
                      td: ({node, ...props}) => <td className="border border-slate-850 p-2" {...props} />
                    }}
                  >
                    {report ? report.replace(/\\n/g, "\n") : ""}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
