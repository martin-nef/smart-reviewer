FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.31.9-alpine
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

# Run as the image's nginx user (101) instead of root: no master process as
# root, pid file and caches somewhere it can write, and the html dir writable
# for env.js. Binding port 80 unprivileged works because containerd (2.x) and
# Docker set net.ipv4.ip_unprivileged_port_start=0 in the container.
RUN sed -i -e '/^user /d' -e 's,^pid .*;,pid /tmp/nginx.pid;,' /etc/nginx/nginx.conf \
    && chown -R nginx:nginx /var/cache/nginx /usr/share/nginx/html
USER 101

EXPOSE 80
