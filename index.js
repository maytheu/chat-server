const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const cors = require("cors");

const router = require("./routes/router");
const {
  addUser,
  removeUser,
  getUser,
  getUserInRoom,
} = require("./utils/users");

//configure socket
const app = express();
const server = http.createServer(app);
const io = socketio(server);

//socket processess
io.on("connection", (socket) => {
  console.log("A new user is connected");

  //join a room
  socket.on("join", ({ name, room }, cb) => {
    console.log(`user details ${(name, room)}`);
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return cb(error);

    //welcome the new user to the room, sent from the server
    socket.emit("message", {
      user: "Admin",
      text: `${user.name}, Welcome to the ${user.room} room`,
    });
    //display the welcome to the room, sent from the server
    socket.broadcast
      .to(user.room)
      .emit("message", { user: "Admin", text: `${user.name} has joined` });

    socket.join(user.room);

    //room info
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUserInRoom(user.room),
    });

    cb();
  });

  //receive message from the client
  socket.on("sendMessage", (message, cb) => {
    console.log("Message is sent");
    const user = getUser(socket.id);

    io.to(user.room).emit("message", { user: user.name, text: message });

    cb();
  });

  socket.on("disconnect", () => {
    console.log("User just left");
    const user = removeUser(socket.id);

    if (user) {
      //user left the room
      io.to(user.room).emit("message", {
        user: "Admin",
        text: `${user.name} left the room`,
      });
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUserInRoom(user.room),
      });
    }
  });
});

app.use(router);
app.use(cors());

const PORT = process.env.PORT || 3005;
server.listen(PORT, console.log(`Socket has started on port ${PORT}`));
