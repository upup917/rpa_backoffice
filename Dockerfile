# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# --- เพิ่มบรรทัดนี้ ---
# มั่นใจว่ามี .env สำหรับการดึงข้อมูลตอน Build (ถ้ามีการทำ Static Site Generation)
COPY .env .env 
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# ปรับการ Copy ให้ครอบคลุมไฟล์ที่จำเป็นสำหรับ Server-side
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.cjs ./server.cjs
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/src ./src
# Copy .env มาไว้ที่นี่ด้วยเพื่อให้ server.cjs อ่านค่าได้ตอน Run
COPY .env .env

USER nextjs

EXPOSE 3000

# Container health = app is up AND DB reachable.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health', r => { r.resume(); process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# ปรับ CMD เพื่อให้มั่นใจว่า Environment ถูกโหลดก่อนเริ่มงาน
CMD ["npm", "start"]
