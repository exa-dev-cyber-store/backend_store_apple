FROM node:18-slim

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Compile TypeScript
RUN npm run build

# Expose port 3000 to match Kubernetes service & readiness probe
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/bin/www.js"]
