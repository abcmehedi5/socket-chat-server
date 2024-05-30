const express = require("express");
const { createServer } = require("node:http");
const cors = require("cors");
const app = express();
const server = createServer(app);
const { Server } = require("socket.io");
app.use(cors());

const io = new Server(server, { // cors policy handle 
  cors: {
    origin: "http://localhost:5173", // client side PORT
    methods: ["GET", "PUSH", "PATCH", "DELETE"],
  },
});

io.on("connection", (socket) => {
  // user connected
  console.log("a user connected");

  // message data send and recived
  socket.on("send_message", (data) => {
    // recived message brodcust
    socket.broadcast.emit("recived_message", data);
  });

  // user disconnected
  socket.on("disconnect", () => {
    console.log("a user disconnected");
  });
});

server.listen(5000, () => {
  console.log("server running at http://localhost:5000");
});
