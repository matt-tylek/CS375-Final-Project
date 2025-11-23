const socket = io();

const chatLog = document.getElementById('chat-log');
const messageInput = document.getElementById('message');
const recipientInput = document.getElementById('recipient');
const sendBtn = document.getElementById('sendBtn');
const newChatsBtn = document.getElementById('newChatsBtn');
const contactListBtn = document.getElementById('contactBtn');
const contactListModal = document.getElementById('contactListModal');
const closeButtons = document.querySelectorAll('.close-btn');
const threadList = document.getElementById('thread-list');
const contactSearchInput = document.getElementById('contactSearch');
const contactResults = document.getElementById('contactResults');
const sharePreview = document.getElementById('share-preview');

const state = {
  user: null,
  threads: [],
  contacts: [],
  activeContact: null,
  pendingShare: null
};

function requireLogin() {
  window.location.href = 'login.html';
}

function openModal(modalElement) {
  modalElement.style.display = 'block';
}

function closeModal(modalElement) {
  modalElement.style.display = 'none';
}

function renderSystemLine(text) {
  const div = document.createElement('div');
  div.className = 'chat-line';
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderSharedPet(pet) {
  if (!pet) return null;
  const wrapper = document.createElement('div');
  wrapper.className = 'shared-pet';
  if (pet.photos && pet.photos.length > 0) {
    const img = document.createElement('img');
    img.src = pet.photos[0].medium || pet.photos[0].large || pet.photos[0].small;
    img.alt = pet.name || 'Pet';
    wrapper.appendChild(img);
  }
  const title = document.createElement('strong');
  title.textContent = pet.name || 'Pet';
  wrapper.appendChild(title);
  const meta = document.createElement('div');
  meta.textContent = [pet.type, pet.breeds && pet.breeds.primary].filter(Boolean).join(' · ');
  wrapper.appendChild(meta);
  const viewBtn = document.createElement('button');
  viewBtn.textContent = 'View Details';
  viewBtn.addEventListener('click', () => {
    localStorage.setItem('selectedPet', JSON.stringify(pet));
    window.location.href = 'pet.html';
  });
  wrapper.appendChild(viewBtn);
  return wrapper;
}

function renderMessageLine(message) {
  if (!state.user) return;
  const isMine = message.senderId === state.user.id;
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-line' + (isMine ? ' me' : '');
  const meta = document.createElement('div');
  const senderLabel = isMine ? 'You' : message.senderEmail;
  const timestamp = new Date(message.createdAt).toLocaleString();
  meta.textContent = `${senderLabel} • ${timestamp}`;
  wrapper.appendChild(meta);
  if (message.message) {
    const body = document.createElement('div');
    body.textContent = message.message;
    wrapper.appendChild(body);
  }
  const sharedPet = renderSharedPet(message.sharedPet);
  if (sharedPet) {
    wrapper.appendChild(sharedPet);
  }
  chatLog.appendChild(wrapper);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderChatHistory(messages) {
  chatLog.innerHTML = '';
  if (!messages || messages.length === 0) {
    renderSystemLine('No messages yet. Say hi!');
    return;
  }
  messages.forEach(renderMessageLine);
}

async function loadThreads() {
  try {
    const response = await axios.get('/api/chat/threads');
    state.threads = response.data.threads || [];
    renderThreadList();
  } catch (err) {
    if (err.response && err.response.status === 401) {
      requireLogin();
      return;
    }
    console.error('Unable to load threads:', err.message);
  }
}

function renderThreadList() {
  if (!threadList) return;
  threadList.innerHTML = '';
  if (!state.threads || state.threads.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No conversations yet.';
    threadList.appendChild(li);
    return;
  }
  state.threads.forEach((thread) => {
    const li = document.createElement('li');
    li.textContent = thread.email;
    li.dataset.id = thread.userId;
    if (state.activeContact && state.activeContact.id === thread.userId) {
      li.classList.add('active');
    }
    li.addEventListener('click', () => {
      loadChatHistory(thread.userId, thread.email);
    });
    threadList.appendChild(li);
  });
}

function upsertThread(userId, email) {
  if (!userId) return;
  const existing = state.threads.find((thread) => thread.userId === userId);
  if (existing) {
    existing.email = email;
  } else {
    state.threads.unshift({ userId, email, lastMessageAt: new Date().toISOString() });
  }
  renderThreadList();
}

async function loadContacts(query = '') {
  try {
    const response = await axios.get('/api/users', { params: query ? { search: query } : {} });
    state.contacts = response.data.users || [];
    renderContactResults();
  } catch (err) {
    if (err.response && err.response.status === 401) {
      requireLogin();
      return;
    }
    console.error('Unable to load contacts:', err.message);
  }
}

function renderContactResults() {
  if (!contactResults) return;
  contactResults.innerHTML = '';
  if (!state.contacts || state.contacts.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No users found.';
    contactResults.appendChild(li);
    return;
  }
  state.contacts.forEach((user) => {
    const li = document.createElement('li');
    li.textContent = user.email;
    li.addEventListener('click', () => {
      closeModal(contactListModal);
      loadChatHistory(user.id, user.email);
    });
    contactResults.appendChild(li);
  });
}

async function loadChatHistory(userId, email) {
  try {
    const response = await axios.get(`/api/messages/${userId}`);
    state.activeContact = { id: userId, email };
    recipientInput.value = email;
    const chatHeader = document.querySelector('.chat-area-content h2');
    if (chatHeader) {
      chatHeader.textContent = `Direct Messages with ${email}`;
    }
    renderChatHistory(response.data.messages);
    upsertThread(userId, email);
  } catch (err) {
    if (err.response && err.response.status === 401) {
      requireLogin();
      return;
    }
    renderSystemLine('Unable to load chat history.');
  }
}

function startNewChat() {
  state.activeContact = null;
  recipientInput.value = '';
  messageInput.value = '';
  chatLog.innerHTML = '';
  const chatHeader = document.querySelector('.chat-area-content h2');
  if (chatHeader) {
    chatHeader.textContent = 'Direct Messages';
  }
  renderSystemLine('Ready to start a new chat. Pick a contact or enter an email.');
}

function showSharePreview() {
  if (!sharePreview) return;
  if (!state.pendingShare) {
    sharePreview.classList.add('hidden');
    sharePreview.innerHTML = '';
    return;
  }
  sharePreview.classList.remove('hidden');
  const pet = state.pendingShare;
  const name = pet.name || 'this pet';
  sharePreview.innerHTML = `
    <h4>Sharing ${name}</h4>
    <p>${[pet.type, pet.breeds && pet.breeds.primary].filter(Boolean).join(' · ')}</p>
    <button id="clearShareBtn">Remove</button>
  `;
  const clearBtn = document.getElementById('clearShareBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearSharePreview);
  }
}

function clearSharePreview() {
  state.pendingShare = null;
  localStorage.removeItem('petToShare');
  showSharePreview();
}

function loadPendingShare() {
  const shareJson = localStorage.getItem('petToShare');
  if (!shareJson) {
    showSharePreview();
    return;
  }
  try {
    state.pendingShare = JSON.parse(shareJson);
  } catch (err) {
    state.pendingShare = null;
  }
  showSharePreview();
}

function buildMessagePayload() {
  const message = messageInput.value.trim();
  const recipientEmail = recipientInput.value.trim();
  if (!state.activeContact && !recipientEmail) {
    alert('Select a recipient or enter an email.');
    return null;
  }
  if (!message && !state.pendingShare) {
    alert('Enter a message or share a pet.');
    return null;
  }
  const payload = { message };
  if (state.activeContact) {
    payload.recipientId = state.activeContact.id;
  } else if (recipientEmail) {
    payload.to = recipientEmail;
  }
  if (state.pendingShare) {
    payload.sharedPet = state.pendingShare;
  }
  return payload;
}

function handleSendMessage() {
  const payload = buildMessagePayload();
  if (!payload) return;
  socket.emit('private_message', payload);
  messageInput.value = '';
  if (state.pendingShare) {
    clearSharePreview();
  }
  loadThreads();
}

socket.on('chat_error', (msg) => {
  renderSystemLine(msg);
});

socket.on('chat_history', ({ recipientId, messages }) => {
  if (state.activeContact && state.activeContact.id === recipientId) {
    renderChatHistory(messages);
  }
});

socket.on('private_message', (message) => {
  if (!state.user) return;
  const partnerId = message.senderId === state.user.id ? message.recipientId : message.senderId;
  const partnerEmail = message.senderId === state.user.id ? message.recipientEmail : message.senderEmail;
  upsertThread(partnerId, partnerEmail);
  if (state.activeContact && state.activeContact.id === partnerId) {
    renderMessageLine(message);
  }
});

async function initChat() {
  try {
    const response = await axios.get('/api/me');
    state.user = response.data.user;
    socket.emit('register');
    await Promise.all([loadThreads(), loadContacts()]);
    loadPendingShare();
    const recipientFromUrl = new URLSearchParams(window.location.search).get('recipient');
    if (recipientFromUrl) {
      recipientInput.value = recipientFromUrl;
      renderSystemLine(`Ready to message ${recipientFromUrl}`);
      history.replaceState(null, '', 'chat.html');
    }
  } catch (err) {
    requireLogin();
  }
}

if (sendBtn) {
  sendBtn.addEventListener('click', handleSendMessage);
}

if (messageInput) {
  messageInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  });
}

if (newChatsBtn) {
  newChatsBtn.addEventListener('click', startNewChat);
}

if (contactListBtn) {
  contactListBtn.addEventListener('click', () => {
    loadContacts(contactSearchInput ? contactSearchInput.value : '');
    openModal(contactListModal);
  });
}

closeButtons.forEach((btn) => {
  btn.addEventListener('click', (event) => {
    const modalId = event.target.getAttribute('data-modal');
    const modalToClose = document.getElementById(modalId);
    if (modalToClose) {
      closeModal(modalToClose);
    }
  });
});

window.addEventListener('click', (event) => {
  if (event.target === contactListModal) {
    closeModal(contactListModal);
  }
});

if (contactSearchInput) {
  let searchTimeout = null;
  contactSearchInput.addEventListener('input', () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
      loadContacts(contactSearchInput.value);
    }, 300);
  });
}

initChat();
