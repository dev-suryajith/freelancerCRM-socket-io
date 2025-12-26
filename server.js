const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("./db");

// Models
const Chat = require("./models/chatModel");
const Message = require("./models/messageModel");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

/* =========================
   SOCKET.IO DEBUG MODE
========================= */
io.on("connection", (socket) => {
  console.log("🟢 SOCKET CONNECTED:", socket.id);

  // DEBUG ALL EVENTS
  socket.onAny((event, ...args) => {
    console.log("📡 EVENT RECEIVED:", event);
    console.log("📦 PAYLOAD:", args);
  });

  socket.on("sendMessage", async (payload, callback) => {
    console.log("📩 sendMessage HIT");
    console.log("📦 Raw payload:", payload);

    try {
      const { senderId, receiverId, text } = payload || {};

      if (!senderId || !receiverId || !text) {
        console.error("❌ Invalid payload");
        return callback?.({
          success: false,
          error: "Invalid payload",
        });
      }

      // 1️⃣ Find or create chat
      let chat = await Chat.findOne({
        participants: { $all: [senderId, receiverId] },
      });

      if (!chat) {
        chat = await Chat.create({
          participants: [senderId, receiverId],
          lastMessage: text,
        });
        console.log("🆕 Chat created:", chat._id);
      } else {
        chat.lastMessage = text;
        await chat.save();
        console.log("✏️ Chat updated:", chat._id);
      }

      // 2️⃣ Save message
      const message = await Message.create({
        chatId: chat._id,
        senderId,
        text,
      });

      console.log("💾 MESSAGE SAVED:", message._id);

      const messagePayload = {
        _id: message._id,
        chatId: chat._id,
        senderId,
        receiverId,
        text,
        createdAt: message.createdAt,
      };

      // 3️⃣ ACK sender
      callback?.({
        success: true,
        message: messagePayload,
      });

      // 4️⃣ Emit to others
      socket.broadcast.emit("receiveMessage", messagePayload);
      console.log("📤 Message broadcasted");
    } catch (err) {
      console.error("🔥 sendMessage ERROR:", err);
      callback?.({
        success: false,
        error: "Server error",
      });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("🔴 SOCKET DISCONNECTED:", socket.id, reason);
  });
});

/* =========================
   CHAT HISTORY API
========================= */
app.get("/chat-history/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;
  console.log("📥 Chat history request:", user1, user2);

  try {
    const chat = await Chat.findOne({
      participants: { $all: [user1, user2] },
    });

    if (!chat) {
      console.log("⚠️ No chat found");
      return res.json([]);
    }

    const messages = await Message.find({ chatId: chat._id })
      .sort({ createdAt: 1 });

    console.log(`📄 Found ${messages.length} messages`);
    res.json(messages);
  } catch (err) {
    console.error("🔥 History error:", err);
    res.status(500).json({ error: "Failed to load history" });
  }
});

server.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});
