const socket = io();

const chatLog = document.getElementById("chat-log");
const messageInput = document.getElementById("message");
const recipientInput = document.getElementById("recipient");
const sendBtn = document.getElementById("sendBtn");
const newChatsBtn = document.getElementById("newChatsBtn");
const contactListBtn = document.getElementById("contactBtn");
const contactListModal = document.getElementById("contactListModal");
const closeButtons = document.querySelectorAll(".close-btn");
const sidebar = document.querySelector(".sidebar");

function openModal(modalElement) {
    modalElement.style.display = "block";
}

function closeModal(modalElement) {
    modalElement.style.display = "none";
}

let username = localStorage.getItem("username") || prompt("Enter your username:");
if (username) {
  socket.emit("register", username);
  localStorage.setItem("username", username);
  addChatLine(`You are chatting as "${username}"`);
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
  addChatLine(`${msg}`);
});

function startNewChat() {
  recipientInput.value = ""; 
  messageInput.value = "";
  chatLog.innerHTML = ''; 
  
  const chatHeader = document.querySelector('.chat-area-content h2');
  if (chatHeader) {
    chatHeader.textContent = "Direct Messages";
  }

  document.querySelectorAll('.sidebar li').forEach(li => {
    li.classList.remove('active');
  });

  addChatLine(`*Ready to start a new chat! Please enter a recipient username above.*`);
  socket.emit("chat_unfocused"); 
}

newChatsBtn.addEventListener("click", () => {
  startNewChat();
});

contactListBtn.addEventListener("click", () => {
  openModal(contactListModal);
});

closeButtons.forEach(btn => {
    btn.addEventListener('click', (event) => {
        // Get the ID of the modal to close from the data-modal attribute
        const modalId = event.target.getAttribute('data-modal');
        const modalToClose = document.getElementById(modalId);
        closeModal(modalToClose);
    });
});

window.addEventListener("click", (event) => {
    // Check if the clicked target is the modal itself
    if (event.target === contactListModal) {
        closeModal(contactListModal);
    }
});

function getRecipientIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('recipient');
}

const initialRecipient = getRecipientIdFromUrl();

if (initialRecipient) {
  recipientInput.value = initialRecipient;
  loadChatHistory(initialRecipient);
  history.replaceState(null, '', 'chat.html'); 
}

// Function to simulate loading a chat history
function loadChatHistory(recipientName) {
  recipientInput.value = recipientName;
  chatLog.innerHTML = ''; 
  const chatHeader = document.querySelector('.chat-area-content h2');
  if (chatHeader) {
      chatHeader.textContent = `Direct Messages with ${recipientName}`;
  }
  socket.emit("get_history", { recipient: recipientName });
  addChatLine(`*Chat history loaded with ${recipientName}. Start typing!*`);
}

sidebar.addEventListener("click", (event) => {
  let listItem = event.target.closest('li');

  if (listItem) {
    const recipientName = listItem.textContent.trim();
    
    document.querySelectorAll('.sidebar li').forEach(li => {
        li.classList.remove('active');
    });

    listItem.classList.add('active');
    
    loadChatHistory(recipientName);
  }
});