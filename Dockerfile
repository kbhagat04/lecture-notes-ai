# Use Node.js LTS version
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Set production environment
ENV NODE_ENV=production

# Use PORT environment variable with fallback to 5002
ENV PORT=5002

# Expose the port from the environment variable
EXPOSE $PORT

# Command to run the application
CMD ["npm", "start"]