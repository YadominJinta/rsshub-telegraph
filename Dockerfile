FROM node:alpine as builder

COPY ./ /app

RUN cd /app && \
    npm install -g pnpm && \
    pnpm install && \
    pnpm run build

FROM node:alpine

COPY --from=builder /app/dist/index.js /app/index.js

WORKDIR /app

ENTRYPOINT node /app/index.js