import os
import json
import io
import traceback
import pypdf
import chromadb
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from groq import Groq
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()


app = FastAPI(
    title="Legal Service Assistant AI",
    version="1.5",
    description="Backend API for Legal Auditing, Redlining, Document Comparison, and RAG Research"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- Initialize Local ChromaDB (Persistent on disk, Zero Docker) ---
chroma_client = chromadb.PersistentClient(path="./chroma_legal_db")
# Using Chroma's default embedding function (runs locally via ONNX/sentence-transformers)
legal_collection = chroma_client.get_or_create_collection(name="legal_research_corpus")

# --- Schemas ---
class ContractInput(BaseModel):
    contract_text: str = Field(..., description="The raw text of the contract or legal agreement to audit.")

class RiskAuditResponse(BaseModel):
    risk_level: str
    risk_score: int
    executive_summary: str
    high_risk_clauses: list[str]
    missing_protections: list[str]
    metadata_extracted: dict
    disclaimer: str

class RedlineInput(BaseModel):
    clause_text: str = Field(..., description="The risky or unfavorable clause text you want to rewrite.")
    stance: str = Field("Neutral", description="Negotiation stance: Pro-Client, Pro-Vendor, or Neutral.")
    objective: str = Field("Balance risk and ensure market-standard terms.", description="What you want to fix or achieve.")

class RedlineResponse(BaseModel):
    original_clause: str
    redlined_clause: str
    legal_rationale: str
    negotiation_tip: str
    disclaimer: str

class DocumentCompareInput(BaseModel):
    original_text: str = Field(..., description="The original contract or template text.")
    revised_text: str = Field(..., description="The revised contract or counter-proposal text.")

class DocumentCompareResponse(BaseModel):
    summary_of_changes: str
    added_clauses: list[str]
    removed_clauses: list[str]
    modified_clauses: list[dict]
    risk_shift: str
    disclaimer: str

class ResearchQueryInput(BaseModel):
    question: str = Field(..., description="Legal research question regarding statutes, acts, or uploaded case files.")
    top_k: int = Field(3, description="Number of relevant document chunks to retrieve for context.")

class ResearchQueryResponse(BaseModel):
    question: str
    answer: str
    citations: list[str]
    disclaimer: str

# --- Helper Functions ---
def run_groq_audit(contract_text: str) -> dict:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is missing.")
    client = Groq(api_key=api_key)

    system_prompt = (
        "You are an expert corporate legal auditor. Analyze the provided contract text rigorously. "
        "Output your response strictly as valid JSON with keys: "
        "'risk_level', 'risk_score', 'executive_summary', 'high_risk_clauses', 'missing_protections', 'metadata_extracted'. "
        "Do not include markdown code blocks like ```json."
    )
    completion = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Contract Text:\n{contract_text}"}
        ],
        temperature=0.1, max_tokens=2000, response_format={"type": "json_object"}
    )
    result = json.loads(completion.choices[0].message.content)
    result["disclaimer"] = "Disclaimer: This AI audit report is for informational purposes only and does not constitute formal legal advice."
    return result

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150) -> list[str]:
    """Splits large legal text into overlapping chunks for precise vector search."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

# --- Endpoints ---
@app.post("/api/v1/audit/contract", response_model=RiskAuditResponse)
async def audit_contract(data: ContractInput):
    try:
        return run_groq_audit(data.contract_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/audit/contract-pdf", response_model=RiskAuditResponse)
async def audit_contract_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        contents = await file.read()
        reader = pypdf.PdfReader(io.BytesIO(contents))
        extracted_text = "".join([page.extract_text() or "" for page in reader.pages])
        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="No readable text found in PDF.")
        return run_groq_audit(extracted_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/redline/clause", response_model=RedlineResponse)
async def redline_clause(data: RedlineInput):
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is missing.")
    client = Groq(api_key=api_key)

    system_prompt = (
        "You are an elite contract negotiator. Redline and rewrite a risky clause based on the stance and objective. "
        "Output strictly as valid JSON with keys: 'original_clause', 'redlined_clause', 'legal_rationale', 'negotiation_tip'. "
        "Do not use markdown code blocks."
    )
    user_content = f"Clause to Redline:\n{data.clause_text}\n\nStance: {data.stance}\nObjective: {data.objective}"
    
    completion = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_content}],
        temperature=0.2, max_tokens=1500, response_format={"type": "json_object"}
    )
    result = json.loads(completion.choices[0].message.content)
    result["original_clause"] = data.clause_text
    result["disclaimer"] = "Disclaimer: This AI redlining suggestion is for reference only and does not constitute legal advice."
    return result

@app.post("/api/v1/compare/documents", response_model=DocumentCompareResponse)
async def compare_documents(data: DocumentCompareInput):
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is missing.")
    client = Groq(api_key=api_key)

    system_prompt = (
        "Compare the Original Document against the Revised Document. Output strictly as valid JSON with keys: "
        "'summary_of_changes', 'added_clauses', 'removed_clauses', 'modified_clauses' (array of objects with 'clause_name', 'change_details', 'legal_impact'), 'risk_shift'. "
        "Do not use markdown code blocks."
    )
    user_content = f"ORIGINAL:\n{data.original_text}\n\nREVISED:\n{data.revised_text}"
    
    completion = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_content}],
        temperature=0.1, max_tokens=2500, response_format={"type": "json_object"}
    )
    result = json.loads(completion.choices[0].message.content)
    result["disclaimer"] = "Disclaimer: This AI comparison report is for reference only and does not constitute legal advice."
    return result

# --- RAG Research Endpoints ---
@app.post("/api/v1/research/upload-corpus")
async def upload_research_corpus(file: UploadFile = File(...)):
    """Uploads a statute PDF or legal act, chunks it, and indexes it into ChromaDB."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF statute/act files are supported.")
    try:
        contents = await file.read()
        reader = pypdf.PdfReader(io.BytesIO(contents))
        full_text = "".join([f"\n[Page {i+1}] {page.extract_text() or ''}" for i, page in enumerate(reader.pages)])
        
        if not full_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF.")
            
        chunks = chunk_text(full_text)
        
        # Generate unique IDs for chunks
        import uuid
        doc_id = str(uuid.uuid4())[:8]
        ids = [f"{file.filename}_{doc_id}_{i}" for i in range(len(chunks))]
        metadatas = [{"source_file": file.filename, "chunk_index": i} for i in range(len(chunks))]
        
        # Add to local ChromaDB collection
        legal_collection.add(
            documents=chunks,
            ids=ids,
            metadatas=metadatas
        )
        
        return {
            "status": "success",
            "filename": file.filename,
            "chunks_indexed": len(chunks),
            "message": f"Successfully indexed {file.filename} into local vector database."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/research/query", response_model=ResearchQueryResponse)
async def research_query(data: ResearchQueryInput):
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is missing.")
    
    # 1. Retrieve top matching chunks from ChromaDB
    search_results = legal_collection.query(
        query_texts=[data.question],
        n_results=data.top_k
    )
    
    retrieved_docs = search_results.get("documents", [[]])[0]
    retrieved_metas = search_results.get("metadatas", [[]])[0]
    
    if not retrieved_docs:
        raise HTTPException(status_code=404, detail="No relevant legal documents found in corpus. Please upload a statute or PDF first.")
        
    # Construct context string with citations
    context_block = ""
    citations = []
    for doc, meta in zip(retrieved_docs, retrieved_metas):
        source = meta.get("source_file", "Unknown Statute")
        context_block += f"\n--- Source: {source} ---\n{doc}\n"
        citations.append(source)

    client = Groq(api_key=api_key)

    system_prompt = (
        "You are an expert legal research assistant and corporate counsel. "
        "Answer the user's research question strictly and solely based on the provided legal corpus context. "
        "Cite the specific sources and sections mentioned in the context. "
        "If the answer cannot be found in the context, state that the uploaded corpus does not contain sufficient information."
    )

    user_content = f"Legal Context Excerpts:\n{context_block}\n\nResearch Question: {data.question}"

    try:
        completion = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.1,
            max_tokens=1500
        )

        answer = completion.choices[0].message.content
        
        return {
            "question": data.question,
            "answer": answer,
            "citations": list(set(citations)),
            "disclaimer": "Disclaimer: This AI research report is for informational reference only and does not constitute formal legal advice."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def health_check():
    return {"status": "online", "service": "Legal Service Assistant API is running (Docker-Free)"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)