# ---------- Build stage ----------
FROM node:18-alpine AS build

WORKDIR /app

# 1) Install deps
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# 2) Copy app and build
COPY . .
RUN npm run build

# ---------- Nginx stage ----------
FROM nginx:stable-alpine

# Remove default config and use our own if you have one
RUN rm /etc/nginx/conf.d/default.conf || true
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html
# If CRA: use /app/build instead of /app/dist

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
