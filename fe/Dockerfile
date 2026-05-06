FROM node:25-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
EOF

RUN cat > /docker-entrypoint.d/99-env.sh <<'EOF'
#!/bin/sh
set -e
cat > /usr/share/nginx/html/env.js <<INNER
window.__ENV__ = { API_URL: "${API_URL}" };
INNER
EOF
RUN chmod +x /docker-entrypoint.d/99-env.sh

EXPOSE 80
