# Build stage for client
FROM node:18-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --production

# Copy server code
COPY server/ ./server/

# Copy built client files
COPY --from=client-builder /app/client/dist ./client/dist

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "server/server.js"]