document.addEventListener('DOMContentLoaded', () => {
    const DEFAULT_LOCATION_TEXT = 'Philadelphia, PA';
    const DEFAULT_ZIP = '19104';

    const typeDropdown = document.getElementById('pet-type');
    const distanceSelect = document.getElementById('distance');
    const locationInput = document.getElementById('location');
    const searchForm = document.getElementById('search-form');
    const petGrid = document.getElementById('pet-grid');
    const wishlistList = document.getElementById('wishlist-list');
    const starredList = document.getElementById('starred-list');

    const PET_TYPES = [
        'Dog',
        'Cat',
        'Rabbit',
        'Bird',
        'Horse',
        'Small & Furry',
        'Barnyard',
        'Scales, Fins & Other'
    ];

    function applyTypesToDropdown(dropdown, types) {
        if (!dropdown) return;
    
        dropdown.innerHTML = '<option value="">All Types</option>';
    
        types.forEach((entry) => {
            const label = typeof entry === 'string' ? entry : entry?.name;
            if (!label) return;
            
            const option = document.createElement('option');
            option.value = label;
            option.textContent = label;
            dropdown.appendChild(option);
        });
    }

    function populatePetTypes() {
        if (!typeDropdown) return;
        applyTypesToDropdown(typeDropdown, PET_TYPES);
    }

    async function fetchPets(params) {
        try {
            const response = await axios.get('/api/pets', { params });
            const pets = response.data.pets;
            return Array.isArray(pets) ? pets : [];
        } catch (error) {
            console.error('Error fetching pets:', error.response ? error.response.data : error.message);
            return [];
        }
    }

    async function savePet(endpoint, pet) {
        try {
            const petKey = pet.id || `${pet.type || 'pet'}-${Date.now()}`;
            await axios.post(`/api/${endpoint}`, { petId: petKey, pet });
            await loadSavedLists();
        } catch (err) {
            if (err.response && err.response.status === 401) {
                alert('Login to save pets.');
                return;
            }
            alert('Unable to save this pet.');
        }
    }

    function renderSavedList(container, items, emptyText) {
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
        try {
            const [wishlistResp, starredResp] = await Promise.all([
                axios.get('/api/wishlist'),
                axios.get('/api/starred')
            ]);
            renderSavedList(wishlistList, wishlistResp.data.items, 'Wishlist is empty.');
            renderSavedList(starredList, starredResp.data.items, 'No starred animals yet.');
        } catch (err) {
            if (err.response && err.response.status === 401) {
                renderSavedList(wishlistList, [], 'Login to build your wishlist.');
                renderSavedList(starredList, [], 'Login to star animals.');
                return;
            }
            renderSavedList(wishlistList, [], 'Unable to load wishlist.');
            renderSavedList(starredList, [], 'Unable to load starred animals.');
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
        if (!petGrid) return;
        petGrid.innerHTML = '';
        if (!Array.isArray(pets) || pets.length === 0) {
            petGrid.innerHTML = '<p>No pets found.</p>';
            return;
        }
        pets.forEach((pet) => {
            petGrid.appendChild(createPetCard(pet));
        });
    }

    function getSearchLocation() {
        const manualLocation = locationInput ? locationInput.value.trim() : '';
        if (manualLocation) {
            return manualLocation;
        }
        return DEFAULT_ZIP;
    }

    async function searchForPets() {
        if (petGrid) {
            petGrid.innerHTML = '<p>Loading pets...</p>';
        }
        const type = typeDropdown ? typeDropdown.value : '';
        const distance = distanceSelect ? distanceSelect.value : 50;
        const location = getSearchLocation();
        const searchParams = { type, distance, location };
        const pets = await fetchPets(searchParams);
        console.log(pets);
        showPets(pets);
    }

    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            searchForPets();
        });
    }

    const openModalBtn = document.getElementById('openPostModalBtn');
    const closeModalBtn = document.getElementById('closePostModalBtn');
    const modal = document.getElementById('postPetModal');
    const postPetForm = document.getElementById('postPetForm');
    const modalSuccessMessage = document.getElementById('modalSuccessMessage');
    const modalFormContainer = document.getElementById('modalFormContainer');

    if (openModalBtn && modal) {
        openModalBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });
    }

    function resetModal() {
        if (!modal || !postPetForm) return;
        modal.style.display = 'none';
        if (modalSuccessMessage) {
            modalSuccessMessage.style.display = 'none';
        }
        if (modalFormContainer) {
            modalFormContainer.style.display = 'block';
        }
        postPetForm.reset();
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            resetModal();
        });
    }

    window.addEventListener('click', (e) => {
        if (modal && e.target === modal) {
            resetModal();
        }
    });

    if (postPetForm) {
        postPetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const petData = {
                // Core Details
                name: document.getElementById('postPetName').value,
                type: document.getElementById('postPetType').value, 
                species: document.getElementById('postPetType').value, 
                age: document.getElementById('postPetAge').value,
                gender: document.getElementById('postPetGender').value,
                size: document.getElementById('postPetSize').value,
                coat: document.getElementById("postPetCoat").value,
                
                // Breed Details
                primary_breed: document.getElementById('postPrimaryBreed').value,
                mixed_breed: document.getElementById('postMixedBreed').checked, 

                // Location & Contact
                zipcode: document.getElementById('postZipcode').value, 
                city: document.getElementById('postCity').value,
                state_code: document.getElementById('postStateCode').value,
                contact_email: document.getElementById('postContactEmail').value,
                contact_phone: document.getElementById('postContactPhone').value,

                // Attributes
                is_spayed_neutered: document.getElementById('postSpayedNeutered').checked,
                is_house_trained: document.getElementById('postHouseTrained').checked,
                is_shots_current: document.getElementById('postShotsCurrent').checked,
                is_special_needs: document.getElementById('postSpecialNeeds').checked,
                is_declawed: document.getElementById('postDeclawed').checked,
                good_with_children: document.getElementById('postGoodChildren').checked,
                good_with_dogs: document.getElementById('postGoodDogs').checked,
                good_with_cats: document.getElementById('postGoodCats').checked,
                
                // Media & Description
                primary_photo_url: document.getElementById('postPetPhotoUrl').value,
                description: document.getElementById('postPetDescription').value,
            };


            try {
                const response = await fetch('/api/user/pets', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // If user authentication, add token here:
                        // 'Authorization': 'Bearer ' + userToken 
                    },
                    body: JSON.stringify(petData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Server error posting pet:', errorData);
                    alert(`Failed to post pet: ${errorData.error || 'Unknown error'}`);
                    return;
                }

                // Success handling
                console.log('Pet successfully posted:', petData);
                if (modalFormContainer) {
                    modalFormContainer.style.display = 'none';
                }
                if (modalSuccessMessage) {
                    modalSuccessMessage.style.display = 'block';
                }

            } catch (error) {
                console.error('Network or fetch error:', error);
                alert('A network error occurred. Please try again.');
            }
        });
    }

    loadSavedLists();
    populatePetTypes();
    //searchForPets();
});
