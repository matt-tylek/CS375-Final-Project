document.addEventListener('DOMContentLoaded', () => {
    const DEFAULT_VIEW = { lat: 39.9526, lng: -75.1652, zoom: 12 };
    const shelterListEl = document.getElementById('shelterList');

    const shelters = [
        {
            name: 'ACCT Philly',
            address: '111 W Hunting Park Ave, Philadelphia, PA 19140',
            phone: '(267) 385-3800',
            website: 'https://acctphilly.org/',
            coords: [39.9997, -75.1402]
        },
        {
            name: 'Pennsylvania SPCA',
            address: '350 E Erie Ave, Philadelphia, PA 19134',
            phone: '(215) 426-6300',
            website: 'https://www.pspca.org/',
            coords: [40.0055, -75.1252]
        },
        {
            name: 'Morris Animal Refuge',
            address: '1242 Lombard St, Philadelphia, PA 19147',
            phone: '(215) 735-9570',
            website: 'https://www.morrisanimalrefuge.org/',
            coords: [39.9438, -75.1623]
        },
        {
            name: 'Philly Animal Welfare Society (PAWS)',
            address: '2900 Grays Ferry Ave, Philadelphia, PA 19146',
            phone: '(215) 298-9680',
            website: 'https://phillypaws.org/',
            coords: [39.9376, -75.1945]
        },
        {
            name: 'Providence Animal Center',
            address: '555 Sandy Bank Rd, Media, PA 19063',
            phone: '(610) 566-1370',
            website: 'https://providenceac.org/',
            coords: [39.9159, -75.3917]
        }
    ];

    if (!document.getElementById('map')) {
        console.warn('Map container missing. Shelters cannot be displayed.');
        return;
    }

    if (typeof L === 'undefined') {
        console.warn('Leaflet is not available. Unable to render map.');
        return;
    }

    const map = L.map('map', {
        scrollWheelZoom: true
    }).setView([DEFAULT_VIEW.lat, DEFAULT_VIEW.lng], DEFAULT_VIEW.zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const markers = new Map();
    let activeMarkerKey = null;

    function buildPopup(shelter) {
        const link = shelter.website ? `<a href="${shelter.website}" target="_blank" rel="noopener">Visit site</a>` : '';
        return `
            <div style="min-width:200px;">
                <strong>${shelter.name}</strong>
                <p style="margin:4px 0;">${shelter.address}<br>${shelter.phone}</p>
                ${link}
            </div>
        `;
    }

    function renderShelterList() {
        if (!shelterListEl) return;
        shelterListEl.innerHTML = '';
        shelters.forEach((shelter, idx) => {
            const li = document.createElement('li');
            li.className = 'shelter-card';
            li.dataset.index = String(idx);
            li.innerHTML = `
                <h3>${shelter.name}</h3>
                <p>${shelter.address}</p>
                <p>${shelter.phone}</p>
                <a href="${shelter.website}" target="_blank" rel="noopener">View website →</a>
            `;
            li.addEventListener('click', () => focusShelter(idx));
            li.addEventListener('keypress', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    focusShelter(idx);
                }
            });
            li.tabIndex = 0;
            shelterListEl.appendChild(li);
        });
    }

    function updateActiveCard(idx) {
        if (!shelterListEl) return;
        Array.from(shelterListEl.children).forEach((card, cardIdx) => {
            card.classList.toggle('active', cardIdx === idx);
        });
    }

    function focusShelter(idx) {
        const shelter = shelters[idx];
        if (!shelter) return;
        const markerKey = shelter.name;
        const marker = markers.get(markerKey);
        if (marker) {
            marker.openPopup();
            map.setView(marker.getLatLng(), 13, { animate: true });
            activeMarkerKey = markerKey;
            updateActiveCard(idx);
        }
    }

    shelters.forEach((shelter) => {
        const marker = L.marker(shelter.coords).addTo(map);
        marker.bindPopup(buildPopup(shelter));
        markers.set(shelter.name, marker);
        marker.on('click', () => {
            const idx = shelters.indexOf(shelter);
            activeMarkerKey = shelter.name;
            updateActiveCard(idx);
        });
    });

    renderShelterList();
    focusShelter(0);
});
