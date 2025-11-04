# Mini Chatbot Builder (RAG)

A production-ready chatbot builder with RAG capabilities using NestJS GraphQL, FastAPI, Chroma, and MySQL.

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+
- MySQL 8.0+

### 1. Database Setup

```bash
# Start MySQL and create database
mysql -u root -p

# In MySQL console:
CREATE DATABASE chatbot;
CREATE USER 'chatbot_user'@'localhost' IDENTIFIED BY 'chatbot_pass';
GRANT ALL PRIVILEGES ON chatbot.* TO 'chatbot_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```
