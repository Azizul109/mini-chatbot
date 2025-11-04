# fastapi-ingestion/app/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import chromadb
import os
import logging
from enum import Enum
import hashlib
import numpy as np

app = FastAPI(
    title="Ingestion Service",
    description="Document ingestion service for RAG chatbot",
    version="1.0.0"
)
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

# Create chroma data directory if it doesn't exist
os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)

# Initialize Chroma with persistence
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

def simple_text_embedding(text: str) -> List[float]:
    """Create a simple embedding based on character frequencies."""
    # Create a simple 384-dimensional embedding
    embedding = [0.0] * 384
    
    # Use character distribution to create a deterministic embedding
    for i, char in enumerate(text[:384]):  # Use first 384 characters
        embedding[i] = (ord(char) % 100) / 100.0  # Normalize to 0-1
    
    # Add some document-level features
    text_length = len(text)
    embedding[0] = min(text_length / 1000.0, 1.0)  # Normalized length
    
    return embedding

def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Get embeddings based on configured model provider."""
    try:
        if MODEL_PROVIDER == ModelProvider.OPENAI:
            import openai
            if not OPENAI_API_KEY:
                logger.warning("OPENAI_API_KEY not set, using mock embeddings")
                return [simple_text_embedding(text) for text in texts]
            
            response = openai.embeddings.create(
                model="text-embedding-3-small",
                input=texts
            )
            return [data.embedding for data in response.data]
        
        elif MODEL_PROVIDER == ModelProvider.LLAMA:
            # For Llama, use simple embeddings for now
            logger.info("Using simple embeddings for Llama provider")
            return [simple_text_embedding(text) for text in texts]
        
        else:  # Mock embeddings
            logger.info("Using simple mock embeddings")
            return [simple_text_embedding(text) for text in texts]
    
    except Exception as e:
        logger.error(f"Embedding generation failed: {str(e)}")
        logger.info("Falling back to simple embeddings")
        # Return simple embeddings as fallback
        return [simple_text_embedding(text) for text in texts]

@app.post("/ingest", response_model=IngestionResponse)
async def ingest_documents(request: IngestionRequest):
    try:
        collection_name = f"bot_{request.botId}"
        
        # Get or create collection
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
                # Generate unique ID
                chunk_id = hashlib.md5(f"{document.filename}_{chunk_idx}_{request.botId}".encode()).hexdigest()
                all_ids.append(chunk_id)
        
        logger.info(f"Generating embeddings for {len(all_chunks)} chunks...")
        # Get embeddings
        embeddings = get_embeddings(all_chunks)
        
        # Upsert to Chroma
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
    return {
        "status": "healthy", 
        "model_provider": MODEL_PROVIDER,
        "service": "fastapi-ingestion",
        "chroma_persist_dir": CHROMA_PERSIST_DIR
    }

@app.get("/")
async def root():
    return {
        "message": "FastAPI Ingestion Service is running",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)