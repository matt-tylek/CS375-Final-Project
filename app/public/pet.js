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


function attachSocialShare(pet) {
  const socialShareBtn = document.getElementById('socialShareBtn');
  const fallbackDiv = document.getElementById('socialLinksFallback');
  if (!socialShareBtn) return;

  const shareUrl = window.location.href; 
  const shareTitle = `Check out ${pet.name || 'this pet'}!`;
  const shareText = `I found this adorable ${pet.type} named ${pet.name} up for adoption on PetFinder!`;

  socialShareBtn.addEventListener('click', async () => {
    // Try the MODERN Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        console.log('Pet shared successfully!');
      } catch (err) {
        console.error('Share failed:', err.message);
      }
    } else {
      // If it fails, show the FALLBACK links
      console.log('Web Share API not supported. Showing fallback links.');
      document.getElementById('shareTwitter').href = 
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        
      document.getElementById('shareFacebook').href = 
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        
      document.getElementById('shareEmail').href = 
        `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;

      fallbackDiv.style.display = 'block';
    }
  });
}


async function fetchPetPrice(petId) {
  const response = await axios.get(`/api/price/pets/${petId}`);
  return response.data.price;
}


async function renderPetDetailsFromStorage() {
  const detailContainer = document.getElementById('pet-details');
  const petJson = localStorage.getItem('selectedPet');
  if (!detailContainer) return;
  if (!petJson) {
    detailContainer.innerHTML = '<h1>Error: Pet data not found. Please return to the search page.</h1>';
    return;
  }
  try {
    const pet = JSON.parse(petJson);
    const pet_price = await fetchPetPrice(pet.id);
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
                <h3 class="section-header">Quick Facts</h2>
                <p><strong>Status:</strong> <span style="font-weight: bold; color: green;">${pet.status}</span></p>
                <p><strong>ID:</strong> ${pet.id}</p>
                <p><strong>Age:</strong> ${pet.age}</p>
                <p><strong>Price:</strong> $${pet_price}</p>
                <p><strong>Gender:</strong> ${pet.gender}</p>
                <p><strong>Size:</strong> ${pet.size}</p>
                <p><strong>Coat:</strong> ${pet.coat || 'N/A'}</p>
                <p><strong>Primary Breed:</strong> ${fullBreed}</p>
                
                <h3 class="section-header">Adoption Contact</h2>
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
                </div>
                <div class="social-share">
                    <h3 class="section-header">Share ${pet.name}</h3>
                    <button id="shareBtn">Share in Chat</button>
                    <button id="socialShareBtn">Share to Social Media</button>
                    <div id="socialLinksFallback" style="display: none; margin-top: 10px;">
                        <a id="shareTwitter" href="#" target="_blank">Twitter</a>
                        <a id="shareFacebook" href="#" target="_blank">Facebook</a>
                        <a id="shareEmail" href="#">Email</a>
                    </div>
                </div>

            </div>
        </div>

        <h3 class="section-header">About ${pet.name}</h2>
        <p class="description">${pet.description || 'No detailed description provided.'}</p>

        <h3 class="section-header">Health & Training</h2>
        ${renderAttribute('Spayed/Neutered', attributes.spayed_neutered)}
        ${renderAttribute('Shots Current', attributes.shots_current)}
        ${renderAttribute('House Trained', attributes.house_trained)}
        ${renderAttribute('Special Needs', attributes.special_needs)}
        
        ${pet.tags && pet.tags.length > 0 ? `
            <h3 class="section-header">Personality Tags</h2>
            <ul class="tag-list">${tagsHtml}</ul>
        ` : ''}

        ${videosHtml ? `
            <h3 class="section-header">Videos</h2>
            <div class="video-container">${videosHtml}</div>
        ` : ''}
    `;
    attachPetActions(pet);
    attachSocialShare(pet);
  } catch (error) {
    console.error('Failed to render pet data:', error);
    detailContainer.innerHTML = '<h1>Error loading pet details</h1>';
  }
}

renderPetDetailsFromStorage();
