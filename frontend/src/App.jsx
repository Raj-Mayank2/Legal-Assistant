import React, { useState } from 'react';
import { ShieldAlert, FileText, GitCompare, BookOpen, Upload, CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000/api/v1";

export default function App() {
  const [activeTab, setActiveTab] = useState('audit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for Audit
  const [auditText, setAuditText] = useState('');
  const [auditResult, setAuditResult] = useState(null);

  // State for Redline
  const [redlineClause, setRedlineClause] = useState('');
  const [redlineStance, setRedlineStance] = useState('Pro-Vendor');
  const [redlineObj, setRedlineObj] = useState('Introduce reasonable liability cap and exclude consequential damages.');
  const [redlineResult, setRedlineResult] = useState(null);

  // State for Compare
  const [origText, setOrigText] = useState('');
  const [revText, setRevText] = useState('');
  const [compareResult, setCompareResult] = useState(null);

  // State for Research RAG
  const [researchQuery, setResearchQuery] = useState('');
  const [researchResult, setResearchResult] = useState(null);
  const [corpusFile, setCorpusFile] = useState(null);
  const [corpusStatus, setCorpusStatus] = useState(null);

  // Generic API caller
  const handleApiCall = async (endpoint, method, body, isFile = false) => {
    setLoading(true);
    setError(null);
    try {
      const options = { method };
      if (!isFile) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(body);
      } else {
        options.body = body; // FormData
      }

      const res = await fetch(`${API_BASE}${endpoint}`, options);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'API request failed');
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">LexAI Studio</h1>
            <p className="text-xs text-slate-400">Enterprise Legal Service Assistant & Risk Auditor</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>FastAPI + Groq Connected</span>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 flex space-x-2 overflow-x-auto">
        {[
          { id: 'audit', label: 'Contract Risk Auditor', icon: ShieldAlert },
          { id: 'redline', label: 'Assisted Redliner', icon: FileText },
          { id: 'compare', label: 'Document Comparison', icon: GitCompare },
          { id: 'research', label: 'Statute RAG Research', icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center space-x-3 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: CONTRACT AUDIT */}
        {activeTab === 'audit' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
              <h2 className="text-lg font-semibold text-white mb-2">Contract Risk Audit</h2>
              <p className="text-sm text-slate-400 mb-4">Paste agreement text below to generate an executive risk score, find hazardous clauses, and extract metadata.</p>
              
              <textarea
                value={auditText}
                onChange={(e) => setAuditText(e.target.value)}
                placeholder="Paste contract text here..."
                className="flex-1 min-h-[300px] bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none font-mono"
              />

              <button
                onClick={async () => {
                  const res = await handleApiCall('/audit/contract', 'POST', { contract_text: auditText });
                  if (res) setAuditResult(res);
                }}
                disabled={loading || !auditText}
                className="mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Run Comprehensive Audit</span>}
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-y-auto max-h-[700px]">
              <h2 className="text-lg font-semibold text-white mb-4">Audit Report</h2>
              {auditResult ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-xs text-slate-400 uppercase tracking-wider">Risk Level</span>
                      <p className={`text-lg font-bold ${auditResult.risk_level === 'High' ? 'text-red-400' : 'text-amber-400'}`}>
                        {auditResult.risk_level} Risk
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 uppercase tracking-wider">Risk Score</span>
                      <p className="text-2xl font-black text-white">{auditResult.risk_score} / 10</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-1">Executive Summary</h3>
                    <p className="text-sm text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">{auditResult.executive_summary}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>High Risk Clauses</span>
                    </h3>
                    <ul className="space-y-2">
                      {auditResult.high_risk_clauses.map((clause, idx) => (
                        <li key={idx} className="text-sm bg-red-500/5 border border-red-500/10 p-3 rounded-xl text-red-300">{clause}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-amber-400 mb-2">Missing Protections</h3>
                    <ul className="flex flex-wrap gap-2">
                      {auditResult.missing_protections.map((prot, idx) => (
                        <span key={idx} className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-3 py-1.5 rounded-full">{prot}</span>
                      ))}
                    </ul>
                  </div>

                  <div className="text-xs text-slate-500 pt-4 border-t border-slate-800">{auditResult.disclaimer}</div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-20 text-center">
                  <ShieldAlert className="w-12 h-12 mb-3 stroke-1" />
                  <p>Submit contract text to view structured AI findings.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ASSISTED REDLINER */}
        {activeTab === 'redline' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Assisted Clause Redliner</h2>
                <p className="text-sm text-slate-400">Rewrite aggressive clauses into market-standard language.</p>
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Risky Clause Text</label>
                <textarea
                  value={redlineClause}
                  onChange={(e) => setRedlineClause(e.target.value)}
                  placeholder="Enter clause to rewrite..."
                  className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Stance</label>
                  <select
                    value={redlineStance}
                    onChange={(e) => setRedlineStance(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Pro-Vendor">Pro-Vendor</option>
                    <option value="Pro-Client">Pro-Client</option>
                    <option value="Neutral">Neutral / Market Standard</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Objective</label>
                  <input
                    type="text"
                    value={redlineObj}
                    onChange={(e) => setRedlineObj(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                onClick={async () => {
                  const res = await handleApiCall('/redline/clause', 'POST', {
                    clause_text: redlineClause,
                    stance: redlineStance,
                    objective: redlineObj
                  });
                  if (res) setRedlineResult(res);
                }}
                disabled={loading || !redlineClause}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Generate Redlined Clause</span>}
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-y-auto max-h-[700px]">
              <h2 className="text-lg font-semibold text-white mb-4">Redline Results</h2>
              {redlineResult ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Redlined Replacement Clause</h3>
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl text-sm text-emerald-200 font-mono leading-relaxed">
                      {redlineResult.redlined_clause}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Legal Rationale</h3>
                    <p className="text-sm text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 leading-relaxed">
                      {redlineResult.legal_rationale}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Negotiation Strategy</h3>
                    <p className="text-sm text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 leading-relaxed">
                      {redlineResult.negotiation_tip}
                    </p>
                  </div>

                  <div className="text-xs text-slate-500 pt-2 border-t border-slate-800">{redlineResult.disclaimer}</div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-20 text-center">
                  <FileText className="w-12 h-12 mb-3 stroke-1" />
                  <p>Provide a clause and stance to generate professional redlines.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DOCUMENT COMPARISON */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
                <h2 className="text-sm font-semibold text-slate-300 mb-2">Original Document (Base Template)</h2>
                <textarea
                  value={origText}
                  onChange={(e) => setOrigText(e.target.value)}
                  placeholder="Paste original contract text..."
                  className="flex-1 min-h-[200px] bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none font-mono"
                />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
                <h2 className="text-sm font-semibold text-slate-300 mb-2">Revised Document (Counter-Proposal)</h2>
                <textarea
                  value={revText}
                  onChange={(e) => setRevText(e.target.value)}
                  placeholder="Paste revised contract text..."
                  className="flex-1 min-h-[200px] bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none font-mono"
                />
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={async () => {
                  const res = await handleApiCall('/compare/documents', 'POST', { original_text: origText, revised_text: revText });
                  if (res) setCompareResult(res);
                }}
                disabled={loading || !origText || !revText}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-3 px-8 rounded-xl transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/20"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Compare Documents Side-by-Side</span>}
              </button>
            </div>

            {compareResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Overall Risk Shift</span>
                    <p className="text-lg font-bold text-indigo-400">{compareResult.risk_shift}</p>
                  </div>
                  <div className="max-w-xl">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Summary of Changes</span>
                    <p className="text-sm text-slate-300">{compareResult.summary_of_changes}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Added Clauses</h3>
                    <ul className="space-y-2">
                      {compareResult.added_clauses.map((c, i) => (
                        <li key={i} className="text-sm text-slate-300 bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/10">+ {c}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Removed Clauses</h3>
                    <ul className="space-y-2">
                      {compareResult.removed_clauses.map((c, i) => (
                        <li key={i} className="text-sm text-slate-300 bg-red-500/5 p-2.5 rounded-lg border border-red-500/10">- {c}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Modified Clauses Matrix</h3>
                  <div className="space-y-3">
                    {compareResult.modified_clauses.map((mod, i) => (
                      <div key={i} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                        <div className="font-semibold text-indigo-400 text-sm">{mod.clause_name}</div>
                        <p className="text-sm text-slate-300"><span className="text-slate-500">Change:</span> {mod.change_details}</p>
                        <p className="text-sm text-amber-300"><span className="text-slate-500">Impact:</span> {mod.legal_impact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: STATUTE RAG RESEARCH */}
        {activeTab === 'research' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Corpus Indexing</h2>
                <p className="text-sm text-slate-400">Upload statute PDFs to build your local vector database.</p>
              </div>

              <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center">
                <Upload className="w-8 h-8 text-indigo-400 mb-2" />
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setCorpusFile(e.target.files[0])}
                  className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
                {corpusFile && <span className="text-xs text-emerald-400 mt-2 font-mono">Selected: {corpusFile.name}</span>}
              </div>

              <button
                onClick={async () => {
                  if (!corpusFile) return;
                  const formData = new FormData();
                  formData.append("file", corpusFile);
                  const res = await handleApiCall('/research/upload-corpus', 'POST', formData, true);
                  if (res) setCorpusStatus(res.message);
                }}
                disabled={loading || !corpusFile}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl transition-all"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <span>Upload & Index Statute</span>}
              </button>

              {corpusStatus && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs font-mono">
                  {corpusStatus}
                </div>
              )}
            </div>

            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Grounded Legal Research Assistant</h2>
                <p className="text-sm text-slate-400">Ask questions backed strictly by your indexed statute library.</p>
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={researchQuery}
                  onChange={(e) => setResearchQuery(e.target.value)}
                  placeholder="e.g., What are the penalties for breach of confidentiality under the act?"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={async () => {
                    const res = await handleApiCall('/research/query', 'POST', { question: researchQuery, top_k: 3 });
                    if (res) setResearchResult(res);
                  }}
                  disabled={loading || !researchQuery}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-6 py-3 rounded-xl transition-all flex items-center space-x-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Search Law</span>}
                </button>
              </div>

              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-6 overflow-y-auto max-h-[500px] flex flex-col justify-between">
                {researchResult ? (
                  <div className="space-y-6">
                    <div>
                      <span className="text-xs text-indigo-400 uppercase tracking-wider block mb-1">Answer</span>
                      <p className="text-sm text-slate-200 leading-relaxed bg-slate-900 p-4 rounded-xl border border-slate-800">
                        {researchResult.answer}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs text-amber-400 uppercase tracking-wider block mb-2">Verified Citations</span>
                      <div className="flex flex-wrap gap-2">
                        {researchResult.citations.map((cite, i) => (
                          <span key={i} className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-3 py-1.5 rounded-full font-mono">
                            📄 {cite}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 py-20 text-center">
                    <BookOpen className="w-12 h-12 mb-3 stroke-1" />
                    <p>Index documents and ask questions to view grounded citations.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}