// client.js
const { io } = require("socket.io-client");

// Get username from command line, default to Anonymous
const username = process.argv[2] || "Anonymous";

// Connect to server
const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log(`Connected to server as ${username} with ID: ${socket.id}`);

  // Register this username
  socket.emit("register", username);

  // Example: send a message after 3s
  setTimeout(() => {
    // Change the target user as needed
    const target = username === "Hari" ? "Alice" : "Hari";
    socket.emit("private_message", { to: target, message: `Hello ${target}!` });
  }, 3000);
});

socket.on("private_message", ({ from, message }) => {
  console.log(`Message from ${from}: ${message}`);
});

socket.on("chat_error", (err) => {
  console.error("Chat error:", err);
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});
