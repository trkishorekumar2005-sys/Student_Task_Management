// Login script for Student Task Manager
const API_URL = (window.location.port === '5000' || (!window.location.port && window.location.protocol.startsWith('http') && !window.location.href.includes(':5500')))
    ? '/api'
    : 'http://localhost:5000/api';

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const alertMessage = document.getElementById('alertMessage');
const submitBtn = document.getElementById('submitBtn');

function showAlert(message, type = 'danger') {
    alertMessage.textContent = message;
    alertMessage.className = `alert alert-${type} visible`;
}

function clearAlert() {
    alertMessage.textContent = '';
    alertMessage.className = 'alert';
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showAlert('Please fill in all fields.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showAlert(data.error || 'Login failed. Please check your credentials.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Log In';
            return;
        }

        // Save token and student info
        localStorage.setItem('student_token', data.token);
        localStorage.setItem('student_user', JSON.stringify(data.student));

        showAlert('Login successful! Redirecting to dashboard...', 'success');

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 600);

    } catch (err) {
        console.error('Network or server error:', err);
        showAlert('Unable to connect to the server. Please ensure the backend is running.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log In';
    }
});
