// Real-Time Delivery Tracker Server

const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Active user tracking (optional for future features)
const activeUsers = new Set();

// Socket.IO handlers
io.on('connection', (socket) => {
    console.log(`Connected: ${socket.id}`);
    activeUsers.add(socket.id);

    // Handle location updates
    socket.on('sendLocation', ({ id, latitude, longitude }) => {
        const clientId = id || socket.id;
        io.emit('receive-location', { id: clientId, latitude, longitude });
    });

    // Optional: handle delivery status updates
    socket.on('updateStatus', ({ id, status }) => {
        io.emit('statusUpdated', { id, status });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Disconnected: ${socket.id}`);
        activeUsers.delete(socket.id);
        io.emit('user-disconnected', socket.id);
    });
});

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});