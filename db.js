const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.DATABASE)
    .then(() => {
        console.log("MongoDB connected successfully");
        console.log("Connected Database:", mongoose.connection.name);
    })
    .catch((err) => {
        console.log("MongoDB connection error:", err);
    });
