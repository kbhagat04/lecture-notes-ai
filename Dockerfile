# Use Node.js LTS version
FROM node:slim

# Create app directory
WORKDIR /usr/src/app

# Install debugging tools
RUN apk add --no-cache bash curl

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Verify build directories and content
RUN echo "Listing workspace files:" && \
    ls -la && \
    echo "Checking build directory:" && \
    if [ -d "build" ]; then ls -la build; else echo "build directory not found"; fi && \
    echo "Checking dist directory:" && \
    if [ -d "dist" ]; then ls -la dist; else echo "dist directory not found"; fi

# Create a healthcheck script
RUN echo '#!/bin/bash\ncurl -f http://localhost:$PORT/api/health || exit 1' > /usr/src/app/healthcheck.sh && \
    chmod +x /usr/src/app/healthcheck.sh

# Set production environment
ENV NODE_ENV=production

# Use PORT environment variable with fallback to 5002
ENV PORT=5002

# Expose the port from the environment variable
EXPOSE $PORT

# Healthcheck to verify the application is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD /usr/src/app/healthcheck.sh

# Command to run the application with proper error handling
CMD ["node", "dist/server/index.js"]