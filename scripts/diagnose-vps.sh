#!/bin/bash

echo "--- VPS Diagnostic Tool v2 ---"
echo "Date: $(date)"

# 1. Check Docker Status
echo -e "\n1. Checking Docker Status..."
if command -v docker &> /dev/null; then
    docker --version
    docker compose version
else
    echo "CRITICAL: Docker is not installed or not in PATH."
fi

# 2. Check Running Containers
echo -e "\n2. Running Containers:"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Detect DB Container Name
DB_CONTAINER=$(docker ps -q -f name=db | head -n 1)
if [ -z "$DB_CONTAINER" ]; then
    DB_CONTAINER=$(docker ps -a --filter "name=db" --format "{{.Names}}" | head -n 1)
fi

echo -e "\n3. Detected DB Container ID/Name: $DB_CONTAINER"

# 4. Check for Restart Loops (Logs)
echo -e "\n4. App Logs (Last 50 lines):"
# Try docker compose logs first as it handles service names
if docker compose ps > /dev/null 2>&1; then
    docker compose logs --tail 50 content-gen-app
else
    docker logs --tail 50 content-gen-app
fi

echo -e "\n5. Database Logs (Last 50 lines):"
if docker compose ps > /dev/null 2>&1; then
    docker compose logs --tail 50 db
elif [ ! -z "$DB_CONTAINER" ]; then
    docker logs --tail 50 $DB_CONTAINER
else
    echo "❌ Could not find DB container to retrieve logs."
fi

# 6. Check Volume
echo -e "\n6. Docker Volumes:"
docker volume ls

echo -e "\n--- Diagnostic Complete ---"
echo "Please copy the output above and share it with the developer."
