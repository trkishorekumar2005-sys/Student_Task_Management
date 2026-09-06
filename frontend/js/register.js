// Registration script for Student Task Manager
const API_URL = (window.location.port === '5000' || (!window.location.port && window.location.protocol.startsWith('http') && !window.location.href.includes(':5500')))
    ? '/api'
    : 'http://localhost:5000/api';

const registerForm = document.getElementById('registerForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
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

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Client-side validations
    if (!name || !email || !password || !confirmPassword) {
        showAlert('Please fill in all fields.');
        return;
    }

    if (password.length < 6) {
        showAlert('Password must be at least 6 characters long.');
        return;
    }

    if (password !== confirmPassword) {
        showAlert('Passwords do not match. Please verify.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showAlert(data.error || 'Registration failed.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register';
            return;
        }

        showAlert('Account created successfully! Redirecting to login...', 'success');
        registerForm.reset();

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);

    } catch (err) {
        console.error('Network or server error:', err);
        showAlert('Unable to connect to the server. Please ensure the backend is running.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
    }
});
