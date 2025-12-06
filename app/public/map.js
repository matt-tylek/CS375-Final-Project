document.addEventListener('DOMContentLoaded', () => {
    const DEFAULT_VIEW = { lat: 39.9526, lng: -75.1652, zoom: 12 };
    const mapEl = document.getElementById('map');
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

    const mapStatus = mapEl ? document.createElement('div') : null;
    if (mapStatus) {
        mapStatus.className = 'map-status hidden';
        mapStatus.setAttribute('role', 'status');
        mapStatus.setAttribute('aria-live', 'polite');
        mapEl.appendChild(mapStatus);
    }

    function setStatus(message, isError = false) {
        if (!mapStatus) return;
        mapStatus.textContent = message;
        mapStatus.classList.toggle('error', isError);
        mapStatus.classList.toggle('hidden', !message);
    }

    function clearStatus() {
        if (!mapStatus) return;
        mapStatus.textContent = '';
        mapStatus.classList.add('hidden');
        mapStatus.classList.remove('error');
    }

    let map = null;
    const markers = new Map();

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

    function updateActiveCard(idx) {
        if (!shelterListEl) return;
        Array.from(shelterListEl.children).forEach((card, cardIdx) => {
            card.classList.toggle('active', cardIdx === idx);
        });
    }

    function focusShelter(idx) {
        const shelter = shelters[idx];
        if (!shelter) return;
        updateActiveCard(idx);
        if (!map) return;
        const marker = markers.get(shelter.name);
        if (marker) {
            marker.openPopup();
            map.setView(marker.getLatLng(), 13, { animate: true });
        }
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

    renderShelterList();

    if (!mapEl) {
        setStatus('Map container missing. Shelters cannot be displayed on the map.', true);
        console.warn('Map container missing. Shelters cannot be displayed.');
        return;
    }

    if (typeof L === 'undefined') {
        setStatus('Map failed to load. Please refresh once you are back online.', true);
        console.warn('Leaflet is not available. Unable to render map.');
        return;
    }

    setStatus('Loading map...');

    try {
        map = L.map(mapEl, { scrollWheelZoom: true })
            .setView([DEFAULT_VIEW.lat, DEFAULT_VIEW.lng], DEFAULT_VIEW.zoom);
    } catch (error) {
        setStatus('Map could not start. Please refresh and try again.', true);
        console.error('Unable to initialize map:', error);
        return;
    }

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    tileLayer.on('load', clearStatus);
    tileLayer.on('tileerror', () => {
        setStatus('Map tiles could not load. Check your connection and refresh.', true);
    });

    shelters.forEach((shelter) => {
        const marker = L.marker(shelter.coords).addTo(map);
        marker.bindPopup(buildPopup(shelter));
        markers.set(shelter.name, marker);
        marker.on('click', () => {
            const idx = shelters.indexOf(shelter);
            updateActiveCard(idx);
        });
    });

    focusShelter(0);
});
