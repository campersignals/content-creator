#!/bin/bash

# Content Gen App - Setup Script

echo "--- Starting Setup ---"

# 1. Check/Install Docker
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    echo "Docker installed."
else
    echo "Docker is already installed."
fi

# 2. Check/Install Docker Compose
if ! docker compose version &> /dev/null; then
    echo "Docker Compose plugin missing. Trying to install..."
    sudo apt-get update && sudo apt-get install -y docker-compose-plugin
fi

# 3. Create .env file interactively if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    read -p "Enter Google API Key: " google_key
    read -p "Enter OpenAI API Key: " openai_key
    
    echo "GOOGLE_API_KEY=$google_key" > .env
    echo "OPENAI_API_KEY=$openai_key" >> .env
    echo "DATABASE_URL=postgresql://postgres:password@db:5432/contentgen" >> .env
    
    echo ".env file created."
else
    echo ".env file already exists. Skipping."
fi

# 4. Start Application
echo "Starting Application with Docker..."
docker compose up -d --build

echo "--- Setup Complete ---"
echo "App should be running on Port 3000."
