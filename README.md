## Deploy Production 

### Base Path (Important)
If the production URL is served under a path prefix (example: `https://domain/beta/YAQ97hlxZp87/`), set this in `.env` before running `npm run build`:

`NEXT_PUBLIC_BASE_PATH=/beta/YAQ97hlxZp87`

1. **เตรียม Environment**
   - ใส่ค่า Environment Variables ในไฟล์ `.env` 
   - ตรวจสอบว่า Node.js และ npm ติดตั้งบนเซิร์ฟเวอร์

2. **Deploy Production ด้วยคำสั่งเดียว**
   ```bash
   npm start
   ```
   - ระบบจะติดตั้ง dependencies, build และ start server
   - แอปจะรันที่ port 3000 (ปรับได้ใน env)

