function renderAttribute(label, value) {
    if (value === true) {
        return `<div class="attribute-status"><strong>${label}:</strong> Yes</div>`;
    }
    if (value === false) {
        return `<div class="attribute-status"><strong>${label}:</strong> No</div>`;
    }
    return `<div class="attribute-status"><strong>${label}:</strong> N/A</div>`;
}

function renderPetDetailsFromStorage() {
    const detailContainer = document.getElementById('pet-details');
    const petJson = localStorage.getItem('selectedPet');

    if (!petJson) {
        detailContainer.innerHTML = '<h1>Error: Pet data not found. Please return to the search page.</h1>';
        return;
    }

    try {
        const pet = JSON.parse(petJson);
        
        const primaryBreed = pet.breeds.primary || '';
        const secondaryBreed = pet.breeds.secondary ? ` / ${pet.breeds.secondary}` : '';
        const fullBreed = primaryBreed + secondaryBreed + (pet.breeds.mixed ? ' (Mix)' : '');
        
        const mainPhotoUrl = pet.primary_photo_cropped?.large || pet.photos[0]?.large || 'https://via.placeholder.com/600x400?text=Image+Not+Available';
        
        const city = pet.contact.address.city || 'Unknown';
        const state = pet.contact.address.state || '';
        const fullAddress = `${pet.contact.address.address1 || ''} ${city}, ${state} ${pet.contact.address.postcode || ''}`;
        
        const tagsHtml = pet.tags.map(tag => `<li>${tag}</li>`).join('');
        const videosHtml = pet.videos.map(video => `<div class="video-embed">${video.embed}</div>`).join('');

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
                    <p><strong>Email:</strong> ${pet.contact.email || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${pet.contact.phone || 'N/A'}</p>
                    <p><strong>Location:</strong> ${fullAddress.trim()}</p>

                    <a href="chat.html?recipient=${pet.contact.email}" class="chat-link">
                    <button class="chat-to-shelter-btn">
                        Chat About ${pet.name}
                    </button>
                    </a>

                </div>
            </div>

            <h2 class="section-header">About ${pet.name}</h2>
            <p class="description">${pet.description || 'No detailed description provided.'}</p>

            <h2 class="section-header">Health & Training</h2>
            ${renderAttribute('Spayed/Neutered', pet.attributes.spayed_neutered)}
            ${renderAttribute('Shots Current', pet.attributes.shots_current)}
            ${renderAttribute('House Trained', pet.attributes.house_trained)}
            ${renderAttribute('Special Needs', pet.attributes.special_needs)}
            
            ${pet.tags.length > 0 ? `
                <h2 class="section-header">Personality Tags</h2>
                <ul class="tag-list">${tagsHtml}</ul>
            ` : ''}

            ${videosHtml ? `
                <h2 class="section-header">Videos</h2>
                <div class="video-container">${videosHtml}</div>
            ` : ''}
        `;

        //localStorage.removeItem('selectedPet');
    } catch (error) {
        console.error("Failed to render pet data:", error);
        detailContainer.innerHTML = '<h1>Error loading pet details</h1>';
    }
}

renderPetDetailsFromStorage();