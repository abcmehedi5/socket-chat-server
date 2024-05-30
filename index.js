const express = require("express");
const { createServer } = require("node:http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json()); // Middleware to parse JSON requests

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

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
});

const User = mongoose.model("User", userSchema);

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

let onlineUsers = {};

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("user_connected", (username) => {
    onlineUsers[socket.id] = username;
    io.emit("update_user_list", Object.values(onlineUsers));
    console.log(`User connected: ${username}`);
  });

  socket.on("send_message", (data) => {
    io.emit("received_message", data);
  });

  socket.on("disconnect", () => {
    const username = onlineUsers[socket.id];
    delete onlineUsers[socket.id];
    io.emit("update_user_list", Object.values(onlineUsers));
    console.log(`User disconnected: ${username}`);
  });
});

server.listen(5000, () => {
  console.log("server running at http://localhost:5000");
});
