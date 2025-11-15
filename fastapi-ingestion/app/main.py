from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import chromadb
import os
import logging
from enum import Enum
import hashlib
import requests
import json

app = FastAPI(
    title="Ingestion Service",
    description="Document ingestion service for RAG chatbot",
    version="1.0.0"
)
logger = logging.getLogger(__name__)

class ModelProvider(str, Enum):
    OPENAI = "openai"
    OLLAMA = "ollama" 
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

MODEL_PROVIDER = os.getenv("MODEL_PROVIDER", "ollama")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")

os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)

chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)

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

def get_ollama_embeddings(texts: List[str], model: str = "nomic-embed-text") -> List[List[float]]:
    """Get embeddings using Ollama local models."""
    embeddings = []
    
    for text in texts:
        try:
            response = requests.post(
                f"{OLLAMA_BASE_URL}/api/embeddings",
                json={
                    "model": model,
                    "prompt": text
                },
                timeout=30
            )
            
            if response.status_code == 200:
                embedding_data = response.json()
                embeddings.append(embedding_data["embedding"])
                logger.debug(f"Successfully generated embedding for text of length {len(text)}")
            else:
                logger.warning(f"Ollama embedding failed with status {response.status_code}: {response.text}")
                embeddings.append(create_simple_embedding(text))
                
        except Exception as e:
            logger.error(f"Ollama embedding error: {e}")
            embeddings.append(create_simple_embedding(text))
    
    return embeddings

def create_simple_embedding(text: str) -> List[float]:
    """Create a simple embedding as fallback."""
    embedding = [0.0] * 384
    for i, char in enumerate(text[:384]):
        embedding[i] = (ord(char) % 100) / 100.0
    embedding[0] = min(len(text) / 1000.0, 1.0)
    return embedding

def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Get embeddings based on configured model provider."""
    try:
        if MODEL_PROVIDER == ModelProvider.OPENAI:
            import openai
            if not OPENAI_API_KEY:
                logger.warning("OPENAI_API_KEY not set, using Ollama embeddings")
                return get_ollama_embeddings(texts)
            
            response = openai.embeddings.create(
                model="text-embedding-3-small",
                input=texts
            )
            return [data.embedding for data in response.data]
        
        elif MODEL_PROVIDER == ModelProvider.OLLAMA:
            logger.info(f"Using Ollama for embeddings with {len(texts)} texts")
            return get_ollama_embeddings(texts)
        
        else: 
            logger.info("Using simple mock embeddings")
            return [create_simple_embedding(text) for text in texts]
    
    except Exception as e:
        logger.error(f"Embedding generation failed: {str(e)}")
        logger.info("Falling back to simple embeddings")
        return [create_simple_embedding(text) for text in texts]

@app.post("/ingest", response_model=IngestionResponse)
async def ingest_documents(request: IngestionRequest):
    try:
        collection_name = f"bot_{request.botId}"
        
        try:
            collection = chroma_client.get_collection(collection_name)
            logger.info(f"Using existing collection: {collection_name}")
        except Exception:
            collection = chroma_client.create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            logger.info(f"Created new collection: {collection_name}")
        
        all_chunks = []
        all_metadatas = []
        all_ids = []
        
        for doc_idx, document in enumerate(request.documents):
            chunks = chunk_text(document.text, request.chunkSize, request.overlap)
            logger.info(f"Document '{document.filename}' split into {len(chunks)} chunks")
            
            for chunk_idx, chunk in enumerate(chunks):
                all_chunks.append(chunk)
                all_metadatas.append({
                    "filename": document.filename,
                    "bot_id": request.botId,
                    "chunk_index": chunk_idx,
                    "document_index": doc_idx,
                    "chunk_size": len(chunk)
                })
                chunk_id = hashlib.md5(f"{document.filename}_{chunk_idx}_{request.botId}".encode()).hexdigest()
                all_ids.append(chunk_id)
        
        logger.info(f"Generating embeddings for {len(all_chunks)} chunks using {MODEL_PROVIDER}...")
        
        embeddings = get_embeddings(all_chunks)
        
        logger.info(f"Upserting {len(all_chunks)} chunks to Chroma...")
        collection.upsert(
            embeddings=embeddings,
            documents=all_chunks,
            metadatas=all_metadatas,
            ids=all_ids
        )
        
        logger.info(f"Successfully ingested {len(request.documents)} documents with {len(all_chunks)} chunks")
        
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
    ollama_status = "unknown"
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        ollama_status = "healthy" if response.status_code == 200 else "unhealthy"
    except:
        ollama_status = "unreachable"
    
    return {
        "status": "healthy", 
        "model_provider": MODEL_PROVIDER,
        "ollama_status": ollama_status,
        "service": "fastapi-ingestion"
    }

@app.get("/ollama/models")
async def get_ollama_models():
    """Endpoint to check available Ollama models."""
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": "Failed to fetch models"}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)