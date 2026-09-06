const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'student_task_manager_secret_key_2026';

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Input validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Please provide name, email, and password.' });
        }

        const trimmedName = name.trim();
        const trimmedEmail = email.trim().toLowerCase();

        if (trimmedName.length < 2) {
            return res.status(400).json({ error: 'Name must be at least 2 characters long.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            return res.status(400).json({ error: 'Please enter a valid email address.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }

        // Check if student already exists
        const [existing] = await pool.query('SELECT id FROM students WHERE email = ? LIMIT 1', [trimmedEmail]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new student
        const [result] = await pool.query(
            'INSERT INTO students (name, email, password) VALUES (?, ?, ?)',
            [trimmedName, trimmedEmail, hashedPassword]
        );

        return res.status(201).json({
            message: 'Registration successful! You can now log in.',
            student: {
                id: result.insertId,
                name: trimmedName,
                email: trimmedEmail
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ error: 'Internal server error during registration.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Input validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide both email and password.' });
        }

        const trimmedEmail = email.trim().toLowerCase();

        // Check student in database
        const [rows] = await pool.query(
            'SELECT id, name, email, password FROM students WHERE email = ? LIMIT 1',
            [trimmedEmail]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const student = rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, student.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: student.id, name: student.name, email: student.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            message: 'Login successful!',
            token,
            student: {
                id: student.id,
                name: student.name,
                email: student.email
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Internal server error during login.' });
    }
});

module.exports = router;
