// ✅ Set correct baseURL to your deployed backend
const baseURL = "https://odabs-backend.onrender.com";

// ✅ Load patient info
async function loadPatientInfo() {
  try {
    const res = await fetch(`${baseURL}/user/profile`, {
      method: 'GET',
      credentials: 'include'
    });
    const data = await res.json();
    document.getElementById("patientName").textContent = data.name;
    document.getElementById("patientEmail").textContent = data.email;
    document.getElementById("patientAvatar").src = data.avatar || "/assets/patient-avatar.png";
  } catch (err) {
    console.error("Error loading patient info:", err);
  }
}

// ✅ Load appointments
async function loadAppointments() {
  try {
    const res = await fetch(`${baseURL}/booking/paticularUser`, {
      method: 'GET',
      credentials: 'include'
    });
    const data = await res.json();
    renderAppointments(data);
  } catch (err) {
    console.error("Error loading appointments:", err);
  }
}

// ✅ Load doctors for booking
async function loadDoctorsForBooking() {
  try {
    const res = await fetch(`${baseURL}/user/doctors`, {
      method: 'GET'
    });
    const doctors = await res.json();
    renderDoctorList(doctors);
  } catch (err) {
    console.error("Error loading doctors:", err);
  }
}

// ✅ Event listeners
document.addEventListener("DOMContentLoaded", () => {
  loadPatientInfo();
  loadAppointments();
  loadDoctorsForBooking();

  // Add other event handlers here
});

// ✅ Placeholder for rendering logic
function renderAppointments(appointments) {
  console.log("Appointments:", appointments);
  // Render them in the DOM
}

function renderDoctorList(doctors) {
  console.log("Doctors:", doctors);
  // Render them in the DOM
}
