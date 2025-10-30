//Mock search params 
const params = {
    type: 'dog', 
    location: '19104', 
    distance: 50, 
};

//Test fetchPets
const searchbtn = document.getElementById('search');
searchbtn.addEventListener('click', () => {
    fetchPets(params);
});

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