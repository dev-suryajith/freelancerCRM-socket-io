const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require('./db')

// --------------Models-------------
const chats = require("./models/chatModel");
const messages = require("./models/messageModel");


const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("sendMessage", async ({ senderId, receiverId, text }) => {
    try {
      // 1️⃣ Find or create chat
      let chat = await chats.findOne({
        participants: { $all: [senderId, receiverId] },
      });

      if (!chat) {
        chat = await chats.create({
          participants: [senderId, receiverId],
          lastMessage: text,
        });
      } else {
        chat.lastMessage = text;
        await chat.save();
      }

      // 2️⃣ Save message
      const message = await messages.create({
        chatId: chat._id,
        senderId,
        text,
      });

      // 3️⃣ Emit message
      io.emit("receiveMessage", {
        _id: message._id,
        chatId: chat._id,
        senderId,
        text,
        createdAt: message.createdAt,
      });
    } catch (error) {
      console.error("Send message error:", error);
    }
  });


  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});


// Get Old Chats
app.get("/chat-history/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;

  try {
    // 1️⃣ Find chat
    const chat = await chats.findOne({
      participants: { $all: [user1, user2] },
    });

    if (!chat) {
      return res.json([]); // no chat yet
    }

    // 2️⃣ Get last 20 messages (old → new)
    const chatMessages = await messages
      .find({ chatId: chat._id })
      .sort({ createdAt: 1 })
      .limit(20);

    res.json(chatMessages);
  } catch (err) {
    res.status(500).json(err);
  }
});

