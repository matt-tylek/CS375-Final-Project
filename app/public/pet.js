function renderAttribute(label, value) {
  if (value === true) {
    return `<div class="attribute-status"><strong>${label}:</strong> Yes</div>`;
  }
  if (value === false) {
    return `<div class="attribute-status"><strong>${label}:</strong> No</div>`;
  }
  return `<div class="attribute-status"><strong>${label}:</strong> N/A</div>`;
}

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
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
    alert('Saved.');
  } catch (err) {
    alert('Unable to save this pet.');
  }
}

function attachPetActions(pet) {
  const wishlistBtn = document.getElementById('wishlistBtn');
  if (wishlistBtn) {
    wishlistBtn.addEventListener('click', () => savePet('wishlist', pet));
  }
  const starBtn = document.getElementById('starBtn');
  if (starBtn) {
    starBtn.addEventListener('click', () => savePet('starred', pet));
  }
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      localStorage.setItem('petToShare', JSON.stringify(pet));
      window.location.href = 'chat.html';
    });
  }
}

function renderPetDetailsFromStorage() {
  const detailContainer = document.getElementById('pet-details');
  const petJson = localStorage.getItem('selectedPet');
  if (!detailContainer) return;
  if (!petJson) {
    detailContainer.innerHTML = '<h1>Error: Pet data not found. Please return to the search page.</h1>';
    return;
  }
  try {
    const pet = JSON.parse(petJson);
    const breeds = pet.breeds || {};
    const primaryBreed = breeds.primary || '';
    const secondaryBreed = breeds.secondary ? ` / ${breeds.secondary}` : '';
    const fullBreed = primaryBreed + secondaryBreed + (breeds.mixed ? ' (Mix)' : '');
    const photos = Array.isArray(pet.photos) ? pet.photos : [];
    const mainPhotoUrl = pet.primary_photo_cropped?.large || photos[0]?.large || 'https://via.placeholder.com/600x400?text=Image+Not+Available';
    const contact = pet.contact || {};
    const address = contact.address || {};
    const city = address.city || 'Unknown';
    const state = address.state || '';
    const fullAddress = `${address.address1 || ''} ${city}, ${state} ${address.postcode || ''}`;
    const attributes = pet.attributes || {};
    const tagsHtml = Array.isArray(pet.tags) ? pet.tags.map((tag) => `<li>${tag}</li>`).join('') : '';
    const videosHtml = Array.isArray(pet.videos) ? pet.videos.map((video) => `<div class="video-embed">${video.embed}</div>`).join('') : '';
    detailContainer.innerHTML = `
        <h1>${pet.name || 'Unnamed Pet'} (${pet.type})</h1>
        <div class="detail-flex">
            <div class="main-image">
                <img src="${mainPhotoUrl}" alt="${pet.name} Adoption Photo">
            </div>
            
            <div class="info-panel">
                <h2 class="section-header">Quick Facts</h2>
                <p><strong>Status:</strong> <span style="font-weight: bold; color: green;">${pet.status}</span></p>
                <p><strong>ID:</strong> ${pet.id}</p>
                <p><strong>Age:</strong> ${pet.age}</p>
                <p><strong>Gender:</strong> ${pet.gender}</p>
                <p><strong>Size:</strong> ${pet.size}</p>
                <p><strong>Coat:</strong> ${pet.coat || 'N/A'}</p>
                <p><strong>Primary Breed:</strong> ${fullBreed}</p>
                
                <h2 class="section-header">Adoption Contact</h2>
                <p><strong>Email:</strong> ${contact.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${contact.phone || 'N/A'}</p>
                <p><strong>Location:</strong> ${fullAddress.trim()}</p>

                <a href="chat.html?recipient=${contact.email || ''}" class="chat-link">
                <button class="chat-to-shelter-btn">
                    Chat About ${pet.name}
                </button>
                </a>
                <div class="pet-actions">
                    <button id="wishlistBtn">Add to Wishlist</button>
                    <button id="starBtn">Star Animal</button>
                    <button id="shareBtn">Share in Chat</button>
                </div>

            </div>
        </div>

        <h2 class="section-header">About ${pet.name}</h2>
        <p class="description">${pet.description || 'No detailed description provided.'}</p>

        <h2 class="section-header">Health & Training</h2>
        ${renderAttribute('Spayed/Neutered', attributes.spayed_neutered)}
        ${renderAttribute('Shots Current', attributes.shots_current)}
        ${renderAttribute('House Trained', attributes.house_trained)}
        ${renderAttribute('Special Needs', attributes.special_needs)}
        
        ${pet.tags && pet.tags.length > 0 ? `
            <h2 class="section-header">Personality Tags</h2>
            <ul class="tag-list">${tagsHtml}</ul>
        ` : ''}

        ${videosHtml ? `
            <h2 class="section-header">Videos</h2>
            <div class="video-container">${videosHtml}</div>
        ` : ''}
    `;
    attachPetActions(pet);
  } catch (error) {
    console.error('Failed to render pet data:', error);
    detailContainer.innerHTML = '<h1>Error loading pet details</h1>';
  }
}

renderPetDetailsFromStorage();
