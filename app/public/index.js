document.addEventListener('DOMContentLoaded', () => {

    // const map = L.map('map').setView([39.95, -75.16], 10);

    // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    // attribution: '© OpenStreetMap contributors'
    // }).addTo(map);

    function getAuthHeaders() {
        const token = localStorage.getItem('token');
        if (!token) return null;
        return { Authorization: `Bearer ${token}` };
    }

    async function fetchPets(params) { 
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

    const typeDropdown = document.getElementById('pet-type').value;
    const distanceSelect = document.getElementById('distance').value;
    const locationInput = document.getElementById('location');

    async function searchForPets() {
        const locationText = locationInput.value;
        locationParam = locationText;

        // // Check if the text input has a value
        // if (locationText.trim() !== '') {
        //     locationParam = locationText;
        // } else {
        // // If no, get the map's center
        //     const center = map.getCenter();
        //     locationParam = `${center.lat},${center.lng}`;
        // }
        
        const type = typeDropdown.value;
        const distance = distanceSelect.value;

        const searchParams = { type, locationParam, distance };

        const pets = await fetchPets(searchParams);
        showPets(pets);
    }

    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault(); 
            searchForPets();    
        });
    }

    async function populatePetTypes() {
        const typeDropdown = document.getElementById('pet-type');
        if (!typeDropdown) return; 

        try {
            const response = await axios.get('/api/types');
            const types = response.data.types;

            typeDropdown.innerHTML = '<option value="">All Types</option>'; 
            
            types.forEach(type => {
            const option = document.createElement('option');
            option.value = type.name;   
            option.textContent = type.name;
            typeDropdown.appendChild(option);
            });

        } catch (error) {
            console.error('Error fetching pet types:', error);
            typeDropdown.innerHTML = '<option value="">Could not load types</option>';
        }
    }

    const openModalBtn = document.getElementById('openPostModalBtn');
    const closeModalBtn = document.getElementById('closePostModalBtn');
    const modal = document.getElementById('postPetModal');
    const postPetForm = document.getElementById('postPetForm');
    const modalSuccessMessage = document.getElementById('modalSuccessMessage');
    const modalFormContainer = document.getElementById('modalFormContainer');

    if (openModalBtn) {
        openModalBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        });
    }

    function resetModal() {
        modal.style.display = 'none';
        modalSuccessMessage.style.display = 'none'; 
        modalFormContainer.style.display = 'block';
        postPetForm.reset(); 
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            resetModal();
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target == modal) {
            resetModal();
        }
    });

    if (postPetForm) {
        postPetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const petData = {
                name: document.getElementById('postPetName').value,
                type: document.getElementById('postPetType').value,
                photo: document.getElementById('postPetPhoto').value,
                description: document.getElementById('postPetDescription').value,
                contact: document.getElementById('postContactEmail').value,
            };
            console.log('Pet to be posted:', petData);
            modalFormContainer.style.display = 'none';
            modalSuccessMessage.style.display = 'block';
        });
    }

    loadSavedLists();
    populatePetTypes();
});