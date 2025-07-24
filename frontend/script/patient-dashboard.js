const baseUrl = "https://odabs.onrender.com";

// Check if user is logged in and is a patient
function checkAuth() {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole");
    
    if (!token || role !== "patient") {
        window.location.href = "login.html";
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Load patient info
    await loadPatientInfo();
    
    // Set up tab switching
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Add event listeners for appointment filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            // Load appointments with selected filter
            loadAppointments(this.dataset.filter);
        });
    });
});

// Load patient information
async function loadPatientInfo() {
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
        
        if (data.success) {
            const { name, email, phone, address, profilePicture } = data.data;
            
            // Update form fields
            document.getElementById('name').value = name || '';
            document.getElementById('email').value = email || '';
            document.getElementById('phone').value = phone || '';
            document.getElementById('address').value = address || '';
            
            // Update display fields
            document.getElementById('patientName').textContent = name;
            document.getElementById('patientFullName').textContent = name;
            document.getElementById('patientEmail').textContent = email;
            
            // Update profile pictures
            const profilePreview = document.getElementById('profilePreview');
            const patientAvatar = document.getElementById('patientAvatar');
            
            if (profilePicture) {
                const pictureSrc = baseURL + profilePicture;
                if (profilePreview) profilePreview.src = pictureSrc;
                if (patientAvatar) patientAvatar.src = pictureSrc;
            } else {
                if (profilePreview) profilePreview.src = './assets/user-avatar.png';
                if (patientAvatar) patientAvatar.src = './assets/user-avatar.png';
            }
        }
    } catch (error) {
        console.error('Error loading patient info:', error);
        showNotification('Error loading profile', 'error');
    }
}

// Switch tab function
function switchTab(tabId) {
    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(`${tabId}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to selected menu item
    const selectedMenuItem = document.querySelector(`.menu-item[data-tab="${tabId}"]`);
    if (selectedMenuItem) {
        selectedMenuItem.classList.add('active');
    }

    // Load tab-specific content
    if (tabId === 'appointments') {
        console.log('Loading appointments tab...');
        // Get the current active filter or default to 'today'
        const activeFilter = document.querySelector('.appointment-filters .filter-btn.active');
        const filterType = activeFilter ? activeFilter.getAttribute('data-filter') : 'today';
        loadAppointments(filterType);
    } else if (tabId === 'doctors') {
        loadDoctors();
    } else if (tabId === 'book') {
        loadDoctorsForBooking();
    }
}

// Load appointments with debounce to prevent multiple rapid calls
let loadAppointmentsTimeout;
async function loadAppointments(type = 'today') {
    try {
        console.log('Loading appointments...', type);
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            showNotification('Please log in to view appointments', 'error');
            return;
        }

        const response = await fetch('http://localhost:5000/booking/paticularUser', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Raw appointments data:', data);

        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        // Check the data structure and extract appointments array
        const appointments = data.Data || [];
        console.log('Processed appointments:', appointments);

        if (!Array.isArray(appointments)) {
            console.error('Invalid appointments data structure:', appointments);
            throw new Error('Invalid appointments data received');
        }

        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // Reset time for date comparison

        // Filter appointments based on type
        const filteredAppointments = appointments.filter(appointment => {
            if (!appointment.bookingDate) {
                console.warn('Appointment missing date:', appointment);
                return false;
            }

            const appointmentDate = new Date(appointment.bookingDate);
            appointmentDate.setHours(0, 0, 0, 0); // Reset time for date comparison
            
            switch(type) {
                case 'today':
                    return appointmentDate.getTime() === currentDate.getTime();
                case 'upcoming':
                    return appointmentDate > currentDate;
                case 'past':
                    return appointmentDate < currentDate;
                default:
                    return false;
            }
        });

        console.log('Filtered appointments:', filteredAppointments);

        // Sort appointments
        filteredAppointments.sort((a, b) => {
            const dateA = new Date(a.bookingDate + ' ' + a.bookingSlot);
            const dateB = new Date(b.bookingDate + ' ' + b.bookingSlot);
            return type === 'past' ? dateB - dateA : dateA - dateB;
        });

        const appointmentsContainer = document.getElementById('appointmentsList');
        if (!appointmentsContainer) {
            console.error('Appointments container not found');
            return;
        }

        appointmentsContainer.innerHTML = '';

        if (filteredAppointments.length === 0) {
            appointmentsContainer.innerHTML = `
                <div class="no-appointments">
                    <p>No ${type} appointments found.</p>
                    ${type !== 'past' ? `
                        <button onclick="document.querySelector('[data-tab=\\"book\\"]').click()" class="book-btn">
                            Book New Appointment
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }

        filteredAppointments.forEach(appointment => {
            const appointmentDate = new Date(appointment.bookingDate);
            const formattedDate = appointmentDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const appointmentElement = document.createElement('div');
            appointmentElement.className = 'appointment-card';
            appointmentElement.innerHTML = `
                <div class="appointment-header">
                    <h3>Dr. ${appointment.doctorName || 'Unknown'}</h3>
                    ${appointment.status === 'CANCELLED' ? `<span class="appointment-status cancelled">Cancelled</span>` : ''}
                </div>
                <div class="appointment-details">
                    <p><i class="fas fa-calendar"></i> ${formattedDate}</p>
                    <p><i class="fas fa-clock"></i> ${appointment.bookingSlot}</p>
                    <p><i class="fas fa-stethoscope"></i> ${appointment.specialization || 'General'}</p>
                </div>
                ${(type === 'today' || type === 'upcoming') && appointment.status !== 'CANCELLED' ? `
                    <div class="appointment-actions">
                        <button onclick="cancelAppointment('${appointment._id}')" class="cancel-btn">
                            Cancel Appointment
                        </button>
                    </div>
                ` : ''}
            `;
            appointmentsContainer.appendChild(appointmentElement);
        });

    } catch (error) {
        console.error('Error loading appointments:', error);
        const appointmentsContainer = document.getElementById('appointmentsList');
        if (appointmentsContainer) {
            appointmentsContainer.innerHTML = `
                <div class="error-message">
                    <p>Error loading appointments. Please try again later.</p>
                    <p class="error-details">${error.message}</p>
                </div>
            `;
        }
        showNotification('Failed to load appointments', 'error');
    }
}

// Add CSS for appointment cards and status
const appointmentStyles = document.createElement('style');
appointmentStyles.textContent = `
    .appointment-card {
        background: white;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .appointment-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }

    .appointment-header h3 {
        margin: 0;
        color: #2c3e50;
    }

    .appointment-status {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
    }

    .appointment-status.cancelled {
        background-color: #dc3545;
        color: white;
    }

    .appointment-details {
        margin-top: 10px;
    }

    .appointment-details p {
        margin: 5px 0;
        color: #666;
    }

    .appointment-details i {
        margin-right: 8px;
        color: #007bff;
    }

    .appointment-actions {
        margin-top: 15px;
        display: flex;
        justify-content: flex-end;
    }

    .cancel-btn {
        background-color: #dc3545;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s;
    }

    .cancel-btn:hover {
        background-color: #c82333;
    }

    .error-message {
        text-align: center;
        padding: 20px;
        background: #fff3f3;
        border-radius: 8px;
        margin: 20px 0;
    }

    .error-details {
        color: #dc3545;
        margin: 10px 0;
    }

    .retry-btn {
        background-color: #007bff;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s;
    }

    .retry-btn:hover {
        background-color: #0056b3;
    }

    .book-btn {
        background-color: #2ecc71;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 1rem;
    }

    .book-btn:hover {
        background-color: #27ae60;
    }

    .book-btn.disabled {
        background-color: #ccc !important;
        cursor: not-allowed;
        opacity: 0.7;
    }

    .book-btn.disabled:hover {
        background-color: #ccc !important;
        transform: none;
    }
`;
document.head.appendChild(appointmentStyles);

// Load doctors list
async function loadDoctors() {
    try {
        showLoading('doctorsList');
        const token = localStorage.getItem('token');
        console.log('Token from storage:', token ? 'Token exists' : 'No token found');
        
        if (!token) {
            console.log('No token found, redirecting to login...');
            showNotification('Please login again', 'error');
            window.location.href = 'login.html';
            return;
        }

        // Log the full request details
        const requestOptions = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        console.log('Request URL:', `${baseURL}/user/doctors`);
        console.log('Request headers:', requestOptions.headers);

        const response = await fetch(`${baseURL}/user/doctors`, requestOptions);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            if (response.status === 401) {
                // Clear invalid token and redirect to login
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('Doctors data:', data);
        
        const doctorsList = document.getElementById('doctorsList');
        doctorsList.innerHTML = ''; // Clear existing list

        if (data.success && data.doctors && data.doctors.length > 0) {
            // Store doctors in global variable for filtering
            window.allDoctors = data.doctors;
            
            // Get unique specialties
            const specialties = [...new Set(data.doctors.map(doc => doc.specialty).filter(s => s))];
            console.log('Available specialties:', specialties);
            
            // Update specialty filter
            const specialtyFilter = document.getElementById('specialtyFilter');
            if (specialtyFilter) {
                specialtyFilter.innerHTML = `
                    <option value="">All Specialties</option>
                    ${specialties.map(s => `<option value="${s}">${s}</option>`).join('')}
                `;
            }
            
            // Display all doctors initially
            displayDoctors(data.doctors);
        } else {
            console.log('No doctors found in response:', data);
            doctorsList.innerHTML = '<p class="no-doctors">No doctors available at the moment.</p>';
        }
    } catch (error) {
        console.error('Error loading doctors:', error);
        showError('doctorsList', 'Failed to load doctors list. Please try logging in again.');
        // If we get a 401 error, redirect to login
        if (error.message.includes('401')) {
            console.log('Unauthorized access, redirecting to login...');
            localStorage.removeItem('token'); // Clear invalid token
            window.location.href = 'login.html';
        }
    }
}

function displayDoctorCard(doctor) {
    return `
        <div class="doctor-card">
            <div class="doctor-info">
                <img src="${doctor.profilePicture ? baseURL + doctor.profilePicture : './assets/user-avatar.png'}" alt="Doctor's profile picture" class="doctor-avatar">
                <div class="doctor-details">
                    <h3>${doctor.name}</h3>
                    <p class="specialty">${doctor.specialty || 'No specialty listed'}</p>
                    ${doctor.location ? `<p class="location">${doctor.location}</p>` : ''}
                </div>
            </div>
            <div class="doctor-actions">
                ${doctor.isAvailable === false ? 
                    `<button class="book-btn disabled" disabled>Currently Unavailable</button>` :
                    `<button onclick="handleBookAppointment('${doctor._id}', '${doctor.name}')" class="book-btn">Book Appointment</button>`
                }
            </div>
        </div>
    `;
}

// Display doctors
function displayDoctors(doctors) {
    const doctorsList = document.getElementById('doctorsList');
    doctorsList.innerHTML = '';
    
    if (doctors.length === 0) {
        doctorsList.innerHTML = '<p class="no-doctors">No doctors found for this specialty.</p>';
        return;
    }
    
    doctors.forEach(doctor => {
        const doctorCard = displayDoctorCard(doctor);
        doctorsList.innerHTML += doctorCard;
    });
}

// Filter doctors by specialty
function filterDoctors() {
    if (!window.allDoctors) {
        console.log('No doctors data available for filtering');
        return;
    }

    const selectedSpecialty = document.getElementById('specialtyFilter').value;
    console.log('Filtering by specialty:', selectedSpecialty);
    
    // Filter doctors based on specialty
    const filteredDoctors = selectedSpecialty 
        ? window.allDoctors.filter(doctor => doctor.specialty === selectedSpecialty)
        : window.allDoctors;
    
    console.log('Filtered doctors:', filteredDoctors);
    
    // Display filtered doctors
    displayDoctors(filteredDoctors);
}

// Handle book appointment button click
async function handleBookAppointment(doctorId, doctorName) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please login to book an appointment', 'error');
            return;
        }

        // Switch to book appointment tab
        switchTab('book');
        
        // Wait a short moment for the tab switch to complete and elements to be available
        setTimeout(() => {
            // Set the selected doctor in the dropdown
            const doctorSelect = document.getElementById('doctorSelect');
            if (doctorSelect) {
                // First, ensure we have the doctor in the dropdown
                let option = doctorSelect.querySelector(`option[value="${doctorId}"]`);
                if (!option) {
                    option = new Option(doctorName, doctorId);
                    doctorSelect.add(option);
                }
                doctorSelect.value = doctorId;
                
                // Trigger change event to ensure any event listeners are notified
                const event = new Event('change');
                doctorSelect.dispatchEvent(event);
                
                // Set default date to today
                const dateInput = document.getElementById('appointmentDate');
                if (dateInput) {
                    const today = new Date().toISOString().split('T')[0];
                    dateInput.value = today;
                    dateInput.min = today;
                    
                    // Load time slots for today
                    loadTimeSlots(doctorId, today);
                }
            }
        }, 100); // Small delay to ensure elements are ready
    } catch (error) {
        console.error('Error in handleBookAppointment:', error);
        showNotification('Failed to initialize booking form', 'error');
    }
}

// Load time slots
async function loadTimeSlots(doctorId, date) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please login again', 'error');
            return;
        }

        const timeSlotsContainer = document.getElementById('timeSlots');
        timeSlotsContainer.innerHTML = '<p>Loading available time slots...</p>';

        // First, get all existing bookings for this doctor and date
        const bookingsResponse = await fetch(`${baseURL}/booking/doctor/${doctorId}/${date}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        let bookedSlots = [];
        if (bookingsResponse.ok) {
            const bookingsData = await bookingsResponse.json();
            if (bookingsData.success) {
                bookedSlots = bookingsData.bookings.map(booking => booking.bookingSlot);
            }
        }

        // Get available time slots
        const response = await fetch(`${baseURL}/schedule/slots/${doctorId}/${date}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && data.data.timeSlots) {
                const availableSlots = data.data.timeSlots;

                // Display time slots as radio buttons
                timeSlotsContainer.innerHTML = `
                    <div class="time-slots-grid">
                        ${availableSlots.map(slot => {
                            const isBooked = bookedSlots.includes(slot);
                            return `
                                <div class="time-slot ${isBooked ? 'booked' : ''}">
                                    <input type="radio" id="slot_${slot}" name="timeSlot" value="${slot}" 
                                           ${isBooked ? 'disabled' : ''} onchange="handleTimeSlotSelection(this)">
                                    <label for="slot_${slot}">
                                        ${slot}
                                        ${isBooked ? '<span class="booked-label">Booked</span>' : ''}
                                    </label>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;

                // Add CSS for booked slots and selected slot
                const style = document.createElement('style');
                style.textContent = `
                    .time-slot {
                        transition: all 0.3s ease;
                        border: 2px solid #e0e0e0;
                        border-radius: 8px;
                        padding: 10px;
                        margin: 5px;
                        cursor: pointer;
                        background-color: white;
                    }
                    .time-slot.booked {
                        opacity: 0.7;
                        background-color: #f8d7da;
                        border-color: #f5c6cb;
                    }
                    .time-slot.selected {
                        background-color: #2196f3;
                        border-color: #1976d2;
                        box-shadow: 0 2px 4px rgba(33, 150, 243, 0.3);
                    }
                    .time-slot.selected label {
                        color: white;
                        font-weight: bold;
                    }
                    .time-slot.booked label {
                        cursor: not-allowed;
                        color: #721c24;
                    }
                    .booked-label {
                        display: block;
                        font-size: 0.8em;
                        color: #dc3545;
                        margin-top: 2px;
                    }
                    .time-slot:hover:not(.booked) {
                        background-color: #e3f2fd;
                        border-color: #2196f3;
                    }
                `;
                document.head.appendChild(style);

                // Add function to handle time slot selection
                window.handleTimeSlotSelection = function(input) {
                    // Remove selected class from all time slots
                    document.querySelectorAll('.time-slot').forEach(slot => {
                        slot.classList.remove('selected');
                    });
                    // Add selected class to the parent of the checked radio button
                    if (input.checked) {
                        input.closest('.time-slot').classList.add('selected');
                    }
                };
            } else {
                timeSlotsContainer.innerHTML = '<p>No time slots available for this date.</p>';
            }
        } else {
            throw new Error('Failed to fetch time slots');
        }
    } catch (error) {
        console.error('Error loading time slots:', error);
        document.getElementById('timeSlots').innerHTML = 
            '<p class="error-message">Error loading time slots. Please try again later.</p>';
    }
}

// Book appointment
async function bookAppointment(event) {
    event.preventDefault();
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please login again', 'error');
            return;
        }

        const doctorSelect = document.getElementById('doctorSelect');
        const doctorId = doctorSelect.value;
        const doctorName = doctorSelect.options[doctorSelect.selectedIndex].text;
        
        if (!doctorId) {
            showNotification('Please select a doctor', 'error');
            return;
        }

        const date = document.getElementById('appointmentDate').value;
        if (!date) {
            showNotification('Please select a date', 'error');
            return;
        }

        const timeSlot = document.querySelector('input[name="timeSlot"]:checked')?.value;
        if (!timeSlot) {
            showNotification('Please select a time slot', 'error');
            return;
        }

        // Check if slot is already booked
        const checkResponse = await fetch(`${baseURL}/booking/check/${doctorId}/${date}/${timeSlot}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const checkData = await checkResponse.json();
        if (checkData.isBooked) {
            showNotification('This time slot has already been booked. Please select another slot.', 'error');
            // Refresh time slots to show updated availability
            await loadTimeSlots(doctorId, date);
            return;
        }

        // Show loading state
        const bookingForm = document.getElementById('bookingForm');
        const submitBtn = bookingForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Booking...';

        // Prepare the appointment data
        const appointmentData = {
            doctorId: doctorId,
            doctorName: doctorName,
            bookingDate: date,
            bookingSlot: timeSlot
        };

        console.log('Booking appointment with data:', appointmentData);

        const response = await fetch(`${baseURL}/booking/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
        });

        const data = await response.json();
        console.log('Booking response:', data);

        if (response.ok && data.success) {
            showNotification('Appointment booked successfully!', 'success');
            // Clear form
            bookingForm.reset();
            document.getElementById('timeSlots').innerHTML = '';
            // Switch to appointments tab and refresh
            switchTab('appointments');
            await loadAppointments();
        } else {
            throw new Error(data.msg || 'Failed to book appointment');
        }
    } catch (error) {
        console.error('Error in bookAppointment:', error);
        showNotification(error.message || 'An error occurred while booking. Please try again.', 'error');
    } finally {
        // Reset button state
        const submitBtn = document.getElementById('bookingForm')?.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Book Appointment';
        }
    }
}

// Load doctors for appointment booking
async function loadDoctorsForBooking() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please login again', 'error');
            return;
        }

        const response = await fetch(`${baseURL}/user/doctors`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load doctors');
        }

        const data = await response.json();
        
        const doctorSelect = document.getElementById('doctorSelect');
        if (doctorSelect) {
            // Clear existing options except the first one
            while (doctorSelect.options.length > 1) {
                doctorSelect.remove(1);
            }

            // Add only available doctors to select
            data.doctors.forEach(doctor => {
                if (doctor.isAvailable !== false) {
                    const option = new Option(doctor.name, doctor._id);
                    doctorSelect.add(option);
                }
            });
        }
    } catch (error) {
        console.error('Error loading doctors:', error);
        showNotification('Failed to load doctors', 'error');
    }
}

// Initialize event listeners when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Load initial appointments
    loadAppointments();
    
    // Load doctors for booking
    loadDoctorsForBooking();
    
    // Add event listener for specialty filter
    const specialtyFilter = document.getElementById('specialtyFilter');
    if (specialtyFilter) {
        specialtyFilter.addEventListener('change', filterDoctors);
    }
    
    // Add event listener for date change
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            const doctorId = document.getElementById('doctorSelect').value;
            if (doctorId && this.value) {
                loadTimeSlots(doctorId, this.value);
            }
        });
    }

    // Add event listener for doctor selection change
    const doctorSelect = document.getElementById('doctorSelect');
    if (doctorSelect) {
        doctorSelect.addEventListener('change', function() {
            const date = document.getElementById('appointmentDate').value;
            if (this.value && date) {
                loadTimeSlots(this.value, date);
            }
        });
    }

    // Add event listener for booking form submission
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', bookAppointment);
    }
});

// Logout function
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// Update patient profile
async function updateProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please login again', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('name', document.getElementById('name').value);
        formData.append('email', document.getElementById('email').value);
        formData.append('phone', document.getElementById('phone').value);
        formData.append('address', document.getElementById('address').value);

        const fileInput = document.getElementById('profilePicture');
        if (fileInput && fileInput.files[0]) {
            formData.append('profilePicture', fileInput.files[0]);
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
            showNotification('Profile updated successfully', 'success');
            
            // Update profile pictures if a new one was uploaded
            if (data.data.profilePicture) {
                const pictureSrc = baseURL + data.data.profilePicture;
                const profilePreview = document.getElementById('profilePreview');
                const patientAvatar = document.getElementById('patientAvatar');
                if (profilePreview) profilePreview.src = pictureSrc;
                if (patientAvatar) patientAvatar.src = pictureSrc;
            }
            
            // Update display name
            const name = document.getElementById('name').value;
            document.getElementById('patientName').textContent = name;
            document.getElementById('patientFullName').textContent = name;
            
            // Update local storage
            localStorage.setItem('userName', name);
            
            // Refresh the profile information
            await loadPatientInfo();
        } else {
            throw new Error(data.msg || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification(error.message, 'error');
    }
}

// Cancel appointment
async function cancelAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Please login again', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const response = await fetch(`${baseURL}/booking/remove/${appointmentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.msg.includes('deleted successfully')) {
            showNotification('Appointment cancelled successfully', 'success');
            loadAppointments();
        } else {
            if (response.status === 401) {
                showNotification('Session expired. Please login again', 'error');
                window.location.href = 'login.html';
            } else {
                showNotification(data.msg || 'Failed to cancel appointment', 'error');
            }
        }
        
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showNotification('Failed to cancel appointment', 'error');
    }
}

// Load doctor profile for viewing
async function loadDoctorProfileForView(doctorId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${baseURL}/user/doctor/${doctorId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        
        if (data.success) {
            // Display the doctor's profile
            const profileContent = document.getElementById('profile-content');
            if (profileContent) {
                const profilePicture = data.data.profilePicture 
                    ? baseURL + data.data.profilePicture 
                    : './assets/doctor-avatar.png';

                profileContent.innerHTML = `
                    <div class="doctor-profile-view">
                        <div class="profile-header">
                            <img src="${profilePicture}" alt="Doctor's profile picture" class="profile-picture">
                            <div class="profile-info">
                                <h2>${data.data.name}</h2>
                                <p class="specialty">${data.data.specialty || 'Specialty not specified'}</p>
                                <div class="availability-indicator">
                                    <span class="status-dot ${data.data.isAvailable ? 'available' : 'unavailable'}"></span>
                                    <span class="status-text ${data.data.isAvailable ? 'available' : 'unavailable'}">
                                        ${data.data.isAvailable ? 'Available' : 'Not Available'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="profile-body">
                            <div class="bio-section">
                                <h3>About</h3>
                                <p>${data.data.bio || 'No bio available'}</p>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.log('Error loading doctor profile:', error);
    }
}

// Load doctor profile
async function loadDoctorProfile(doctorId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${baseURL}/user/doctor/${doctorId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            displayDoctorProfile(data.data);
        }
    } catch (error) {
        console.log('Error loading doctor profile:', error);
    }
}

// Utility Functions
function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function formatTimeSlot(slot) {
    try {
        const [hours, minutes] = slot.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
        console.error('Error formatting time slot:', error);
        return slot;
    }
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
    
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Add notification styles
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        z-index: 1000;
        opacity: 1;
        transition: opacity 0.5s ease;
    }
    
    .notification.success {
        background-color: #28a745;
    }
    
    .notification.error {
        background-color: #dc3545;
    }
    
    .notification.fade-out {
        opacity: 0;
    }
`;
document.head.appendChild(notificationStyles);

// Add CSS for loading spinner and error messages
const style = document.createElement('style');
style.textContent = `
    .loading-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
    }
    
    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .error-message {
        text-align: center;
        padding: 2rem;
        background-color: #fff3f3;
        border-radius: 8px;
        margin: 1rem 0;
    }
    
    .error-details {
        color: #666;
        font-size: 0.9rem;
        margin-top: 0.5rem;
    }
    
    .retry-btn {
        background-color: #3498db;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 1rem;
    }
    
    .retry-btn:hover {
        background-color: #2980b9;
    }
    
    .no-data {
        text-align: center;
        padding: 2rem;
        background-color: #f8f9fa;
        border-radius: 8px;
        margin: 1rem 0;
    }
    
    .book-btn {
        background-color: #2ecc71;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 1rem;
    }
    
    .book-btn:hover {
        background-color: #27ae60;
    }
`;
document.head.appendChild(style);
