const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const BlockchainEventLogger = require('../event-logger');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dashboard.html'));
});

// Initialize blockchain logger
const logger = new BlockchainEventLogger();

io.on('connection', (socket) => {
    console.log('Dashboard client connected');
    
    socket.on('disconnect', () => {
        console.log('Dashboard client disconnected');
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Medical Blockchain Dashboard running on http://localhost:${PORT}`);
    
    // Initialize monitoring
    logger.initialize().then(() => {
        return logger.startMonitoring();
    }).catch(console.error);
});