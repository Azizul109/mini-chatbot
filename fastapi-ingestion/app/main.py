# fastapi-ingestion/app/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import chromadb
import os
import logging
from enum import Enum
from sentence_transformers import SentenceTransformer
import hashlib

app = FastAPI(title="Ingestion Service")
logger = logging.getLogger(__name__)

class ModelProvider(str, Enum):
    OPENAI = "openai"
    LLAMA = "llama"
    MOCK = "mock"

class DocumentInput(BaseModel):
    filename: str
    text: str

class IngestionRequest(BaseModel):
    botId: str
    documents: List[DocumentInput]
    chunkSize: Optional[int] = 600
    overlap: Optional[int] = 80

class IngestionResponse(BaseModel):
    botId: str
    upsertedEmbeddings: int
    documents: int

# Configuration
MODEL_PROVIDER = os.getenv("MODEL_PROVIDER", "mock")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")

# Initialize Chroma with persistence
chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)

# Initialize embedding model
embedding_model = None
if MODEL_PROVIDER == "mock":
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

def chunk_text(text: str, chunk_size: int, overlap: int) -> List[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
        
        if end >= len(text):
            break
    
    return chunks

def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Get embeddings based on configured model provider."""
    try:
        if MODEL_PROVIDER == ModelProvider.OPENAI:
            import openai
            openai.api_key = OPENAI_API_KEY
            
            response = openai.embeddings.create(
                model="text-embedding-3-small",
                input=texts
            )
            return [data.embedding for data in response.data]
        
        elif MODEL_PROVIDER == ModelProvider.LLAMA:
            # For Llama, you would use a local Llama model
            # This is a placeholder implementation
            if embedding_model:
                return embedding_model.encode(texts).tolist()
            return [[0.1] * 384 for _ in texts]
        
        else:  # Mock embeddings with local model
            if embedding_model:
                return embedding_model.encode(texts).tolist()
            return [[0.1] * 384 for _ in texts]
    
    except Exception as e:
        logger.error(f"Embedding generation failed: {str(e)}")
        return [[0.1] * 384 for _ in texts]

@app.post("/ingest", response_model=IngestionResponse)
async def ingest_documents(request: IngestionRequest):
    try:
        collection_name = f"bot_{request.botId}"
        
        # Get or create collection
        try:
            collection = chroma_client.get_collection(collection_name)
        except Exception:
            collection = chroma_client.create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}
            )
        
        all_chunks = []
        all_metadatas = []
        all_ids = []
        
        for doc_idx, document in enumerate(request.documents):
            chunks = chunk_text(document.text, request.chunkSize, request.overlap)
            
            for chunk_idx, chunk in enumerate(chunks):
                all_chunks.append(chunk)
                all_metadatas.append({
                    "filename": document.filename,
                    "bot_id": request.botId,
                    "chunk_index": chunk_idx,
                    "document_index": doc_idx
                })
                # Generate unique ID
                chunk_id = hashlib.md5(f"{document.filename}_{chunk_idx}".encode()).hexdigest()
                all_ids.append(chunk_id)
        
        # Get embeddings
        embeddings = get_embeddings(all_chunks)
        
        # Upsert to Chroma
        collection.upsert(
            embeddings=embeddings,
            documents=all_chunks,
            metadatas=all_metadatas,
            ids=all_ids
        )
        
        return IngestionResponse(
            botId=request.botId,
            upsertedEmbeddings=len(all_chunks),
            documents=len(request.documents)
        )
        
    except Exception as e:
        logger.error(f"Ingestion failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_provider": MODEL_PROVIDER}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)