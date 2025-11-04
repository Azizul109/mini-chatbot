#!/bin/bash

# fastapi-ingestion/start.sh

echo "Starting FastAPI Ingestion Service..."

# Check if virtual environment exists, if not create it
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install requirements
echo "Installing dependencies..."
pip install -r requirements.txt

# Start the FastAPI server
echo "Starting FastAPI server on port 8001..."
cd app
uvicorn main:app --reload --host 0.0.0.0 --port 8001