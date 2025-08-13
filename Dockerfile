# 1. Gunakan gambar dasar Node.js versi 18-slim yang ringan
FROM node:18-slim

# 2. Atur direktori kerja di dalam container menjadi /app
WORKDIR /app

# 3. Instal semua library sistem yang dibutuhkan oleh Puppeteer/Chromium
# Ini adalah langkah yang tidak bisa dilakukan di shared hosting cPanel
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    --no-install-recommends

# 4. Salin file package.json dan package-lock.json terlebih dahulu
COPY package*.json ./

# 5. Jalankan 'npm install' untuk menginstal semua library Node.js
RUN npm install

# 6. Salin sisa kode aplikasi Anda (server.js, folder public, dll)
COPY . .

# 7. Beritahu dunia luar bahwa aplikasi kita berjalan di port 3000
EXPOSE 3000

# 8. Perintah default untuk menjalankan server saat container dimulai
CMD ["node", "server.js"]