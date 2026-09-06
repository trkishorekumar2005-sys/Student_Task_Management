// Dashboard script for Student Task Manager
const API_URL = (window.location.port === '5000' || (!window.location.port && window.location.protocol.startsWith('http') && !window.location.href.includes(':5500')))
    ? '/api'
    : 'http://localhost:5000/api';

const token = localStorage.getItem('student_token');
const userJson = localStorage.getItem('student_user');

// If not logged in, redirect to login page immediately
if (!token) {
    window.location.href = 'login.html';
}

// Student profile display
const studentNameDisplay = document.getElementById('studentNameDisplay');
const logoutBtn = document.getElementById('logoutBtn');
const dashboardAlert = document.getElementById('dashboardAlert');

if (userJson) {
    try {
        const student = JSON.parse(userJson);
        if (student && student.name) {
            studentNameDisplay.textContent = student.name;
        }
    } catch (e) {
        console.error('Error parsing student info', e);
    }
}

// Logout handler
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_user');
    window.location.href = 'login.html';
});

// Feedback alerts
let alertTimeout;
function showAlert(message, type = 'success') {
    clearTimeout(alertTimeout);
    dashboardAlert.textContent = message;
    dashboardAlert.className = `alert alert-${type} visible`;
    alertTimeout = setTimeout(() => {
        dashboardAlert.className = 'alert';
    }, 4000);
}

// Current filter state
let currentFilter = 'all'; // 'all' | 'pending' | 'completed'

// DOM Elements
const createTaskForm = document.getElementById('createTaskForm');
const taskTitleInput = document.getElementById('taskTitle');
const taskDescInput = document.getElementById('taskDescription');
const tasksListContainer = document.getElementById('tasksList');
const taskCountElement = document.getElementById('taskCount');
const filterTabs = document.querySelectorAll('.filter-tab');

// Edit Modal DOM Elements
const editModal = document.getElementById('editModal');
const editTaskForm = document.getElementById('editTaskForm');
const editTaskIdInput = document.getElementById('editTaskId');
const editTaskTitleInput = document.getElementById('editTaskTitle');
const editTaskDescInput = document.getElementById('editTaskDescription');
const editTaskStatusInput = document.getElementById('editTaskStatus');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// Helper for authorized API requests
async function authFetch(endpoint, options = {}) {
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const response = await fetch(`${API_URL}${endpoint}`, options);

    if (response.status === 401 || response.status === 403) {
        // Token invalid or expired
        localStorage.removeItem('student_token');
        localStorage.removeItem('student_user');
        window.location.href = 'login.html';
        return null;
    }

    return response;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, (m) => map[m]);
}

// Format date nicely
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Fetch and render tasks
async function loadTasks() {
    try {
        let endpoint = '/tasks';
        if (currentFilter === 'pending' || currentFilter === 'completed') {
            endpoint += `?status=${currentFilter}`;
        }

        const response = await authFetch(endpoint);
        if (!response) return;

        const tasks = await response.json();

        renderTasks(tasks);
    } catch (err) {
        console.error('Error loading tasks:', err);
        showAlert('Could not load tasks from the server. Check your connection.', 'danger');
    }
}

// Render tasks list
function renderTasks(tasks) {
    taskCountElement.textContent = `Showing ${tasks.length} task${tasks.length === 1 ? '' : 's'}`;

    if (!tasks || tasks.length === 0) {
        let emptyMessage = 'No tasks found. Add a task above to get started!';
        if (currentFilter === 'pending') emptyMessage = 'No pending tasks. You are all caught up!';
        if (currentFilter === 'completed') emptyMessage = 'No completed tasks yet.';

        tasksListContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <h3>${emptyMessage}</h3>
                <p>Use the form above to add assignments, homework, and study reminders.</p>
            </div>
        `;
        return;
    }

    tasksListContainer.innerHTML = tasks.map((task) => {
        const isCompleted = task.status === 'completed';
        const badgeClass = isCompleted ? 'badge-completed' : 'badge-pending';
        const badgeText = isCompleted ? 'Completed' : 'Pending';
        const toggleBtnText = isCompleted ? '↩ Reopen' : '✓ Complete';
        const toggleBtnClass = isCompleted ? 'btn-outline' : 'btn-primary';

        return `
            <div class="task-card ${isCompleted ? 'completed' : 'pending'}" data-id="${task.id}">
                <div class="task-content">
                    <div class="task-header">
                        <h3 class="task-title">${escapeHtml(task.title)}</h3>
                        <span class="task-badge ${badgeClass}">${badgeText}</span>
                    </div>
                    ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
                    <div class="task-meta">
                        Created: ${formatDate(task.created_at)}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn ${toggleBtnClass} btn-sm toggle-status-btn" data-id="${task.id}" data-current="${task.status}">
                        ${toggleBtnText}
                    </button>
                    <button class="btn btn-secondary btn-sm edit-task-btn" 
                        data-id="${task.id}" 
                        data-title="${escapeHtml(task.title)}" 
                        data-desc="${escapeHtml(task.description || '')}"
                        data-status="${task.status}">
                        ✏ Edit
                    </button>
                    <button class="btn btn-danger btn-sm delete-task-btn" data-id="${task.id}">
                        🗑 Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Attach button event listeners
    attachTaskActionListeners();
}

// Action button listeners
function attachTaskActionListeners() {
    // Complete / Reopen Toggle
    document.querySelectorAll('.toggle-status-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const taskId = btn.getAttribute('data-id');
            const currentStatus = btn.getAttribute('data-current');
            const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

            try {
                const res = await authFetch(`/tasks/${taskId}/complete`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: newStatus })
                });

                if (res && res.ok) {
                    showAlert(newStatus === 'completed' ? 'Task marked as completed! 🎉' : 'Task marked as pending.');
                    loadTasks();
                } else {
                    showAlert('Failed to update task status.', 'danger');
                }
            } catch (e) {
                showAlert('Error updating task status.', 'danger');
            }
        });
    });

    // Edit Task Click
    document.querySelectorAll('.edit-task-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const title = btn.getAttribute('data-title');
            const desc = btn.getAttribute('data-desc');
            const status = btn.getAttribute('data-status');

            openEditModal(id, title, desc, status);
        });
    });

    // Delete Task Click
    document.querySelectorAll('.delete-task-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const taskId = btn.getAttribute('data-id');
            const confirmed = confirm('Are you sure you want to delete this task?');
            if (!confirmed) return;

            try {
                const res = await authFetch(`/tasks/${taskId}`, {
                    method: 'DELETE'
                });

                if (res && res.ok) {
                    showAlert('Task deleted successfully.');
                    loadTasks();
                } else {
                    showAlert('Failed to delete task.', 'danger');
                }
            } catch (e) {
                showAlert('Error deleting task.', 'danger');
            }
        });
    });
}

// Create new task handler
createTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = taskTitleInput.value.trim();
    const description = taskDescInput.value.trim();

    if (!title) {
        showAlert('Please provide a task title.', 'danger');
        return;
    }

    try {
        const response = await authFetch('/tasks', {
            method: 'POST',
            body: JSON.stringify({ title, description })
        });

        if (response && response.ok) {
            showAlert('Task created successfully!');
            taskTitleInput.value = '';
            taskDescInput.value = '';
            loadTasks();
        } else {
            const data = await response.json();
            showAlert(data.error || 'Failed to create task.', 'danger');
        }
    } catch (err) {
        showAlert('Error connecting to server to create task.', 'danger');
    }
});

// Filter tabs handler
filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        filterTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.getAttribute('data-filter');
        loadTasks();
    });
});

// Modal open/close functions
function openEditModal(id, title, desc, status) {
    editTaskIdInput.value = id;
    editTaskTitleInput.value = title;
    editTaskDescInput.value = desc || '';
    editTaskStatusInput.value = status || 'pending';
    editModal.classList.add('active');
}

function closeEditModal() {
    editModal.classList.remove('active');
    editTaskForm.reset();
}

closeEditModalBtn.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);
editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
        closeEditModal();
    }
});

// Edit form submit handler
editTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editTaskIdInput.value;
    const title = editTaskTitleInput.value.trim();
    const description = editTaskDescInput.value.trim();
    const status = editTaskStatusInput.value;

    if (!title) {
        alert('Title cannot be empty.');
        return;
    }

    try {
        const response = await authFetch(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ title, description, status })
        });

        if (response && response.ok) {
            showAlert('Task updated successfully!');
            closeEditModal();
            loadTasks();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to update task.');
        }
    } catch (err) {
        alert('Error updating task.');
    }
});

// Initial load
loadTasks();
