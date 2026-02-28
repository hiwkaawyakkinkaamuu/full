# Use official Node.js image as the base
FROM node:20-alpine AS builder
ARG API_URL
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
ENV NEXT_PUBLIC_API_URL=uat-youth-team.local
RUN npm run build

# Use a minimal image for running
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start"]
