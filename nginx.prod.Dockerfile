# Stage 1: Build the React Frontend
FROM node:20-alpine as build
WORKDIR /app

# Install dependencies first for better caching
COPY frontend/package*.json ./
RUN npm install

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup Nginx
FROM nginx:alpine

# Copy custom Nginx configuration
COPY backend/docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built frontend assets from the build stage
COPY --from=build /app/dist /var/www/frontend/dist

# The Laravel public folder will be mapped via volumes in docker-compose.prod.yml
