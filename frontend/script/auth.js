const baseUrl = "https://odabs.onrender.com";

// Utility functions
function showLoading(button) {
    button.disabled = true;
    const originalText = button.textContent;
    button.innerHTML = '<span class="loading"></span>Loading...';
    return originalText;
}

function hideLoading(button, originalText) {
    button.disabled = false;
    button.textContent = originalText;
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function clearError() {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
}

// Handle login form submission
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError();
        
        const button = e.target.querySelector('button');
        const originalText = showLoading(button);
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${baseUrl}/user/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                // Store user data
                localStorage.setItem('token', data.token);
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('userEmail', data.email);
                localStorage.setItem('userRole', data.role);
                localStorage.setItem('userName', data.name);
                
                if (data.specialty) localStorage.setItem('specialty', data.specialty);
                if (data.location) localStorage.setItem('location', data.location);

                // Redirect based on role
                window.location.href = data.role === 'doctor' ? 'doctor-dashboard.html' : 'patient-dashboard.html';
            } else {
                showError(data.msg || 'Login failed. Please try again.');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('Network error. Please try again.');
        } finally {
            hideLoading(button, originalText);
        }
    });
}

// Handle registration form
if (document.getElementById('registerForm')) {
    // Show/hide doctor fields based on role selection
    document.getElementById('role').addEventListener('change', function() {
        const doctorField = document.querySelector('.doctor-field');
        if (this.value === 'doctor') {
            doctorField.style.display = 'block';
        } else {
            doctorField.style.display = 'none';
        }
    });

    // Handle form submission
    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            role: document.getElementById('role').value
        };

        // Add specialty if doctor
        if (formData.role === 'doctor') {
            formData.specialty = document.getElementById('specialty').value;
        }

        try {
            const response = await fetch(`${baseUrl}/user/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                // Show success message
                alert('Registration successful! Please login to continue.');
                // Redirect to login page
                window.location.href = 'login.html';
            } else {
                document.getElementById('error-message').textContent = data.msg;
            }
        } catch (error) {
            console.error('Error during registration:', error);
            document.getElementById('error-message').textContent = 'Registration failed. Please try again.';
        }
    });
}

// Prevent accessing auth pages if already logged in
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    
    if (token && role) {
        window.location.href = role === 'doctor' ? 'doctor-dashboard.html' : 'patient-dashboard.html';
    }
});
