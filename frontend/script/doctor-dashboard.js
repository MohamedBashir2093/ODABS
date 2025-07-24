const baseUrl = "https://odabs.onrender.com";

// Check if user is logged in and is a doctor
function checkAuth() {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole");
    
    if (!token || role !== "doctor") {
        window.location.href = "login.html";
    }
}

// Document ready handler
document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    loadDoctorInfo();
    setupTabNavigation();
    loadDashboardStats();
    setupDateMinimum();
    setupProfilePicturePreview();
    setupAvailabilityToggle();
});

// Load doctor information
async function loadDoctorInfo() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please login again', 'error');
            return;
        }

        const response = await fetch(`${baseURL}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        console.log('Profile data:', data);
        
        if (data.success) {
            const { name, specialty, profilePicture, bio, isAvailable } = data.data;
            
            // Update form fields
            document.getElementById('name').value = name || '';
            document.getElementById('specialty').value = specialty || '';
            document.getElementById('bio').value = bio || '';
            
            // Update display fields
            document.getElementById('doctorName').textContent = name;
            document.getElementById('doctorFullName').textContent = name;
            document.getElementById('doctorSpecialty').textContent = specialty || 'Specialty not set';
            
            // Update profile picture
            const avatarElement = document.getElementById('doctorAvatar');
            const previewElement = document.getElementById('profilePreview');
            
            if (profilePicture) {
                const pictureSrc = baseURL + profilePicture;
                avatarElement.src = pictureSrc;
                previewElement.src = pictureSrc;
            } else {
                avatarElement.src = './assets/doctor-avatar.png';
                previewElement.src = './assets/doctor-avatar.png';
            }

            // Update availability toggle
            const availabilityToggle = document.getElementById('isAvailable');
            const statusText = document.getElementById('availabilityStatus');
            if (availabilityToggle && statusText) {
                availabilityToggle.checked = isAvailable;
                statusText.textContent = isAvailable ? 'Available' : 'Not Available';
                statusText.className = 'status-text ' + (isAvailable ? 'available' : 'unavailable');
            }
            
            // Store in localStorage
            localStorage.setItem('userName', name);
            localStorage.setItem('specialty', specialty || '');
        }
    } catch (error) {
        console.log('Error loading doctor info:', error);
    }
}

// Initialize dashboard
function setupTabNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.dataset.tab;
            
            // Update active states
            menuItems.forEach(i => i.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));
            
            item.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            // Load tab-specific content
            if (targetTab === 'dashboard') {
                loadDashboardStats();
            } else if (targetTab === 'appointments') {
                loadAppointments();
            } else if (targetTab === 'profile') {
                loadProfile();
            }
        });
    });
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${baseURL}/booking/paticularUser`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.Data) {
            const appointments = data.Data;
            const currentDate = new Date();
            
            // Calculate stats
            const todayAppts = appointments.filter(app => 
                new Date(app.bookingDate).toDateString() === currentDate.toDateString()
            ).length;
            
            const upcomingAppts = appointments.filter(app => 
                new Date(app.bookingDate) > currentDate
            ).length;
            
            const uniquePatients = new Set(appointments.map(app => app.userEmail)).size;
            
            // Update stats display
            document.getElementById('todayAppointments').textContent = todayAppts;
            document.getElementById('upcomingAppointments').textContent = upcomingAppts;
            document.getElementById('totalPatients').textContent = uniquePatients;
            
            // Display recent appointments
            const recentAppointments = appointments
                .filter(app => new Date(app.bookingDate) >= currentDate)
                .sort((a, b) => new Date(a.bookingDate) - new Date(b.bookingDate))
                .slice(0, 5);
                
            displayRecentAppointments(recentAppointments);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showNotification('Failed to load dashboard statistics', 'error');
    }
}

// Display recent appointments
function displayRecentAppointments(appointments) {
    const container = document.getElementById('recentAppointmentsList');
    
    if (!appointments.length) {
        container.innerHTML = `
            <div class="no-data">
                <p>No upcoming appointments</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = appointments.map(app => `
        <div class="appointment-card">
            <div class="appointment-header">
                <h3>Appointment with ${app.userEmail}</h3>
                <span class="appointment-date">${formatDate(app.bookingDate)}</span>
            </div>
            <div class="appointment-details">
                <p><strong>Time:</strong> ${formatTimeSlot(app.bookingSlot)}</p>
                <p><strong>Patient Email:</strong> ${app.userEmail}</p>
            </div>
        </div>
    `).join('');
}

// Load appointments
async function loadAppointments(filter = 'today') {
    try {
        showLoading('appointmentsList');
        
        const response = await fetch(`${baseURL}/booking/paticularUser`, {
            headers: {
                'Authorization': localStorage.getItem('token')
            }
        });
        
        const data = await response.json();
        
        if (!data.Data) {
            showError('appointmentsList', 'No appointments found');
            return;
        }
        
        const appointments = data.Data;
        const currentDate = new Date();
        
        let filteredAppointments;
        if (filter === 'today') {
            filteredAppointments = appointments.filter(app => {
                const appDate = new Date(app.bookingDate);
                return appDate.toDateString() === currentDate.toDateString();
            });
        } else if (filter === 'upcoming') {
            filteredAppointments = appointments.filter(app => {
                const appDate = new Date(app.bookingDate);
                return appDate > currentDate;
            });
        } else {
            filteredAppointments = appointments.filter(app => {
                const appDate = new Date(app.bookingDate);
                return appDate < currentDate;
            });
        }
        
        displayAppointments(filteredAppointments);
        
    } catch (error) {
        console.error('Error loading appointments:', error);
        showError('appointmentsList', 'Failed to load appointments');
    }
}

// Display appointments
function displayAppointments(appointments) {
    const container = document.getElementById('appointmentsList');
    
    if (!appointments.length) {
        container.innerHTML = `
            <div class="no-data">
                <p>No appointments found for this period</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = appointments.map(app => `
        <div class="appointment-card">
            <div class="appointment-header">
                <h3>Appointment with ${app.userEmail}</h3>
                <span class="appointment-date">${formatDate(app.bookingDate)}</span>
            </div>
            <div class="appointment-details">
                <p><strong>Time:</strong> ${formatTimeSlot(app.bookingSlot)}</p>
                <p><strong>Patient Email:</strong> ${app.userEmail}</p>
            </div>
            <div class="appointment-actions">
                ${new Date(app.bookingDate) > new Date() ? `
                    <button onclick="cancelAppointment('${app._id}')" class="cancel-btn">Cancel</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Load and display profile
async function loadProfile() {
    try {
        const response = await fetch(`${baseURL}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const { name, email, specialty, location, bio, profilePicture } = data.data;
            
            document.getElementById('name').value = name || '';
            document.getElementById('email').value = email || '';
            document.getElementById('specialty').value = specialty || '';
            document.getElementById('location').value = location || '';
            document.getElementById('bio').value = bio || '';
            
            // Set profile picture if exists
            const preview = document.getElementById('profilePreview');
            const avatar = document.getElementById('doctorAvatar');
            const pictureSrc = profilePicture || './assets/doctor-avatar.png';
            preview.src = pictureSrc;
            avatar.src = pictureSrc;
            
            // Update local storage
            localStorage.setItem('userName', name);
            localStorage.setItem('userEmail', email);
            localStorage.setItem('specialty', specialty || '');
            localStorage.setItem('location', location || '');
        } else {
            showNotification('Failed to load profile', 'error');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Failed to load profile', 'error');
    }
}

// Setup profile picture preview
function setupProfilePicturePreview() {
    const fileInput = document.getElementById('profilePicture');
    const preview = document.getElementById('profilePreview');
    const defaultAvatar = './assets/doctor-avatar.png';
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
                // Also update the sidebar avatar
                document.getElementById('doctorAvatar').src = e.target.result;
            }
            reader.readAsDataURL(file);
        } else {
            preview.src = defaultAvatar;
            document.getElementById('doctorAvatar').src = defaultAvatar;
        }
    });
}

// Setup availability toggle
function setupAvailabilityToggle() {
    const toggle = document.getElementById('isAvailable');
    const statusText = document.getElementById('availabilityStatus');

    if (toggle && statusText) {
        toggle.addEventListener('change', function() {
            updateAvailabilityStatus(this.checked);
        });
    }
}

// Update availability status
async function updateAvailabilityStatus(isAvailable) {
    const statusText = document.getElementById('availabilityStatus');
    const toggle = document.getElementById('isAvailable');

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please login again', 'error');
            return;
        }

        const response = await fetch(`${baseURL}/user/update`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isAvailable })
        });

        const data = await response.json();

        if (data.success) {
            // Update status text and classes
            statusText.textContent = isAvailable ? 'Available' : 'Not Available';
            statusText.className = 'status-text ' + (isAvailable ? 'available' : 'unavailable');
            showNotification('Availability updated successfully', 'success');
        } else {
            // Revert toggle if update failed
            toggle.checked = !isAvailable;
            statusText.textContent = !isAvailable ? 'Available' : 'Not Available';
            statusText.className = 'status-text ' + (!isAvailable ? 'available' : 'unavailable');
            showNotification(data.msg || 'Failed to update availability', 'error');
        }
    } catch (error) {
        console.error('Error updating availability:', error);
        // Revert toggle if update failed
        toggle.checked = !isAvailable;
        statusText.textContent = !isAvailable ? 'Available' : 'Not Available';
        statusText.className = 'status-text ' + (!isAvailable ? 'available' : 'unavailable');
        showNotification('Failed to update availability', 'error');
    }
}

// Update profile
async function updateProfile(event) {
    event.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('name').value);
    formData.append('specialty', document.getElementById('specialty').value);
    formData.append('bio', document.getElementById('bio').value);
    formData.append('isAvailable', document.getElementById('isAvailable').checked);
    
    // Add profile picture if selected
    const fileInput = document.getElementById('profilePicture');
    if (fileInput.files[0]) {
        formData.append('profilePicture', fileInput.files[0]);
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please login again', 'error');
            return;
        }

        const response = await fetch(`${baseURL}/user/update`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update local storage
            localStorage.setItem('userName', formData.get('name'));
            localStorage.setItem('specialty', formData.get('specialty'));
            
            showNotification('Profile updated successfully', 'success');
            
            // Update the images if a new profile picture was uploaded
            if (data.data && data.data.profilePicture) {
                const pictureSrc = baseURL + data.data.profilePicture;
                const preview = document.getElementById('profilePreview');
                const avatar = document.getElementById('doctorAvatar');
                preview.src = pictureSrc;
                avatar.src = pictureSrc;
            }
            
            // Refresh doctor info
            await loadDoctorInfo();
        } else {
            showNotification(data.msg || 'Failed to update profile', 'error');
        }
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Failed to update profile', 'error');
    }
}

// Cancel appointment
async function cancelAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
        return;
    }
    
    try {
        const response = await fetch(`${baseURL}/booking/remove/${appointmentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': localStorage.getItem('token')
            }
        });
        
        const data = await response.json();
        
        if (data.msg.includes('deleted successfully')) {
            showNotification('Appointment cancelled successfully', 'success');
            loadAppointments();
        } else {
            showNotification(data.msg || 'Failed to cancel appointment', 'error');
        }
        
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showNotification('Failed to cancel appointment', 'error');
    }
}

// Utility Functions
function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function formatTimeSlot(slot) {
    const slots = {
        '8-9': '8:00 AM - 9:00 AM',
        '9-10': '9:00 AM - 10:00 AM',
        '10-11': '10:00 AM - 11:00 AM',
        '11-12': '11:00 AM - 12:00 PM',
        '2-3': '2:00 PM - 3:00 PM',
        '3-4': '3:00 PM - 4:00 PM',
        '4-5': '4:00 PM - 5:00 PM'
    };
    return slots[slot] || slot;
}

function setupDateMinimum() {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];
    dateInputs.forEach(input => input.min = today);
}

function showLoading(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '<div class="loading-spinner"></div>';
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="error-message">${message}</div>`;
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Logout function
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// Event Listeners
document.getElementById('profileForm')?.addEventListener('submit', updateProfile);

// Filter appointment listeners
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        loadAppointments(e.target.dataset.filter);
    });
});
