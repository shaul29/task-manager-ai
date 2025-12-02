#!/bin/bash
# Quick Start Script for Task Manager with Ollama
# Usage: ./quick-start.sh [dev|prod]

set -e  # Exit on error

MODE="${1:-dev}"
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.2:3b}"

echo "================================================"
echo "Task Manager AI - Quick Start"
echo "================================================"
echo "Mode: $MODE"
echo "Ollama Model: $OLLAMA_MODEL"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check dependencies
echo "Checking dependencies..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Install from: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Install from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker installed${NC}"
echo -e "${GREEN}✓ Docker Compose installed${NC}"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp .env.example .env

    # Generate Django secret key
    SECRET_KEY=$(openssl rand -base64 50 | tr -d '\n')

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=$SECRET_KEY|" .env
        sed -i '' "s|OLLAMA_MODEL=.*|OLLAMA_MODEL=$OLLAMA_MODEL|" .env
    else
        # Linux
        sed -i "s|DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=$SECRET_KEY|" .env
        sed -i "s|OLLAMA_MODEL=.*|OLLAMA_MODEL=$OLLAMA_MODEL|" .env
    fi

    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}⚠ Please edit .env file with your domain and credentials${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Select compose file
if [ "$MODE" = "prod" ]; then
    COMPOSE_FILE="docker-compose.yml"
    echo ""
    echo -e "${YELLOW}Production mode selected${NC}"
    echo "Make sure you have configured:"
    echo "  - Domain names in .env"
    echo "  - Database password"
    echo "  - Cognito credentials"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
else
    COMPOSE_FILE="docker-compose.dev.yml"
    echo ""
    echo -e "${GREEN}Development mode selected${NC}"
fi

# Note: Ollama model will be pulled automatically by docker-compose
echo ""
echo -e "${YELLOW}Note: The Ollama model ($OLLAMA_MODEL) will be automatically downloaded${NC}"
echo "when docker-compose starts. This takes ~5-10 minutes on first run."
echo ""

# Start services
echo ""
echo "Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

echo ""
echo "Waiting for services to be healthy..."
sleep 5

# Wait for database
echo "Waiting for PostgreSQL..."
MAX_TRIES=30
COUNT=0
until docker compose -f "$COMPOSE_FILE" exec -T db pg_isready -U taskuser &> /dev/null; do
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge $MAX_TRIES ]; then
        echo -e "${RED}Error: PostgreSQL did not start${NC}"
        docker compose -f "$COMPOSE_FILE" logs db
        exit 1
    fi
    echo -n "."
    sleep 2
done
echo -e "${GREEN}✓ PostgreSQL ready${NC}"

# Wait for Ollama
echo "Waiting for Ollama (this may take 5-10 minutes on first run)..."
MAX_TRIES=120
COUNT=0
until docker compose -f "$COMPOSE_FILE" exec -T ollama ollama list &> /dev/null; do
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge $MAX_TRIES ]; then
        echo -e "${RED}Error: Ollama did not start${NC}"
        docker compose -f "$COMPOSE_FILE" logs ollama
        exit 1
    fi
    echo -n "."
    sleep 5
done
echo -e "${GREEN}✓ Ollama ready${NC}"

# Run migrations
echo ""
echo "Running database migrations..."
docker compose -f "$COMPOSE_FILE" exec -T backend python manage.py migrate

echo ""
echo "Collecting static files..."
docker compose -f "$COMPOSE_FILE" exec -T backend python manage.py collectstatic --noinput

# Create superuser (only in dev mode)
if [ "$MODE" = "dev" ]; then
    echo ""
    echo -e "${YELLOW}Create Django superuser${NC}"
    read -p "Create superuser now? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker compose -f "$COMPOSE_FILE" exec backend python manage.py createsuperuser
    fi
fi

# Display status
echo ""
echo "================================================"
echo -e "${GREEN}✓ Task Manager AI is running!${NC}"
echo "================================================"
echo ""
docker compose -f "$COMPOSE_FILE" ps
echo ""

# Display URLs
if [ "$MODE" = "dev" ]; then
    echo "Access your application:"
    echo "  Backend API:    http://localhost:8000"
    echo "  Django Admin:   http://localhost:8000/admin"
    echo "  Ollama WebUI:   http://localhost:3000"
    echo "  PostgreSQL:     localhost:5432"
    echo ""
    echo "Next steps:"
    echo "  1. Start frontend: cd frontend && npm install && npm run dev"
    echo "  2. Access frontend at: http://localhost:5173"
    echo "  3. View logs: docker compose -f $COMPOSE_FILE logs -f"
else
    echo "Access your application:"
    echo "  Frontend:       https://app.${API_DOMAIN}"
    echo "  Backend API:    https://${API_DOMAIN}"
    echo "  Django Admin:   https://${API_DOMAIN}/admin"
    echo "  Ollama WebUI:   https://${OLLAMA_UI_DOMAIN}"
    echo "  Traefik:        http://$(curl -s ifconfig.me):8080"
    echo ""
    echo "Next steps:"
    echo "  1. Deploy frontend to S3"
    echo "  2. Configure Cognito"
    echo "  3. Test the full flow"
    echo "  4. View logs: docker compose logs -f"
fi

echo ""
echo "Useful commands:"
echo "  View logs:      docker compose -f $COMPOSE_FILE logs -f"
echo "  Stop:           docker compose -f $COMPOSE_FILE down"
echo "  Restart:        docker compose -f $COMPOSE_FILE restart"
echo "  Django shell:   docker compose -f $COMPOSE_FILE exec backend python manage.py shell"
echo ""

# Test AI agent
echo -e "${YELLOW}Test AI agent?${NC}"
read -p "Run AI test? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Testing AI agent..."
    docker compose -f "$COMPOSE_FILE" exec backend python -c "
from ai_agent.agent import TaskAIAgent
import json

agent = TaskAIAgent()
result = agent.classify_task(
    'Prepare presentation',
    'Create slides for Monday team meeting'
)
print('AI Classification Result:')
print(json.dumps(result, indent=2))
"
fi

echo ""
echo -e "${GREEN}Setup complete! 🎉${NC}"
