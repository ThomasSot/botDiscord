FROM node:22-slim

# Install ffmpeg, python3/yt-dlp, and build tools for native modules (@discordjs/opus)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg python3 python3-pip \
        build-essential libopus-dev && \
    pip3 install --break-system-packages yt-dlp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source code
COPY src/ src/

CMD ["node", "src/index.js"]
