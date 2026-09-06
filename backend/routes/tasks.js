const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'student_task_manager_secret_key_2026';

// Middleware to authenticate JWT token and ensure student access
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
    }

    jwt.verify(token, JWT_SECRET, (err, student) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired authentication token.' });
        }
        req.student = student;
        next();
    });
}

// Apply authentication to all task routes
router.use(authenticateToken);

// GET /api/tasks - View all tasks for current student, with optional status filter (?status=pending|completed)
router.get('/', async (req, res) => {
    try {
        let query = 'SELECT id, student_id, title, description, status, created_at FROM tasks WHERE student_id = ?';
        const params = [req.student.id];

        const { status } = req.query;
        if (status && (status === 'pending' || status === 'completed')) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';

        const [tasks] = await pool.query(query, params);
        return res.status(200).json(tasks);
    } catch (err) {
        console.error('Error fetching tasks:', err);
        return res.status(500).json({ error: 'Internal server error while fetching tasks.' });
    }
});

// POST /api/tasks - Add a new task
router.post('/', async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Task title is required.' });
        }

        const trimmedTitle = title.trim();
        const trimmedDesc = description ? description.trim() : '';

        const [result] = await pool.query(
            'INSERT INTO tasks (student_id, title, description, status) VALUES (?, ?, ?, "pending")',
            [req.student.id, trimmedTitle, trimmedDesc]
        );

        const [rows] = await pool.query(
            'SELECT id, student_id, title, description, status, created_at FROM tasks WHERE id = ?',
            [result.insertId]
        );

        return res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating task:', err);
        return res.status(500).json({ error: 'Internal server error while creating task.' });
    }
});

// PUT /api/tasks/:id - Edit a task
router.put('/:id', async (req, res) => {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'Invalid task ID.' });
        }

        const { title, description, status } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Task title is required.' });
        }

        // Verify task exists and belongs to this student
        const [existing] = await pool.query(
            'SELECT id, status FROM tasks WHERE id = ? AND student_id = ?',
            [taskId, req.student.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Task not found or access denied.' });
        }

        const trimmedTitle = title.trim();
        const trimmedDesc = description ? description.trim() : '';
        const validStatus = (status && (status === 'pending' || status === 'completed')) 
            ? status 
            : existing[0].status;

        await pool.query(
            'UPDATE tasks SET title = ?, description = ?, status = ? WHERE id = ? AND student_id = ?',
            [trimmedTitle, trimmedDesc, validStatus, taskId, req.student.id]
        );

        const [updated] = await pool.query(
            'SELECT id, student_id, title, description, status, created_at FROM tasks WHERE id = ?',
            [taskId]
        );

        return res.status(200).json(updated[0]);
    } catch (err) {
        console.error('Error updating task:', err);
        return res.status(500).json({ error: 'Internal server error while updating task.' });
    }
});

// PUT /api/tasks/:id/complete - Mark a task as completed (or toggle status)
router.put('/:id/complete', async (req, res) => {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'Invalid task ID.' });
        }

        // Verify task exists and belongs to this student
        const [existing] = await pool.query(
            'SELECT id, status FROM tasks WHERE id = ? AND student_id = ?',
            [taskId, req.student.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Task not found or access denied.' });
        }

        // Allow toggling or marking explicitly completed
        const nextStatus = req.body && req.body.status 
            ? req.body.status 
            : (existing[0].status === 'completed' ? 'pending' : 'completed');

        await pool.query(
            'UPDATE tasks SET status = ? WHERE id = ? AND student_id = ?',
            [nextStatus, taskId, req.student.id]
        );

        const [updated] = await pool.query(
            'SELECT id, student_id, title, description, status, created_at FROM tasks WHERE id = ?',
            [taskId]
        );

        return res.status(200).json(updated[0]);
    } catch (err) {
        console.error('Error completing task:', err);
        return res.status(500).json({ error: 'Internal server error while changing task status.' });
    }
});

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', async (req, res) => {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'Invalid task ID.' });
        }

        // Verify task exists and belongs to this student
        const [existing] = await pool.query(
            'SELECT id FROM tasks WHERE id = ? AND student_id = ?',
            [taskId, req.student.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Task not found or access denied.' });
        }

        await pool.query('DELETE FROM tasks WHERE id = ? AND student_id = ?', [taskId, req.student.id]);

        return res.status(200).json({ message: 'Task deleted successfully.' });
    } catch (err) {
        console.error('Error deleting task:', err);
        return res.status(500).json({ error: 'Internal server error while deleting task.' });
    }
});

module.exports = router;
