# The static host and reverse proxy (ADR 0047): both built apps behind one nginx that serves the
# member app or the admin app by host name and passes /api/ to the API in the same replica.
# Build context: frontend/.
FROM node:24-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/static.conf deploy/headers.conf /etc/nginx/snippets/
COPY --from=build /src/dist/web/browser /usr/share/nginx/html/web
COPY --from=build /src/dist/admin/browser /usr/share/nginx/html/admin
EXPOSE 8080
