// --- Socket.IO Client ---
const socket = io();

// Elements
const chatLog = document.getElementById("chat-log");
const messageInput = document.getElementById("message");
const recipientInput = document.getElementById("recipient");
const sendBtn = document.getElementById("sendBtn");

// Try auto-register from localStorage token or email
let username = localStorage.getItem("username") || prompt("Enter your username:");
if (username) {
  socket.emit("register", username);
  localStorage.setItem("username", username);
  addChatLine(`✅ You are chatting as "${username}"`);
}

function addChatLine(text, isMe = false) {
  const div = document.createElement("div");
  div.className = "chat-line" + (isMe ? " me" : "");
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

sendBtn.addEventListener("click", () => {
  const to = recipientInput.value.trim();
  const message = messageInput.value.trim();
  if (!to || !message) return;

  socket.emit("private_message", { to, message });
  addChatLine(`To ${to}: ${message}`, true);
  messageInput.value = "";
});

socket.on("private_message", ({ from, message }) => {
  addChatLine(`From ${from}: ${message}`);
});

socket.on("chat_error", (msg) => {
  addChatLine(`⚠️ ${msg}`);
});
