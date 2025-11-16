const { io } = require("socket.io-client");

const username = process.argv[2] || "Anonymous";

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log(`Connected to server as ${username} with ID: ${socket.id}`);

  socket.emit("register", username);

  setTimeout(() => {
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
