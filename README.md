# Mini Chatbot Builder (RAG)

A production-ready chatbot builder with RAG capabilities using NestJS GraphQL, FastAPI, Chroma, and MySQL.

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+
- MySQL 8.0+
- Ollama - for local LLM and embeddings
- ChromaDB - for vector storage
- FastAPI - for ingestion service
- NestJS - for GraphQL API

### 1. Database Setup

```bash
# Start MySQL and create database
mysql -u root -p
```

### 1. Project Setup

*** backend
* If local windows/linux have docker than run 'docker compose up' to setup
* For docker change mysql user and password based on your system 
* Go to ./nestjs-graphql-gateway and run 'npm install'
* Need to setup database manually then run 'npm run setup:db'
* Dowload Ollama from the website 'https://ollama.ai/'
* Download Ollama model like 'llama2:7b' or 'mistral:7b'. (I am using 'llama2:7b')
* Then after installing all dependency run 'ollama pull llama2:7b'
* Finally run 'npm run start:dev'

*** frontend
* If no docker than first go to ./fastapi-ingestion and 'python -m venv venv' to create virtual env
* After creating virtual env activate it 'source venv/bin/activate'
* After that run 'pip install -r requirements.txt'
* Dowload Ollama from the website 'https://ollama.ai/'
* Download Ollama model like 'llama2:7b' or 'mistral:7b'. (I am using 'llama2:7b')
* Then pull this 'ollama pull nomic-embed-text'
* Finally run 'uvicorn app.main:app --reload --port 8001'


## Test Code


```bash
# Check if workspace exists:

query {
  workspace(id: "workspace-1") {
    id
    name
    bots {
      id
      name
      modelProvider
    }
  }
}
```


```bash
# Check if bot exists:

query {
  bot(id: "bot-1") {
    id
    name
    modelProvider
    modelName
  }
}
```


```bash
# Ingest sample documents:

mutation {
  ingestDocuments(
    botId: "bot-1"
    input: [
      {
        filename: "return-policy.md"
        text: """
        Return Policy:
        - Returns are accepted within 30 days of purchase
        - Items must be in original condition with tags attached
        - Refunds are processed within 5-7 business days
        - Sale items are final and cannot be returned
        - Shipping costs are non-refundable
        """
      }
      {
        filename: "shipping-info.md"
        text: """
        Shipping Information:
        - Standard shipping: 3-5 business days
        - Express shipping: 1-2 business days
        - Free shipping on orders over $50
        - International shipping available to select countries
        - Tracking information provided for all orders
        """
      }
      {
        filename: "contact-info.md"
        text: """
        Contact Information:
        - Customer service: 1-800-123-4567
        - Email: support@company.com
        - Live chat: Available 9AM-6PM EST
        - Response time: Within 24 hours for emails
        - Office address: 123 Main St, City, State 12345
        """
      }
    ]
    chunkSize: 500
    overlap: 50
  ) {
    botId
    upsertedEmbeddings
    documents
  }
}
```


```bash
# Create a chat session:

mutation {
  createSession(botId: "bot-1") {
    id
    botId
    userId
    createdAt
  }
}
```


```bash
# Create a chat session:

mutation {
  createSession(botId: "bot-1") {
    id
    botId
    userId
    createdAt
  }
}
```


```bash
# Sample question:

mutation {
  chat(input: {
    sessionId: "cmhkyfjov0001sfa8jqxyq28v",
    message: "What is your customer service number?",
    topK: 3
  }) {
    answer
    tokensUsed
    citations {
      filename
      score
    }
  }
}
```