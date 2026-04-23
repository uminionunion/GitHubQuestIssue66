# ============================================================================
# DOCKERFILE - Instructions for building the application container
# ============================================================================

# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files from backend
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy all backend code
COPY backend/ ./

# Create database directory
RUN mkdir -p database

# Expose port 5000 (backend will run here)
EXPOSE 5000

# Health check to verify container is working
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the backend server
CMD ["npm", "start"]
