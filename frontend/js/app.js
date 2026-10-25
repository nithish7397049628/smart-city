/**
 * Smart City 360 - Common Application Utilities & State Engine
 */

const API_BASE = '/api';

// Toast Notification Manager
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `<span style="font-weight: bold; font-size: 1.1rem;">${iconMap[type] || 'ℹ'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Authentication Helpers
function getToken() {
  return localStorage.getItem('sc360_token');
}

function getUser() {
  try {
    const raw = localStorage.getItem('sc360_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setUser(user, token) {
  if (user) localStorage.setItem('sc360_user', JSON.stringify(user));
  if (token) localStorage.setItem('sc360_token', token);
  updateAuthUI();
}

function logout() {
  localStorage.removeItem('sc360_user');
  localStorage.removeItem('sc360_token');
  showToast('Logged out successfully', 'info');
  setTimeout(() => {
    window.location.href = '/index.html';
  }, 600);
}

// API Request Wrapper
async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only set application/json if not sending FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
    
    // Check for download file
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/csv')) {
      return await res.blob();
    }

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || 'API request failed');
    }
    return json;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

async function apiGet(endpoint) {
  return apiRequest(endpoint, { method: 'GET' });
}

async function apiPost(endpoint, data) {
  const isForm = data instanceof FormData;
  return apiRequest(endpoint, {
    method: 'POST',
    body: isForm ? data : JSON.stringify(data)
  });
}

async function apiPatch(endpoint, data) {
  const isForm = data instanceof FormData;
  return apiRequest(endpoint, {
    method: 'PATCH',
    body: isForm ? data : JSON.stringify(data)
  });
}

// Modal Helpers
function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('open');
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('open');
}

// Format Relative Time (e.g. "3 hours ago")
function timeAgo(dateString) {
  if (!dateString) return 'Just now';
  const past = new Date(dateString).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateString).toLocaleDateString();
}

// Render Header Authentication Badge / Actions
function updateAuthUI() {
  const user = getUser();
  const container = document.getElementById('headerUserSection');
  if (!container) return;

  if (user) {
    const roleBadge = user.role === 'admin' ? 'Admin' : (user.role === 'official' ? 'Official' : 'Citizen');
    const initial = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';
    
    container.innerHTML = `
      <div class="user-menu">
        <a href="${user.role === 'citizen' ? '/track.html' : '/dashboard.html'}" class="btn btn-secondary btn-sm" style="display:flex; align-items:center; gap:8px;">
          <div class="user-avatar-badge">${initial}</div>
          <span>${user.full_name.split(' ')[0]} <small style="color:var(--teal-600); font-weight:700;">(${roleBadge})</small></span>
        </a>
        <button onclick="logout()" class="btn btn-secondary btn-sm" title="Log Out" style="padding: 6px 10px;">
          <span>🚪</span>
        </button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <a href="/login.html" class="btn btn-secondary btn-sm" data-i18n="nav_login">Login / Register</a>
    `;
  }
}

// Mobile Nav Toggle Setup
function setupMobileNav() {
  const toggle = document.querySelector('.mobile-nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
  }
}

// Quick Upvote Action Handler
async function handleUpvote(complaintId, btnElement) {
  try {
    const user = getUser();
    const phone = user ? user.phone_number : 'Citizen-' + Math.floor(Math.random()*10000);
    const res = await apiPost(`/complaints/${complaintId}/support`, { citizen_phone: phone });
    
    if (res.alreadySupported) {
      showToast('You have already confirmed / supported this issue.', 'info');
    } else {
      showToast('Thank you! Issue support recorded and priority escalated.', 'success');
      if (btnElement) {
        btnElement.classList.add('supported');
        const countSpan = btnElement.querySelector('.support-count');
        if (countSpan) countSpan.textContent = res.upvote_count;
      }
    }
  } catch (err) {
    showToast('Could not register support: ' + err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  setupMobileNav();

  // Highlight active nav item
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '/' && href === '/index.html')) {
      link.classList.add('active');
    }
  });
});
