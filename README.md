# ระบบจัดการรถเทรลเลอร์

## วิธีติดตั้งและรัน

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Firebase
แก้ไขไฟล์ `src/firebase/config.js` ใส่ค่า Firebase Config ของคุณ:
```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

### 3. รันโปรแกรม
```bash
npm run dev
```
เปิดเบราว์เซอร์ที่ http://localhost:5173

### 4. สร้าง Admin คนแรก
เนื่องจากยังไม่มี user ในระบบ ให้สร้าง Admin คนแรกใน Firebase Console:
1. ไปที่ Firebase Console → Authentication → Add user
2. ใส่ Email และ Password
3. ไปที่ Firestore → สร้าง collection `users` → document ใส่ uid ของ user นั้น
4. ใส่ข้อมูล: `{ name: "ชื่อAdmin", email: "...", role: "admin", phone: "" }`

### 5. Build สำหรับ Deploy
```bash
npm run build
```

---

## โครงสร้างระบบ

### User Roles
- **Admin** — ดูและจัดการทุกอย่าง
- **คนขับ** — บันทึกเที่ยววิ่ง รายรับ-รายจ่าย ซ่อมบำรุง

### หน้าหลัก
- Dashboard — ภาพรวม แจ้งเตือน
- จัดการรถ — ข้อมูลรถ ผ่อนรถ
- บริษัทซัพ — บริษัทที่จ้างวิ่ง
- เที่ยววิ่ง — บันทึกแต่ละเที่ยว รายรับ-รายจ่าย เครดิต
- บัญชีรายรับ-รายจ่าย — สรุปรายเดือน
- ประกัน/ภาษี — ติดตามวันหมดอายุ
- ซ่อมบำรุง — ประวัติซ่อม
- รายงาน — กราฟ สรุปแยกรถ (Admin)
- จัดการผู้ใช้ (Admin)

### Tech Stack
- React + Vite
- Tailwind CSS v4
- Firebase (Auth, Firestore, Storage)
- React Router v6
- Recharts
