# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy only package files first for better caching
COPY package*.json ./

# Install dependencies (production only, no dev tools in final image)
RUN npm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

CMD ["npm", "run", "start"]