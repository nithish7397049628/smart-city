/**
 * Smart City 360 - Interactive Live Map Logic
 * Leaflet, OpenStreetMap, Priority Pins, Heatmap, and Zone Clustering
 */

let map = null;
let markersLayerGroup = null;
let heatmapLayer = null;
let isHeatmapActive = false;
let allComplaints = [];
let allAreas = [];
let activeModalComplaint = null;

// Initialize Map
function initMap() {
  const defaultCoords = [13.0418, 80.2341];

  map = L.map('leafletMap', {
    center: defaultCoords,
    zoom: 13,
    zoomControl: true
  });

  // OpenStreetMap Tile Layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  markersLayerGroup = L.layerGroup().addTo(map);

  // Check URL params for focus ID
  const urlParams = new URLSearchParams(window.location.search);
  const focusId = urlParams.get('focus');

  loadMapData(focusId);
}

// Fetch complaints and areas from API
async function loadMapData(focusId = null) {
  try {
    const [compRes, areaRes, catRes] = await Promise.all([
      apiGet('/complaints'),
      apiGet('/stats/areas'),
      apiGet('/complaints/categories')
    ]);

    if (catRes.success && catRes.data) {
      populateCategoryDropdown(catRes.data);
    }

    if (areaRes.success && areaRes.data) {
      allAreas = areaRes.data;
      renderPriorityZonePills(allAreas);
    }

    if (compRes.success && compRes.data) {
      allComplaints = compRes.data;
      renderMarkers(allComplaints);
      renderSidebarList(allComplaints);

      if (focusId) {
        focusOnComplaint(focusId);
      }
    }
  } catch (err) {
    console.error('Error loading map data:', err);
    showToast('Failed to load map complaint data: ' + err.message, 'error');
  }
}

// Populate Category Filter
function populateCategoryDropdown(categories) {
  const select = document.getElementById('filterCategory');
  categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

// Render Priority Zones in Sidebar
function renderPriorityZonePills(areas) {
  const container = document.getElementById('priorityZonesContainer');
  const criticalCount = areas.filter(a => a.risk_level === 'Critical').length;
  document.getElementById('priorityZoneCountBadge').textContent = `${criticalCount} Critical Zones`;

  container.innerHTML = areas.map(area => {
    const color = area.risk_level === 'Critical' ? 'var(--priority-critical)' : (area.risk_level === 'High' ? 'var(--priority-high)' : 'var(--priority-medium)');
    return `
      <button onclick="flyToZone(${area.center_lat}, ${area.center_lng}, '${area.name}')" 
              style="padding:6px 12px; border-radius:var(--radius-full); border:1px solid ${color}; background:#fff; font-size:0.78rem; font-weight:700; color:${color}; white-space:nowrap; cursor:pointer; display:flex; align-items:center; gap:6px; box-shadow:var(--shadow-sm);">
        <span style="width:8px; height:8px; border-radius:50%; background:${color};"></span>
        ${area.name.split(' ')[0]} (${area.priority_score})
      </button>
    `;
  }).join('');
}

function flyToZone(lat, lng, areaName) {
  map.flyTo([lat, lng], 15, { duration: 1.2 });
  showToast(`Inspecting Priority Zone: ${areaName}`, 'info');

  // Filter complaints to this area
  document.getElementById('mapSearchInput').value = areaName.split(' ')[0];
  applyFilters();
}

// Render Markers with Priority Colors
function renderMarkers(complaints) {
  markersLayerGroup.clearLayers();

  complaints.forEach(c => {
    let pinClass = 'pin-low';
    let pulseHtml = '';

    if (['Resolved', 'Closed'].includes(c.status)) {
      pinClass = 'pin-resolved';
    } else if (c.priority_level === 'Critical') {
      pinClass = 'pin-critical';
      pulseHtml = '<div class="pulse-ring" style="position:absolute; width:44px; height:44px; border-radius:50%; background:rgba(239,68,68,0.3); animation:pulse 1.5s infinite;"></div>';
    } else if (c.priority_level === 'High') {
      pinClass = 'pin-high';
    } else if (c.priority_level === 'Medium') {
      pinClass = 'pin-medium';
    }

    const iconHtml = `
      <div style="position:relative; display:flex; align-items:center; justify-content:center; width:34px; height:34px;">
        ${pulseHtml}
        <div class="custom-map-pin ${pinClass}" style="width:30px; height:30px; z-index:2;">
          ${c.priority_score ? Math.round(c.priority_score) : '•'}
        </div>
      </div>
    `;

    const markerIcon = L.divIcon({
      className: '',
      html: iconHtml,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const marker = L.marker([c.latitude, c.longitude], { icon: markerIcon });

    // Interactive Popup Content
    const popupHtml = `
      <div style="font-family:var(--font-body); min-width:240px; padding:4px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-size:0.75rem; font-weight:700; color:var(--teal-700);">${c.category_name}</span>
          <span style="font-size:0.75rem; font-family:monospace; font-weight:700; color:var(--navy-600);">${c.tracking_id}</span>
        </div>
        <h4 style="font-size:0.95rem; font-weight:700; color:var(--navy-900); margin-bottom:6px; line-height:1.3;">
          ${c.title}
        </h4>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:10px;">
          📍 ${c.area_name}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <span class="badge badge-${c.priority_level ? c.priority_level.toLowerCase() : 'low'}" style="font-size:0.75rem;">
            ${c.priority_level} (Score: ${c.priority_score})
          </span>
          <span style="font-size:0.8rem; font-weight:600; color:var(--navy-800);">
            👍 ${c.upvote_count || 0} supporters
          </span>
        </div>
        <button onclick="openComplaintModalFromMap(${c.id})" class="btn btn-primary btn-sm" style="width:100%;">
          View Full Details
        </button>
      </div>
    `;

    marker.bindPopup(popupHtml);
    markersLayerGroup.addLayer(marker);
  });

  document.getElementById('visibleComplaintCount').textContent = complaints.length;
}

// Render Sidebar Complaints List
function renderSidebarList(complaints) {
  const container = document.getElementById('sidebarComplaintsList');
  if (complaints.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:30px 10px; color:var(--text-muted);">
        <p style="font-size:1.2rem; margin-bottom:6px;">🔍</p>
        <p style="font-weight:600;">No complaints match this filter.</p>
        <p style="font-size:0.8rem; margin-top:4px;">Try searching another keyword or clearing category filters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = complaints.map(c => {
    const priorityClass = `badge-${c.priority_level ? c.priority_level.toLowerCase() : 'medium'}`;
    return `
      <div class="complaint-card" style="margin-bottom:12px; cursor:pointer;" onclick="panToComplaint(${c.latitude}, ${c.longitude}, ${c.id})">
        <div class="card-body" style="padding:14px;">
          <div class="card-meta-line" style="margin-bottom:6px;">
            <span class="category-pill" style="font-size:0.72rem; padding:2px 8px;">${c.category_name}</span>
            <span class="badge ${priorityClass}" style="font-size:0.72rem; padding:2px 8px;">
              ${c.priority_level} (${c.priority_score})
            </span>
          </div>

          <h4 style="font-size:0.95rem; font-weight:700; margin-bottom:6px; color:var(--navy-900);">
            ${c.title}
          </h4>

          <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px;">
            📍 ${c.area_name}
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
            <span style="font-weight:600; color:var(--teal-700);">Status: ${c.status}</span>
            <span style="color:var(--text-muted);">👍 ${c.upvote_count || 0}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function panToComplaint(lat, lng, id) {
  map.flyTo([lat, lng], 16, { duration: 1.0 });
  markersLayerGroup.eachLayer(layer => {
    if (layer.getLatLng && Math.abs(layer.getLatLng().lat - lat) < 0.0001 && Math.abs(layer.getLatLng().lng - lng) < 0.0001) {
      layer.openPopup();
    }
  });
}

function focusOnComplaint(id) {
  const found = allComplaints.find(c => String(c.id) === String(id) || c.tracking_id === String(id));
  if (found) {
    panToComplaint(found.latitude, found.longitude, found.id);
    openComplaintDetailModal(found);
  }
}

// Open Full Complaint Details Modal
window.openComplaintModalFromMap = function (complaintId) {
  const complaint = allComplaints.find(c => Number(c.id) === Number(complaintId));
  if (complaint) openComplaintDetailModal(complaint);
};

function openComplaintDetailModal(c) {
  activeModalComplaint = c;

  document.getElementById('modalCategoryBadge').textContent = c.category_name;
  document.getElementById('modalTrackingBadge').textContent = c.tracking_id;
  document.getElementById('modalDetailTitle').textContent = c.title;
  document.getElementById('modalDetailDesc').textContent = c.description;
  document.getElementById('modalDetailLocation').textContent = `${c.address_landmark}, ${c.area_name}, ${c.city}`;
  document.getElementById('modalDetailDate').textContent = `${new Date(c.created_at).toLocaleString()} (${timeAgo(c.created_at)})`;
  document.getElementById('modalUpvoteCount').textContent = c.upvote_count || 0;
  document.getElementById('modalTrackLink').href = `/track.html?id=${c.tracking_id}`;

  // Image
  const imgWrap = document.getElementById('modalImageWrap');
  const imgEl = document.getElementById('modalDetailImage');
  if (c.images && c.images.length > 0) {
    imgEl.src = c.images[0];
    imgWrap.style.display = 'block';
  } else {
    imgEl.src = 'assets/images/hero-city.svg';
    imgWrap.style.display = 'block';
  }

  // Priority Badge
  const pBadge = document.getElementById('modalPriorityBadge');
  pBadge.className = `badge badge-${c.priority_level ? c.priority_level.toLowerCase() : 'low'}`;
  pBadge.textContent = `${c.priority_level} Priority (Score: ${c.priority_score})`;

  // Status Badge
  const sBadge = document.getElementById('modalStatusBadge');
  sBadge.className = 'badge';
  sBadge.style.background = 'var(--navy-800)';
  sBadge.style.color = '#fff';
  sBadge.textContent = c.status;

  // Remarks
  const remarksSec = document.getElementById('modalRemarksSection');
  if (c.resolution_remarks) {
    remarksSec.style.display = 'block';
    document.getElementById('modalRemarksText').textContent = c.resolution_remarks;
  } else {
    remarksSec.style.display = 'none';
  }

  openModal('complaintDetailModal');
}

// Filter Event Listeners
function applyFilters() {
  const search = document.getElementById('mapSearchInput').value.toLowerCase().trim();
  const cat = document.getElementById('filterCategory').value;
  const prio = document.getElementById('filterPriority').value;
  const stat = document.getElementById('filterStatus').value;

  const filtered = allComplaints.filter(c => {
    if (cat && String(c.category_id) !== String(cat)) return false;
    if (prio && c.priority_level.toLowerCase() !== prio.toLowerCase()) return false;
    if (stat && c.status.toLowerCase() !== stat.toLowerCase()) return false;
    if (search) {
      const match = (
        (c.title && c.title.toLowerCase().includes(search)) ||
        (c.area_name && c.area_name.toLowerCase().includes(search)) ||
        (c.address_landmark && c.address_landmark.toLowerCase().includes(search)) ||
        (c.tracking_id && c.tracking_id.toLowerCase().includes(search))
      );
      if (!match) return false;
    }
    return true;
  });

  renderMarkers(filtered);
  renderSidebarList(filtered);

  if (isHeatmapActive) {
    updateHeatmap(filtered);
  }
}

// Heatmap Layer Toggle
async function toggleHeatmap() {
  isHeatmapActive = !isHeatmapActive;
  const btn = document.getElementById('btnToggleHeatmap');
  const icon = document.getElementById('heatmapIcon');
  const text = document.getElementById('heatmapText');

  if (isHeatmapActive) {
    map.removeLayer(markersLayerGroup);

    try {
      const res = await apiGet('/stats/geo-heatmap');
      if (res.success && res.points) {
        if (heatmapLayer) map.removeLayer(heatmapLayer);

        heatmapLayer = L.heatLayer(res.points, {
          radius: 35,
          blur: 20,
          maxZoom: 17,
          gradient: {
            0.2: '#3B82F6',
            0.4: '#10B981',
            0.6: '#F59E0B',
            0.8: '#F97316',
            1.0: '#EF4444'
          }
        }).addTo(map);

        btn.style.background = 'var(--priority-critical-bg)';
        btn.style.borderColor = 'var(--priority-critical)';
        btn.style.color = 'var(--priority-critical)';
        icon.textContent = '📍';
        text.textContent = 'Show Marker Pins';
        showToast('Heatmap layer active: highlights concentrated civic crisis zones', 'info');
      }
    } catch (err) {
      showToast('Heatmap could not be loaded: ' + err.message, 'error');
    }
  } else {
    if (heatmapLayer) map.removeLayer(heatmapLayer);
    map.addLayer(markersLayerGroup);

    btn.style.background = 'var(--surface-0)';
    btn.style.borderColor = 'var(--surface-300)';
    btn.style.color = 'var(--navy-800)';
    icon.textContent = '🔥';
    text.textContent = 'Show Heatmap Layer';
    showToast('Standard marker mode restored', 'info');
  }
}

function updateHeatmap(complaints) {
  if (!isHeatmapActive || !heatmapLayer) return;
  const points = complaints
    .filter(c => !['Resolved', 'Closed'].includes(c.status))
    .map(c => [c.latitude, c.longitude, Math.min(1.0, (c.priority_score || 50) / 100)]);
  heatmapLayer.setLatLngs(points);
}

document.addEventListener('DOMContentLoaded', () => {
  initMap();

  document.getElementById('mapSearchInput').addEventListener('input', applyFilters);
  document.getElementById('filterCategory').addEventListener('change', applyFilters);
  document.getElementById('filterPriority').addEventListener('change', applyFilters);
  document.getElementById('filterStatus').addEventListener('change', applyFilters);

  document.getElementById('btnResetFilters').addEventListener('click', () => {
    document.getElementById('mapSearchInput').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterPriority').value = '';
    document.getElementById('filterStatus').value = '';
    applyFilters();
    showToast('Filters reset to default view', 'info');
  });

  document.getElementById('btnToggleHeatmap').addEventListener('click', toggleHeatmap);

  // Geolocation button
  document.getElementById('btnLocateMe').addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          map.flyTo([lat, lng], 15);

          const myPin = L.divIcon({
            className: '',
            html: '<div style="background:#0F766E; width:20px; height:20px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>',
            iconSize: [20, 20]
          });
          L.marker([lat, lng], { icon: myPin }).addTo(map).bindPopup('<strong>Your Location</strong>').openPopup();
          showToast('Located current user position', 'success');
        },
        () => showToast('GPS location permission denied.', 'warning')
      );
    }
  });

  // Modal Upvote
  document.getElementById('modalUpvoteBtn').addEventListener('click', async () => {
    if (activeModalComplaint) {
      await handleUpvote(activeModalComplaint.id);
      document.getElementById('modalUpvoteCount').textContent = (activeModalComplaint.upvote_count || 0) + 1;
    }
  });
});
