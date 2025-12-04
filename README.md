# Task Manager with AI Assistant

AI-powered task management with automatic classification and subtask generation using **self-hosted open-source LLMs**.

## Features

- **Task Management**: Create, update, delete tasks with rich descriptions
- **AI Classification**: Automatic categorization (personal/work/urgent) and priority assignment
- **Smart Subtasks**: AI breaks down complex tasks into actionable steps
- **Authentication**: Secure login via AWS Cognito
- **Real-time Updates**: Optimistic UI with TanStack Query

## Tech Stack

**Backend:** Django REST Framework • PostgreSQL • Langchain • Ollama (Llama 3.2)
**Frontend:** React 18 • Vite • TanStack Query • AWS Cognito
**Infrastructure:** Docker • Traefik • AWS (EC2, S3, CloudFront, Route53)

## Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd task-manager-prueba
chmod +x quick-start.sh

# Development
./quick-start.sh dev

# Access:
# - Frontend: http://localhost:5173
# - API: http://localhost:8000
# - Ollama WebUI: http://localhost:3000
```

### Manual Setup

```bash
# Start services
docker compose -f docker-compose.dev.yml up -d

# Initialize database
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser

# Start frontend
cd frontend && npm install && npm run dev
```

## Deployment

See detailed guides:
- **[Backend Deployment](./deployment/README.md)** - EC2 + Docker + Traefik
- **[Frontend Deployment](./frontend-deployment/README.md)** - S3 + CloudFront
- **[Ollama Setup](./OLLAMA-SETUP.md)** - LLM configuration

Quick production deploy:
```bash
./quick-start.sh prod
```

## Configuration

### Ollama Models

| Model | Size | RAM | Speed | Quality | Use Case |
|-------|------|-----|-------|---------|----------|
| **llama3.2:3b** | 2GB | 4GB | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ | **Recommended** |
| llama3.2:1b | 1.3GB | 2GB | ⚡⚡⚡⚡⚡ | ⭐⭐⭐ | Fast testing |
| mistral:7b | 4.1GB | 8GB | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | Best quality |

Change model in `.env`:
```bash
OLLAMA_MODEL=llama3.2:3b
```

### Environment Variables

**Backend** (`.env`):
```bash
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:pass@postgres:5432/taskmanager
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=xxxxxxxxx
OLLAMA_MODEL=llama3.2:3b
```

**Frontend** (`frontend/.env`):
```bash
VITE_API_URL=http://localhost:8000
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxx
```

## API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/tasks/
POST   /api/tasks/
GET    /api/tasks/{id}/
PUT    /api/tasks/{id}/
DELETE /api/tasks/{id}/
POST   /api/tasks/{id}/ai-analyze/
GET    /api/subtasks/
POST   /api/subtasks/
```

## Testing

```bash
# Backend
cd backend && pytest --cov

# Frontend
cd frontend && npm run test
```

## Project Structure

```
task-manager-prueba/
├── backend/              # Django REST API
│   ├── tasks/           # Task app
│   └── ai_agent/        # AI integration
├── frontend/            # React app
│   └── src/
├── deployment/          # Production docker-compose
├── frontend-deployment/ # S3/CloudFront config
├── docker-compose.dev.yml
└── quick-start.sh
```

## License

MIT
