
# 🩺 ODABS – Online Doctor Appointment Booking System

ODABS is a full-stack web app that digitizes doctor appointment booking. It replaces manual hospital systems with a simple, secure, and interactive platform. Patients can book, reschedule, or cancel appointments. Doctors can manage schedules.

## 🔧 Tech Stack

**Frontend**: HTML, CSS, JavaScript  
**Backend**: Node.js, Express.js  
**Database**: MongoDB (via Atlas)  
**Real-time**: Socket.IO, PeerJS  
**Templating**: EJS

## 🚀 Features

- 👥 User Registration & Login (JWT-based)
- 📅 Appointment Scheduling (Create, Update, Delete)
- 🧑‍⚕️ Doctor Schedule Management
- 🔒 File Uploads (`/uploads` folder)

## ⚙️ Project Setup

```bash
git clone https://github.com/your-username/odabs.git
cd backend
npm install
touch .env
```

### .env example
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
```

### Run the app
```bash
npm start
```

## 📂 Folder Structure
```
.
├── config/            # DB connection
├── routes/            # user, booking, schedule routes
├── uploads/           # uploaded files
├── views/             # EJS views
├── public/            # frontend assets
├── server.js          # entry point
└── .env               # environment variables
```



## 🌐 Deployment (example)

- Backend: Render / R 
- Frontend: Netlify / Vercel (optional)

---

## 🧠 Notes

- All user uploads stored in `/uploads`
- CORS enabled for frontend/backend separation
- ExpressPeerServer handles WebRTC signaling (via `/room` route)
- Uses EJS for chat/video room UI

---

## 🙋‍♂️ Author
**Mohamed Hamud Bashir** 
