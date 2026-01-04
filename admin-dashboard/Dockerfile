FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "server.js"]
