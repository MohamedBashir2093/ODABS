const baseUrl = "https://odabs.onrender.com";

document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const newPassword = document.getElementById('newPassword').value;
    const messageDiv = document.getElementById('message');
    
    try {
        const response = await fetch(`${baseURL}/user/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, newPassword })
        });
        
        const data = await response.json();
        
        if (data.success) {
            messageDiv.className = 'message success';
            messageDiv.textContent = 'Password reset successful! Redirecting to login...';
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            messageDiv.className = 'message error';
            messageDiv.textContent = data.msg || 'Failed to reset password';
        }
    } catch (error) {
        console.error('Error:', error);
        messageDiv.className = 'message error';
        messageDiv.textContent = 'An error occurred. Please try again.';
    }
});
