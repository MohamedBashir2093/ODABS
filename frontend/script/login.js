const baseUrl = "https://odabs.onrender.com";

// Show loading state
function showLoading() {
    const button = document.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Logging in...';
}

// Hide loading state
function hideLoading() {
    const button = document.querySelector('button[type="submit"]');
    button.disabled = false;
    button.textContent = 'Login';
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('error-message') || document.createElement('div');
    errorDiv.id = 'error-message';
    errorDiv.style.color = 'red';
    errorDiv.style.marginBottom = '10px';
    errorDiv.textContent = message;
    
    const form = document.querySelector('form');
    form.insertBefore(errorDiv, form.firstChild);
}

// Clear error message
function clearError() {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// Handle login form submission
document.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    showLoading();
    
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        showError("Please enter both email and password");
        hideLoading();
        return;
    }

    try {
        console.log("Sending login request...");
        const res = await fetch(`${baseUrl}/user/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        console.log("Response received:", res.status);
        const data = await res.json();
        console.log("Response data:", data);
        
        if (data.success === true) {
            // Store user data in localStorage
            localStorage.setItem("token", data.token);
            localStorage.setItem("userId", data.userId);
            localStorage.setItem("userEmail", data.email);
            localStorage.setItem("userRole", data.role); 
            localStorage.setItem("userName", data.name);
            
            if (data.specialty) {
                localStorage.setItem("specialty", data.specialty);
            }
            if (data.location) {
                localStorage.setItem("location", data.location);
            }
            
            // Redirect based on role
            if (data.role === "doctor") {
                window.location.href = "doctor-dashboard.html";
            } else {
                window.location.href = "patient-dashboard.html";
            }
        } else {
            showError(data.msg || "Login failed. Please try again.");
        }
    } catch (error) {
        console.error("Error during login:", error);
        showError("Network error. Please check your connection and try again.");
    } finally {
        hideLoading();
    }
});