/**
 * Smart City 360 - Complaint Registration Form Logic
 */

let pickerMap = null;
let pickerMarker = null;
let selectedCategoryId = 2; // Default to Damaged Roads
let duplicateCheckTimeout = null;
let foundDuplicateComplaint = null;

// Categories metadata with intuitive icons
const categoryIcons = {
  1: '💡', // Streetlight
  2: '🚧', // Damaged Roads
  3: '🚰', // Water Supply
  4: '💧', // Water Pipeline Leakage
  5: '⚡', // Electrical Line
  6: '🕳️', // Drainage and Sewage
  7: '🗑️', // Garbage Collection
  8: '📦', // Waste Management
  9: '🌊', // Flooding and Waterlogging
  10: '🌳', // Fallen Trees
  11: '🚦', // Traffic and Road Safety
  12: '🚻', // Public Toilet Maintenance
  13: '🌲', // Public Park Maintenance
  14: '🐕', // Stray Animal Problems
  15: '⚠️'  // Other Civic Issues
};

// Initialize Leaflet Map for Location Selection
function initPickerMap() {
  const defaultLat = 13.0418;
  const defaultLng = 80.2341;

  pickerMap = L.map('locationPickerMap', {
    center: [defaultLat, defaultLng],
    zoom: 14,
    scrollWheelZoom: true
  });

  // OpenStreetMap Tile Layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(pickerMap);

  // Custom Draggable Pin Icon
  const pinIcon = L.divIcon({
    className: 'custom-map-pin pin-critical',
    html: '📍',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  });

  pickerMarker = L.marker([defaultLat, defaultLng], {
    draggable: true,
    icon: pinIcon
  }).addTo(pickerMap);

  // Marker drag event
  pickerMarker.on('dragend', function (e) {
    const pos = e.target.getLatLng();
    updateLocationCoords(pos.lat, pos.lng);
  });

  // Map click event
  pickerMap.on('click', function (e) {
    pickerMarker.setLatLng(e.latlng);
    updateLocationCoords(e.latlng.lat, e.latlng.lng);
  });
}

function updateLocationCoords(lat, lng) {
  const formattedLat = Number(lat).toFixed(6);
  const formattedLng = Number(lng).toFixed(6);

  document.getElementById('latitude').value = formattedLat;
  document.getElementById('longitude').value = formattedLng;
  document.getElementById('displayLat').textContent = formattedLat;
  document.getElementById('displayLng').textContent = formattedLng;

  // Trigger duplicate detection debounce
  clearTimeout(duplicateCheckTimeout);
  duplicateCheckTimeout = setTimeout(() => {
    checkDuplicateIssues(formattedLat, formattedLng, selectedCategoryId);
  }, 600);
}

// Fetch and Populate All 15 Categories
async function loadCategories() {
  const grid = document.getElementById('categoryGrid');
  try {
    const res = await apiGet('/complaints/categories');
    if (res.success && res.data) {
      grid.innerHTML = res.data.map(cat => `
        <div class="category-option-card ${cat.id === selectedCategoryId ? 'selected' : ''}" 
             data-id="${cat.id}" 
             onclick="selectCategory(${cat.id})">
          <div class="cat-icon">${categoryIcons[cat.id] || '🏛️'}</div>
          <div>
            <div class="cat-text">${cat.name}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${cat.base_severity} Severity</div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading categories:', err);
    grid.innerHTML = '<div style="color:red; grid-column:1/-1;">Could not load categories</div>';
  }
}

function selectCategory(catId) {
  selectedCategoryId = catId;
  document.getElementById('category_id').value = catId;

  document.querySelectorAll('.category-option-card').forEach(card => {
    if (Number(card.dataset.id) === Number(catId)) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  // Re-check duplicates with new category
  const lat = document.getElementById('latitude').value;
  const lng = document.getElementById('longitude').value;
  if (lat && lng) checkDuplicateIssues(lat, lng, catId);
}

// Check for existing reports near this location
async function checkDuplicateIssues(lat, lng, catId) {
  try {
    const res = await apiGet(`/complaints/check-duplicate?latitude=${lat}&longitude=${lng}&category_id=${catId}&radius=0.4`);
    const alertBox = document.getElementById('duplicateAlert');
    const duplicateList = document.getElementById('duplicateList');

    if (res.success && res.hasPotentialDuplicate && res.matches.length > 0) {
      foundDuplicateComplaint = res.matches[0];
      duplicateList.innerHTML = `
        <div style="background:#fff; border:1px solid #FCD34D; border-radius:var(--radius-md); padding:10px 14px;">
          <div style="font-weight:700; color:var(--navy-900); font-size:0.95rem;">${foundDuplicateComplaint.title}</div>
          <div style="font-size:0.82rem; color:var(--text-muted); margin-top:2px;">
            Ticket: <strong>${foundDuplicateComplaint.tracking_id}</strong> | Reported at: ${foundDuplicateComplaint.area_name} | Support: ${foundDuplicateComplaint.upvote_count} citizens
          </div>
        </div>
      `;
      alertBox.classList.add('show');
    } else {
      foundDuplicateComplaint = null;
      alertBox.classList.remove('show');
    }
  } catch (err) {
    // Non-critical, ignore
  }
}

// Support Existing Issue Handler
document.addEventListener('DOMContentLoaded', () => {
  initPickerMap();
  loadCategories();

  // Pre-fill user contact info if logged in
  const user = getUser();
  if (user) {
    if (user.full_name) document.getElementById('citizen_name').value = user.full_name;
    if (user.phone_number) document.getElementById('citizen_phone').value = user.phone_number;
    if (user.email) document.getElementById('citizen_email').value = user.email;
  }

  // Geolocation Button
  document.getElementById('btnUseMyLocation').addEventListener('click', () => {
    if (navigator.geolocation) {
      document.getElementById('locationAddressHint').textContent = 'Fetching satellite GPS position...';
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          pickerMap.setView([lat, lng], 16);
          pickerMarker.setLatLng([lat, lng]);
          updateLocationCoords(lat, lng);
          document.getElementById('locationAddressHint').textContent = 'GPS location locked accurately.';
          showToast('GPS position acquired successfully', 'success');
        },
        (error) => {
          showToast('Geolocation permission denied or timed out. Please click map manually.', 'warning');
          document.getElementById('locationAddressHint').textContent = 'Click map to mark location';
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      showToast('Geolocation is not supported by your browser.', 'error');
    }
  });

  // Photo Upload Preview & Size Validation
  const photoInput = document.getElementById('complaint_photos');
  const previewContainer = document.getElementById('imagePreviewContainer');

  photoInput.addEventListener('change', () => {
    previewContainer.innerHTML = '';
    const files = Array.from(photoInput.files);

    if (files.length > 3) {
      showToast('You can upload a maximum of 3 photographs.', 'warning');
      photoInput.value = '';
      return;
    }

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        showToast(`File "${file.name}" exceeds 5MB size limit.`, 'error');
        photoInput.value = '';
        previewContainer.innerHTML = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.width = '80px';
        img.style.height = '80px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '8px';
        img.style.border = '1px solid var(--surface-300)';
        previewContainer.appendChild(img);
      };
      reader.readAsDataURL(file);
    }
  });

  // Duplicate button actions
  document.getElementById('btnSupportExisting').addEventListener('click', async () => {
    if (foundDuplicateComplaint) {
      await handleUpvote(foundDuplicateComplaint.id);
      window.location.href = `/track.html?id=${foundDuplicateComplaint.tracking_id}`;
    }
  });

  document.getElementById('btnIgnoreDuplicate').addEventListener('click', () => {
    document.getElementById('duplicateAlert').classList.remove('show');
  });

  // Form Submission
  const form = document.getElementById('complaintForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('btnSubmitComplaint');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳</span> Verifying & Registering...';

    const formData = new FormData(form);

    try {
      const res = await apiPost('/complaints', formData);
      if (res.success) {
        // Show Confirmation Modal
        document.getElementById('modalTrackingId').textContent = res.tracking_id;
        document.getElementById('modalPriorityLevel').textContent = 
          `${res.complaint.priority_level} Priority (Score: ${res.complaint.priority_score})`;
        document.getElementById('modalTrackBtn').href = `/track.html?id=${res.tracking_id}`;

        if (res.government_forwarding && res.government_forwarding.forwarded) {
          document.getElementById('modalGovForwardAlert').style.display = 'block';
          document.getElementById('modalGovRef').textContent = res.government_forwarding.externalReferenceId;
        } else {
          document.getElementById('modalGovForwardAlert').style.display = 'none';
        }

        openModal('confirmModal');
        form.reset();
        previewContainer.innerHTML = '';
      }
    } catch (err) {
      showToast('Error registering complaint: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>🚀</span> Submit Complaint';
    }
  });
});
