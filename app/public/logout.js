(() => {
  function toggleElements(elements, visible) {
    elements.forEach((el) => {
      if (!el) return;
      el.style.display = visible ? '' : 'none';
    });
  }

  function updateAuthUi(isLoggedIn) {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.style.display = isLoggedIn ? '' : 'none';
    }
    const loggedOutButtons = document.querySelectorAll('.auth-login-btn, .auth-signup-btn');
    toggleElements(loggedOutButtons, !isLoggedIn);
  }

  async function refreshSessionState() {
    try {
      await axios.get('/api/me');
      updateAuthUi(true);
    } catch (err) {
      updateAuthUi(false);
    }
  }

  async function handleLogout(event) {
    if (event) {
      event.preventDefault();
    }
    try {
      await axios.post('/api/logout');
    } catch (err) {
      console.error('Logout request failed:', err.message);
    } finally {
      localStorage.removeItem('petToShare');
      localStorage.removeItem('selectedPet');
      updateAuthUi(false);
      window.location.href = 'login.html';
    }
  }

  function init() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }
    updateAuthUi(false);
    refreshSessionState();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
