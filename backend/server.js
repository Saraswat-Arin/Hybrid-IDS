const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const Simulator = require('./simulator');
const Profiler = require('./profiler');
const Detector = require('./detector');
const Mitigator = require('./mitigator');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Initialize Engines
const mitigator = new Mitigator();
const profiler = new Profiler();
const detector = new Detector(mitigator);
const simulator = new Simulator(profiler, detector, mitigator, io);

let systemMetrics = {
    totalPackets: 0,
    activeConnections: 0,
    startTime: Date.now()
};

// Start simulation on app load, but paused
// simulator.start();

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send initial state
    socket.emit('initial_state', {
        attackMode: simulator.attackMode,
        blockedIPs: Array.from(mitigator.blockedIPs.entries()),
        logs: detector.logs.slice(-50),
        threatLevels: detector.threatDist
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// API Routes
app.post('/api/simulator/toggle', (req, res) => {
    const state = simulator.toggleSimulation();
    res.json({ running: state });
});

app.post('/api/simulator/attack', (req, res) => {
    const state = simulator.toggleAttackMode();
    io.emit('attack_mode', { attackMode: state });
    res.json({ attackMode: state });
});

app.get('/api/stats', (req, res) => {
    res.json({
        logs: detector.logs.slice(-100),
        blockedIPs: Array.from(mitigator.blockedIPs.entries()).map(([ip, data]) => ({ ip, ...data })),
        metrics: {
            ...systemMetrics,
            uptime: Date.now() - systemMetrics.startTime
        },
        riskDist: detector.threatDist
    });
});

app.post('/api/mitigator/unblock', (req, res) => {
    const { ip } = req.body;
    mitigator.unblockIP(ip);
    io.emit('ip_unblocked', { ip });
    res.json({ success: true, ip });
});

// Broadcast metrics every second
setInterval(() => {
    io.emit('live_metrics', {
        ...simulator.getMetrics(),
        riskDist: detector.threatDist
    });
}, 1000);

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`IDS Backend listening on port ${PORT}`);
});
