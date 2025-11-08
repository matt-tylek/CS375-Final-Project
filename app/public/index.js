//Mock search params 
const params = {
    type: 'dog', 
    location: '19104', 
    distance: 50, 
};

async function fetchPets(params) {
    // const type = document.getElementById('search-type').value;
    // const location = document.getElementById('search-location').value;
    // const distance = document.getElementById('search-distance').value;

    // params = {
    //     type: type,
    //     location: location,
    //     distance: distance
    // };
    try {
        const response = await axios.get('/api/pets', {
            params: params,
        });

        const petData = response.data.animals; 
        const pagination = response.data.pagination; 
        
        console.log("Fetched Pets:", petData);
        console.log("Pagination Info:", pagination);
        
        // Process the results here
        return petData;
        
    } catch (error) {
        console.error("Error fetching pets:", error.response ? error.response.data : error.message);
        return error.response ? error.response.data : error.message;
    }
}

function showPets(pets) {
  const grid = document.getElementById('pet-grid');
  grid.innerHTML = '';

  if (!Array.isArray(pets) || pets.length === 0) {
    grid.innerHTML = '<p>No pets found.</p>';
    return;
  }

  for (let i = 0; i < pets.length; i++) {
    const pet = pets[i];

    let img = 'https://via.placeholder.com/220x180?text=No+Image';
    if (pet.photos && pet.photos.length > 0 && pet.photos[0].medium) {
        img = pet.photos[0].medium;
    }

    const name = pet.name || 'Unnamed';

    let breed = 'Unknown breed';
    if (pet.breeds && pet.breeds.primary) {
        breed = pet.breeds.primary;
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
        '<img src="' + img + '" alt="' + name + '">' +
        '<h3>' + name + '</h3>' +
        '<p>' + breed + '</p>';

    grid.appendChild(card);
    }
}

const searchBtn = document.getElementById('search');

searchBtn.addEventListener('click', async function () {
  const pets = await fetchPets(params);
  showPets(pets);
});


const socket = io();

const usernameInput = document.getElementById('chat-username');
const connectBtn = document.getElementById('chat-connect');
const recipientInput = document.getElementById('chat-recipient');
const messageInput = document.getElementById('chat-message');
const sendBtn = document.getElementById('chat-send');
const chatLog = document.getElementById('chat-log');

function addChatLine(text) {
  const div = document.createElement('div');
  div.textContent = text;
  chatLog.appendChild(div);
}

connectBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  if (!username) {
    alert('Please enter a username.');
    return;
  }
  socket.emit('register', username);
  addChatLine(`You are now connected as "${username}".`);
});

sendBtn.addEventListener('click', () => {
  const to = recipientInput.value.trim();
  const message = messageInput.value.trim();

  if (!to || !message) {
    alert('Recipient and message are required.');
    return;
  }

  socket.emit('private_message', { to, message });
  addChatLine(`(to ${to}) ${message}`);
  messageInput.value = '';
});

socket.on('private_message', ({ from, message }) => {
  addChatLine(`From ${from}: ${message}`);
});

socket.on('chat_error', (msg) => {
  addChatLine(`Error: ${msg}`);
});
