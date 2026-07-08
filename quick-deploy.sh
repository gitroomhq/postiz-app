#!/bin/bash
# Quick Postiz Deployment Script
# Builds custom image (with throttler + automation fixes) and deploys to K8s.
# Run from the postiz-app directory: ./quick-deploy.sh

set -e

if [ ! -f "Dockerfile.dev" ]; then
  echo "Error: Must run from postiz-app directory"
  exit 1
fi

export AWS_ACCOUNT_ID=970547373533
export AWS_REGION=us-east-1
export REPOSITORY_URI=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/intelliverse-postiz

GIT_SHA=$(git rev-parse --short HEAD)
TAG="${GIT_SHA}-custom"

echo "Postiz Deployment (tag: ${TAG})"
echo "================================"

echo "Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

echo "Building + pushing multi-arch Postiz image (linux/amd64, linux/arm64)..."
# The EKS cluster has both arm64 (Graviton) and amd64 nodes and the postiz
# deployment has no arch pinning, so pods can land on either. A single-arch
# image fails to pull on the other arch ("no match for platform in manifest").
# Build a multi-arch manifest list with buildx and push in one step.
# --provenance/--sbom disabled so the manifest list stays clean (no
# unknown/unknown attestation entries that older containerd chokes on).
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --provenance=false \
  --sbom=false \
  --build-arg NEXT_PUBLIC_VERSION="${TAG}" \
  -t ${REPOSITORY_URI}:${TAG} \
  -t ${REPOSITORY_URI}:latest \
  -f Dockerfile.dev \
  --push .

echo "Updating Kubernetes deployment..."
aws eks update-kubeconfig --name ai-cart-auto-cluster --region $AWS_REGION
kubectl set image deployment/intelliverse-postiz \
  intelliverse-postiz=${REPOSITORY_URI}:${TAG} \
  -n aicart
kubectl rollout restart deployment/intelliverse-postiz -n aicart

echo "Waiting for rollout..."
kubectl rollout status deployment/intelliverse-postiz -n aicart --timeout=10m

echo "Postiz deployment complete!"
echo "Image: ${REPOSITORY_URI}:${TAG}"
