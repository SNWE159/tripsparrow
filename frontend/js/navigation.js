// Navigation helper functions
function updateNavigation() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Update navigation based on login status
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    
    if (authButtons && userMenu) {
        if (isLoggedIn === 'true' && user.email) {
            authButtons.style.display = 'none';
            userMenu.style.display = 'block';
            document.getElementById('user-name').textContent = user.email;
        } else {
            authButtons.style.display = 'block';
            userMenu.style.display = 'none';
        }
    }
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    updateNavigation();
    
    // Protect pages that require authentication
    const protectedPages = ['preferences.html', 'settings.html', 'tripid.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (isLoggedIn !== 'true') {
            window.location.href = 'logging_signup.html';
            return;
        }
    }
    
    // If user is logged in and tries to access login page, redirect to preferences
    if (currentPage === 'logging_signup.html') {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (isLoggedIn === 'true') {
            window.location.href = 'preferences.html';
        }
    }
});