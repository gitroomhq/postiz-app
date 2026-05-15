FROM node:22.20-bookworm-slim
ARG NEXT_PUBLIC_VERSION
ENV NEXT_PUBLIC_VERSION=$NEXT_PUBLIC_VERSION
RUN apt-get update && apt-get install -y --no-install-recommends     g++     make     python3-pip     bash     nginx     curl && rm -rf /var/lib/apt/lists/*

RUN addgroup --system www  && adduser --system --ingroup www --home /www --shell /usr/sbin/nologin www  && mkdir -p /www  && chown -R www:www /www /var/lib/nginx


RUN npm --no-update-notifier --no-fund --global install pnpm@10.6.1 pm2

# Install Temporal CLI
RUN curl -sSf https://temporal.download/cli.sh | bash
ENV PATH="/root/.temporalio/bin:${PATH}"

WORKDIR /app

COPY . /app
COPY var/docker/nginx.conf /etc/nginx/nginx.conf

RUN pnpm install
RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm run build

CMD ["sh", "-c", "temporal server start-dev --ip 0.0.0.0 --port 7233 --ui-port 8233 --metrics-port 9233 & sleep 15 && nginx && pnpm run pm2"]
