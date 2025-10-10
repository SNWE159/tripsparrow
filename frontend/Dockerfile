FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy source code including .env.local
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]