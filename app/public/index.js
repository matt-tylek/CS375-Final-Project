//Mock search params 
const params = {
    type: 'cat', 
    location: '19104', 
    distance: 15, 
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
    
    card.addEventListener('click', () => {
        localStorage.setItem('selectedPet', JSON.stringify(pet));
        window.location.href = 'pet.html';
    });

    grid.appendChild(card);
    }
}

const searchBtn = document.getElementById('search');

searchBtn.addEventListener('click', async function () {
  const pets = await fetchPets(params);
  showPets(pets);
});