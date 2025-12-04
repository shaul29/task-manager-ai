#!/bin/bash

# Task Manager Backend Deployment Script
set -e

echo "🚀 Starting Task Manager Backend deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found! Please copy .env.example and configure it.${NC}"
    exit 1
fi

source .env

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose is not installed. Please install it first.${NC}"
    exit 1
fi

echo -e "${YELLOW}🔐 Authenticating with AWS ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ ECR authentication successful${NC}"
else
    echo -e "${RED}❌ ECR authentication failed${NC}"
    exit 1
fi

echo -e "${YELLOW}📥 Pulling latest images...${NC}"
docker-compose pull

echo -e "${YELLOW}🔄 Stopping existing services...${NC}"
docker-compose down

echo -e "${YELLOW}🚀 Starting services...${NC}"
docker-compose up -d

echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 15

echo -e "${YELLOW}📊 Checking service status...${NC}"
docker-compose ps

echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
docker-compose exec -T backend python manage.py migrate

echo -e "${YELLOW}📦 Collecting static files...${NC}"
docker-compose exec -T backend python manage.py collectstatic --noinput

echo -e "${YELLOW}🤖 Pulling Ollama model (if not already present)...${NC}"
docker-compose exec -T ollama ollama pull $OLLAMA_MODEL || echo -e "${YELLOW}⚠️  Model pull might take a while on first run${NC}"

echo -e "${YELLOW}📋 Service logs (last 30 lines):${NC}"
docker-compose logs --tail=30

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deployment Information${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🌐 API URL:${NC} https://api.lulifyinsight.com"
echo -e "${GREEN}🔧 Traefik Dashboard:${NC} https://traefik.lulifyinsight.com"
echo -e "${GREEN}🤖 Ollama Model:${NC} $OLLAMA_MODEL"
echo ""
echo -e "${YELLOW}🔧 Useful commands:${NC}"
echo "  View logs:           docker-compose logs -f"
echo "  View backend logs:   docker-compose logs -f backend"
echo "  Restart backend:     docker-compose restart backend"
echo "  Restart all:         docker-compose restart"
echo "  Stop all:            docker-compose down"
echo "  Status:              docker-compose ps"
echo "  Execute Django cmd:  docker-compose exec backend python manage.py <command>"
echo "  Access Ollama:       docker-compose exec ollama ollama list"
echo ""
echo -e "${YELLOW}📝 Health checks:${NC}"
echo "  Backend API:  curl https://api.lulifyinsight.com/api/health/"
echo "  Database:     docker-compose exec postgres pg_isready"
echo "  Ollama:       docker-compose exec ollama ollama list"
