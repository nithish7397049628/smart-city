/**
 * Smart City 360 - Authentication Controller
 */

function demoLogin(role) {
  const emailInput = document.getElementById('email');
  const passInput = document.getElementById('password');

  if (role === 'admin') {
    emailInput.value = 'admin@smartcity360.gov.in';
    passInput.value = 'admin123';
  } else if (role === 'official') {
    emailInput.value = 'official@smartcity360.gov.in';
    passInput.value = 'official123';
  } else {
    emailInput.value = 'citizen@gmail.com';
    passInput.value = 'citizen123';
  }

  // Trigger login automatically
  const form = document.getElementById('loginForm');
  if (form) form.requestSubmit();
}

document.addEventListener('DOMContentLoaded', () => {
  // Login Form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const btn = document.getElementById('btnLogin');

      btn.disabled = true;
      btn.textContent = 'Authenticating...';

      try {
        const res = await apiPost('/auth/login', { email, password });
        if (res.success) {
          setUser(res.user, res.token);
          showToast(`Welcome back, ${res.user.full_name}!`, 'success');
          
          setTimeout(() => {
            if (['official', 'admin'].includes(res.user.role)) {
              window.location.href = '/dashboard.html';
            } else {
              window.location.href = '/index.html';
            }
          }, 600);
        }
      } catch (err) {
        showToast(err.message || 'Login failed. Check credentials.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });
  }

  // Registration Form
  const regForm = document.getElementById('registerForm');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const full_name = document.getElementById('regFullName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const phone_number = document.getElementById('regPhone').value.trim();
      const password = document.getElementById('regPassword').value;
      const btn = document.getElementById('btnRegister');

      btn.disabled = true;
      btn.textContent = 'Creating account...';

      try {
        const res = await apiPost('/auth/register', { full_name, email, phone_number, password, role: 'citizen' });
        if (res.success) {
          setUser(res.user, res.token);
          showToast('Account created successfully! Welcome to Smart City 360.', 'success');
          setTimeout(() => {
            window.location.href = '/index.html';
          }, 600);
        }
      } catch (err) {
        showToast(err.message || 'Registration failed.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    });
  }
});
