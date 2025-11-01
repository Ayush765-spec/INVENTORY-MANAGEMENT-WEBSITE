// Real-Time Delivery Tracker Client

const socket = io();
const clientId = crypto.randomUUID(); // Unique identifier per tab
let trackingId = null;

// Handle tracking form submission
const trackForm = document.getElementById('trackForm');
if (trackForm) {
    trackForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('trackingId');
        trackingId = input.value.trim();

        if (!trackingId) {
            alert('Please enter a valid tracking ID.');
            return;
        }

        const statusDisplay = document.getElementById('statusDisplay');
        if (statusDisplay) {
            statusDisplay.textContent = `Tracking delivery ID: ${trackingId}`;
        }
    });
}

// Geolocation tracking (for delivery partner)
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        ({ coords }) => {
            const { latitude, longitude } = coords;
            socket.emit('sendLocation', { id: clientId, latitude, longitude });
        },
        (error) => {
            console.error('Geolocation error:', error);
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        }
    );
} else {
    console.warn('Geolocation is not supported by this browser.');
}

// Initialize map
const map = L.map('map').setView([0, 0], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'OpenStreetMap'
}).addTo(map);

const markers = {};

// Handle incoming location updates
socket.on('receive-location', ({ id, latitude, longitude }) => {
    if (!trackingId || id !== trackingId) return;

    if (markers[id]) {
        markers[id].setLatLng([latitude, longitude]);
    } else {
        markers[id] = L.marker([latitude, longitude]).addTo(map);
    }

    map.setView([latitude, longitude], 13);
});

// Remove marker when user disconnects
socket.on('user-disconnected', (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
    }
});