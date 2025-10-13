#!/bin/bash

# Set your Google Cloud project ID
PROJECT_ID="your-project-id"
SERVICE_NAME="vocalyx-backend"
REGION="us-central1"

# Build and push the container image
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 10 \
    --set-env-vars DJANGO_SETTINGS_MODULE=backend.settings