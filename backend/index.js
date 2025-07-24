const express = require("express");
const cors = require("cors");
const {Server} = require("socket.io");
const http = require("http");
const { ExpressPeerServer } = require('peer');
const path = require("path");
require("dotenv").config();
const { connection } = require("./config/db");
const { userRoute } = require("./routes/userRoute");
const { bookingRoutes } = require("./routes/bookingRoute");
const { scheduleRouter } = require("./routes/scheduleRoute");

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const peerServer = ExpressPeerServer(server, {
    debug: true,
});

app.get("/", (req, res) => {
    res.send("Welcome to Home Route")
});

app.use("/user", userRoute);
app.use("/booking", bookingRoutes);
app.use("/schedule", scheduleRouter);

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get("/:room", (req, res) => {
    res.render('room', { roomId: req.params.room })
});

io.on("connection", (socket) => {
    socket.on("join-room", (roomId, userId, userName) => {
        socket.join(roomId);
        socket.broadcast.to(roomId).emit("user-connected", userId);
        socket.on("message", (message) => {
            io.to(roomId).emit("createMessage", message, userName);
        });
    });
});

server.listen(process.env.PORT, async () => {
    try {
        await connection;
        console.log("Connected to DB");
        console.log(`Server is running at port ${process.env.PORT}`);
    } catch (error) {
        console.log("Not able to connect to DB");
        console.log(error);
    }
});
