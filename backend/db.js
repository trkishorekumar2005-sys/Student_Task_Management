const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_task_manager',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper function to test DB connection and ensure tables exist
async function initializeDatabase() {
    try {
        // Test connection without database selected first in case database needs creation
        const rootConnection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306
        });

        const dbName = process.env.DB_NAME || 'student_task_manager';
        await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        await rootConnection.end();

        // Create tables if they do not exist
        const connection = await pool.getConnection();

        await connection.query(`
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(191) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                status ENUM('pending', 'completed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        connection.release();
        console.log('Database connected and tables initialized successfully.');
    } catch (err) {
        console.warn('MySQL initialization notice: Could not connect to MySQL database.');
        console.warn('Reason:', err.message);
        console.warn('Please ensure MySQL server is running and credentials in .env are correct.');
    }
}

module.exports = {
    pool,
    initializeDatabase
};
