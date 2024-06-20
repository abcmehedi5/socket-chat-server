const express = require("express");
const { createServer } = require("node:http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json()); // Middleware to parse JSON requests

// Setup Socket.IO server with CORS configuration
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/chatapp", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB successfully");
});

mongoose.connection.on("error", (err) => {
  console.error("Error connecting to MongoDB:", err);
});

// Define the User schema and model
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
});

const User = mongoose.model("User", userSchema);

// Register endpoint
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = new User({ username, password });
    await user.save();
    res.status(201).send({ message: "User registered successfully" });
  } catch (error) {
    res.status(400).send({ message: "Error registering user", error });
  }
});

// Login endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username, password });
    if (user) {
      res.status(200).send({ message: "Login successful", user });
    } else {
      res.status(400).send({ message: "Invalid username or password" });
    }
  } catch (error) {
    res.status(400).send({ message: "Error logging in", error });
  }
});

// Online users tracking
let onlineUsers = {}; // { socket.id: username }
let userSockets = {}; // { username: socket.id }

// Socket.IO connection event
io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle user connection
  socket.on("user_connected", (username) => {
    onlineUsers[socket.id] = username;
    userSockets[username] = socket.id;
    io.emit("update_user_list", Object.values(onlineUsers));
    console.log(`User connected: ${username}`);
  });

  // Handle private message sending
  socket.on("send_private_message", ({ recipient, message }) => {
    const sender = onlineUsers[socket.id];
    const recipientSocketId = userSockets[recipient];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("received_private_message", {
        sender,
        message,
      });
      io.to(recipientSocketId).emit("show_notification", sender); // Notify recipient
    }
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    const username = onlineUsers[socket.id];
    delete onlineUsers[socket.id];
    delete userSockets[username];
    io.emit("update_user_list", Object.values(onlineUsers));
    console.log(`User disconnected: ${username}`);
  });
});

// Start the server
server.listen(5000, () => {
  console.log("Server running at http://localhost:5000");
});
