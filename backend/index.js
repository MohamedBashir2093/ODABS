const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
const { ExpressPeerServer } = require('peer');
const path = require("path");
require("dotenv").config();
const { connection } = require("./config/db");
const { userRoute } = require("./routes/userRoute");
const { bookingRoutes } = require("./routes/bookingRoute");
const { scheduleRouter } = require("./routes/scheduleRoute");

const app = express();

// Define allowed origins
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5000",
    "https://odabs.vercel.app"
];

// Apply CORS with allowed origins
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.io with allowed frontend origins
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Setup PeerJS server
const peerServer = ExpressPeerServer(server, { debug: true });

// Routes
app.get("/", (req, res) => {
    res.send("Welcome to Home Route");
});

app.use("/user", userRoute);
app.use("/booking", bookingRoutes);
app.use("/schedule", scheduleRouter);

// Video call route
app.get("/:room", (req, res) => {
    res.render('room', { roomId: req.params.room });
});

// Socket.io connection handler
io.on("connection", (socket) => {
    socket.on("join-room", (roomId, userId, userName) => {
        socket.join(roomId);
        socket.broadcast.to(roomId).emit("user-connected", userId);

        socket.on("message", (message) => {
            io.to(roomId).emit("createMessage", message, userName);
        });
    });
});

// Start the server
server.listen(process.env.PORT || 5000, async () => {
    try {
        await connection;
        console.log("✅ Connected to DB");
        console.log(`🚀 Server is running on port ${process.env.PORT || 5000}`);
    } catch (error) {
        console.log("❌ Failed to connect to DB");
        console.error(error);
    }
});
