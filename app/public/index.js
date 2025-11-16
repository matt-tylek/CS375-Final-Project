const params = {
  type: 'cat',
  location: '19104',
  distance: 15
};

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

async function fetchPets() {
  try {
    const response = await axios.get('/api/pets', { params });
    const pets = response.data.animals;
    return Array.isArray(pets) ? pets : [];
  } catch (error) {
    console.error('Error fetching pets:', error.response ? error.response.data : error.message);
    return [];
  }
}

async function savePet(endpoint, pet) {
  const headers = getAuthHeaders();
  if (!headers) {
    alert('Login to save pets.');
    return;
  }
  try {
    const petKey = pet.id || `${pet.type || 'pet'}-${Date.now()}`;
    await axios.post(`/api/${endpoint}`, { petId: petKey, pet }, { headers });
    await loadSavedLists();
  } catch (err) {
    alert('Unable to save this pet.');
  }
}

function renderSavedList(elementId, items, emptyText) {
  const container = document.getElementById(elementId);
  if (!container) return;
  container.innerHTML = '';
  if (!items || items.length === 0) {
    const li = document.createElement('li');
    li.textContent = emptyText;
    container.appendChild(li);
    return;
  }
  items.forEach((entry) => {
    const li = document.createElement('li');
    const pet = entry.pet || {};
    const summary = [pet.name, pet.type].filter(Boolean).join(' · ');
    li.textContent = summary || 'Pet details pending';
    li.addEventListener('click', () => {
      localStorage.setItem('selectedPet', JSON.stringify(pet));
      window.location.href = 'pet.html';
    });
    container.appendChild(li);
  });
}

async function loadSavedLists() {
  const headers = getAuthHeaders();
  if (!headers) {
    renderSavedList('wishlist-list', [], 'Login to build your wishlist.');
    renderSavedList('starred-list', [], 'Login to star animals.');
    return;
  }
  try {
    const [wishlistResp, starredResp] = await Promise.all([
      axios.get('/api/wishlist', { headers }),
      axios.get('/api/starred', { headers })
    ]);
    renderSavedList('wishlist-list', wishlistResp.data.items, 'Wishlist is empty.');
    renderSavedList('starred-list', starredResp.data.items, 'No starred animals yet.');
  } catch (err) {
    renderSavedList('wishlist-list', [], 'Unable to load wishlist.');
    renderSavedList('starred-list', [], 'Unable to load starred animals.');
  }
}

function createPetCard(pet) {
  const card = document.createElement('div');
  card.className = 'card';
  const photo = pet.photos && pet.photos.length > 0 ? pet.photos[0].medium : 'https://via.placeholder.com/220x180?text=No+Image';
  const name = pet.name || 'Unnamed';
  const breed = pet.breeds && pet.breeds.primary ? pet.breeds.primary : 'Unknown breed';
  card.innerHTML =
    '<img src="' + photo + '" alt="' + name + '">' +
    '<h3>' + name + '</h3>' +
    '<p>' + breed + '</p>';
  card.addEventListener('click', () => {
    localStorage.setItem('selectedPet', JSON.stringify(pet));
    window.location.href = 'pet.html';
  });

  const actions = document.createElement('div');
  actions.className = 'card-actions';
  const wishlistBtn = document.createElement('button');
  wishlistBtn.textContent = 'Wishlist';
  wishlistBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    savePet('wishlist', pet);
  });
  const starBtn = document.createElement('button');
  starBtn.textContent = 'Star';
  starBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    savePet('starred', pet);
  });
  const shareBtn = document.createElement('button');
  shareBtn.textContent = 'Share';
  shareBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    localStorage.setItem('petToShare', JSON.stringify(pet));
    window.location.href = 'chat.html';
  });
  actions.appendChild(wishlistBtn);
  actions.appendChild(starBtn);
  actions.appendChild(shareBtn);
  card.appendChild(actions);
  return card;
}

function showPets(pets) {
  const grid = document.getElementById('pet-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!Array.isArray(pets) || pets.length === 0) {
    grid.innerHTML = '<p>No pets found.</p>';
    return;
  }
  pets.forEach((pet) => {
    grid.appendChild(createPetCard(pet));
  });
}

const searchBtn = document.getElementById('search');
if (searchBtn) {
  searchBtn.addEventListener('click', async () => {
    const pets = await fetchPets();
    showPets(pets);
  });
}

loadSavedLists();
