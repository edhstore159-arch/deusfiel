# Docker Setup for Escritório Kênia

This guide explains how to run the Escritório Kênia application using Docker and Docker Compose.

## Prerequisites

- Docker (version 20.10+)
- Docker Compose (version 1.29+)
- A `.env` file with required environment variables (see `.env.example`)

## Project Structure

```
escritorio-kenia/
├── Dockerfile              # Frontend (Vite + React)
├── backend/Dockerfile      # Backend (Express + Baileys)
├── docker-compose.yml      # Docker Compose orchestration
├── server.js              # Static file server for frontend
├── backend/server.js      # Express backend
├── package.json           # Frontend dependencies
├── backend/package.json   # Backend dependencies
└── src/                   # Frontend React source code
```

## Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-key
VITE_SUPABASE_PROJECT_ID=your-project-id
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Maps
VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY=your-google-maps-key

# Backend URL (for frontend to communicate with backend)
VITE_BACKEND_URL=http://localhost:3000

# Environment
NODE_ENV=production
```

## Running with Docker Compose

### Quick Start

```bash
cd ~/Development/escritorio-kenia

# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Build Images Locally

```bash
# Build both frontend and backend images
docker-compose build

# Build with no cache (clean build)
docker-compose build --no-cache

# Build only frontend
docker-compose build frontend

# Build only backend
docker-compose build backend
```

### View Running Containers

```bash
# List all running containers
docker-compose ps

# View container logs
docker-compose logs frontend
docker-compose logs backend

# Follow logs in real-time
docker-compose logs -f backend
```

## Accessing the Application

Once the services are running:

- **Frontend**: http://localhost:4173
- **Backend API**: http://localhost:3000

## Development Mode

For development with live code reloading, uncomment the volume mount in `docker-compose.yml`:

```yaml
volumes:
  - ./backend:/app/backend
```

Then restart the backend service:

```bash
docker-compose up -d backend
```

## Stopping and Cleaning Up

```bash
# Stop all services (containers persist)
docker-compose stop

# Stop and remove all containers
docker-compose down

# Stop, remove containers, and delete volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all
```

## Troubleshooting

### Port Already in Use

If port 4173 or 3000 is already in use, modify the `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "8080:4173"  # Map to different host port
  backend:
    ports:
      - "8000:3000"  # Map to different host port
```

### Container Fails to Start

Check the logs:

```bash
docker-compose logs backend
docker-compose logs frontend
```

### WhatsApp Auth State Issues

The backend persists WhatsApp authentication state in a named volume. To reset it:

```bash
# Remove the volume
docker volume rm escritorio-kenia_kenia_whatsapp_auth

# Restart the container
docker-compose down
docker-compose up -d
```

### Build Failures

Clear the build cache and rebuild:

```bash
docker-compose down
docker image prune -a
docker-compose build --no-cache
docker-compose up
```

## Production Deployment

For production deployment to services like Render, Docker Hub, or AWS:

1. Build and tag images:
   ```bash
   docker build -t your-registry/kenia-frontend:latest .
   docker build -t your-registry/kenia-backend:latest backend/
   ```

2. Push to registry:
   ```bash
   docker push your-registry/kenia-frontend:latest
   docker push your-registry/kenia-backend:latest
   ```

3. Deploy the images to your hosting platform.

## Health Checks

Both services include health checks:

- **Frontend**: HTTP GET to `/`
- **Backend**: HTTP GET to `/health`

Check health status:

```bash
docker-compose ps
```

The `STATUS` column will show `healthy` or `unhealthy`.

## Network Communication

Both services communicate over the `kenia-network` Docker network:

- Frontend can reach backend via: `http://backend:3000`
- Backend can reach frontend via: `http://frontend:4173`

The frontend's `VITE_BACKEND_URL` env var controls where the frontend JavaScript code connects to the backend.

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Vite Documentation](https://vitejs.dev/)
- [Express Documentation](https://expressjs.com/)
- [Baileys Documentation](https://github.com/WhiskeySockets/Baileys)
