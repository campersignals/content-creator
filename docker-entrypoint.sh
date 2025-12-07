#!/bin/sh
# Entrypoint script to run migrations before starting the app

echo "Running database migrations..."
echo "Running database migrations..."
# Wait for database to be ready
until prisma db push --skip-generate; do
  echo "Database is not ready yet - retrying in 2 seconds..."
  sleep 2
done

echo "Starting application..."
exec node server.js
