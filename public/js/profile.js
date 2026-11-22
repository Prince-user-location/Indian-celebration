document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (currentUser) {
        document.getElementById('loggedOutView').style.display = 'none';
        document.getElementById('loggedInView').style.display = 'block';
        
        const firstName = currentUser.name ? currentUser.name.split(' ')[0] : 'User';
        document.getElementById('greetingText').innerText = `Hey, ${firstName}`;
    } else {
        document.getElementById('loggedOutView').style.display = 'block';
        document.getElementById('loggedInView').style.display = 'none';
    }
});

function handleLogout() {
    if(confirm("Kya aap logout karna chahte hain?")) {
        localStorage.removeItem('currentUser');
        alert("Logged out successfully!");
        window.location.href = 'index.html';
    }
}
