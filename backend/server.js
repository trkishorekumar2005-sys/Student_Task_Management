const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./db');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Fallback to index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Centralized error handling
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: 'An unexpected error occurred on the server.' });
});

// Start Server
app.listen(PORT, async () => {
    console.log(`===========================================`);
    console.log(`Student Task Manager Server is running!`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`===========================================`);
    await initializeDatabase();
});
