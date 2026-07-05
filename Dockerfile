# ==========================================
# Stage 1: Build Spring Boot Backend
# ==========================================
FROM maven:3.9.6-eclipse-temurin-21 AS backend-build
WORKDIR /app/backend
COPY apps/api/pom.xml .
COPY apps/api/src ./src
RUN mvn clean package -DskipTests

# ==========================================
# Stage 2: Build Next.js Frontend
# ==========================================
FROM node:20-alpine AS frontend-build
WORKDIR /app

# Enable Corepack and pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all code
COPY . .

# Install dependencies and build frontend
RUN pnpm install
RUN pnpm --filter web build

# ==========================================
# Stage 3: Final Runner Image
# ==========================================
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Install Node.js
RUN apk add --no-cache nodejs npm

# Copy built Spring Boot JAR
COPY --from=backend-build /app/backend/target/*.jar /app/backend.jar

# Copy Next.js standalone build
# The standalone output creates a self-contained folder at apps/web/.next/standalone
COPY --from=frontend-build /app/apps/web/.next/standalone ./web/
COPY --from=frontend-build /app/apps/web/.next/static ./web/apps/web/.next/static
COPY --from=frontend-build /app/apps/web/public ./web/apps/web/public

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# HF Spaces requires exposing port 7860
EXPOSE 7860

# Start both services
CMD ["/app/start.sh"]