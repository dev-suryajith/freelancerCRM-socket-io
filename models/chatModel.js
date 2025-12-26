const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
    {
        participants: {
            type: [String],
            validate: [arr => arr.length === 2, "Chat must have 2 participants"],
            required: true,
        }
        ,
        lastMessage: {
            type: String,
        },
    },
    { timestamps: true }
);

const chats = mongoose.model("chats", chatSchema);
module.exports = chats
