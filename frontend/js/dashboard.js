/**
 * Smart City 360 - Government Officials & Admin Dashboard Controller
 */

let categoryChartInstance = null;
let priorityChartInstance = null;
let departmentChartInstance = null;

let queueComplaints = [];
let allDepartments = [];

// Initialize Dashboard
async function initDashboard() {
  const user = getUser();
  // Auto-login as demo official if not logged in for instant testing ease
  if (!user || !['official', 'admin'].includes(user.role)) {
    const defaultOfficial = {
      id: 2,
      full_name: 'Chief Municipal Engineer',
      email: 'official@smartcity360.gov.in',
      role: 'official',
      department_id: 2
    };
    setUser(defaultOfficial, 'demo_official_jwt_token_2026');
    showToast('Logged in as Chief Municipal Engineer (Official Portal Session)', 'info');
  }

  setupTabs();
  await refreshDashboardData();
  setupEventListeners();
}

function setupTabs() {
  document.querySelectorAll('.dashboard-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.dashboard-nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');

      item.classList.add('active');
      const targetTab = item.dataset.tab;
      const pane = document.getElementById(targetTab);
      if (pane) pane.style.display = 'block';

      // Load specific tab data
      if (targetTab === 'tabGovGateway') loadGovLogs();
      if (targetTab === 'tabAlgorithmConfig') loadSettings();
    });
  });
}

// Refresh all telemetry and queue data
async function refreshDashboardData() {
  try {
    const [statsRes, complaintsRes, deptsRes] = await Promise.all([
      apiGet('/stats/overview'),
      apiGet('/complaints'),
      apiGet('/complaints/departments')
    ]);

    if (statsRes.success && statsRes.data) {
      updateOverviewMetrics(statsRes.data);
      renderCharts(statsRes.data);
    }

    if (deptsRes.success && deptsRes.data) {
      allDepartments = deptsRes.data;
      renderDepartmentsTab(allDepartments);
      populateDepartmentSelect(allDepartments);
    }

    if (complaintsRes.success && complaintsRes.data) {
      queueComplaints = complaintsRes.data;
      renderQueueTable(queueComplaints);
    }
  } catch (err) {
    console.error('Error refreshing dashboard:', err);
    showToast('Error fetching dashboard data: ' + err.message, 'error');
  }
}

function updateOverviewMetrics(s) {
  document.getElementById('dashTotal').textContent = s.total;
  document.getElementById('dashPending').textContent = s.pending;
  document.getElementById('dashProgress').textContent = s.inProgress;
  document.getElementById('dashResolved').textContent = s.resolved;
  document.getElementById('dashCritical').textContent = (s.priorityCounts && s.priorityCounts.Critical) || 0;
  
  const rate = s.total > 0 ? Math.round((s.resolved / s.total) * 100) : 100;
  document.getElementById('dashResolutionRate').textContent = `${rate}%`;
}

// Render Chart.js Visualizations
function renderCharts(stats) {
  // 1. Categories Chart
  const catCanvas = document.getElementById('categoryChart');
  if (catCanvas && stats.categoryCounts) {
    if (categoryChartInstance) categoryChartInstance.destroy();

    const labels = Object.keys(stats.categoryCounts);
    const data = Object.values(stats.categoryCounts);

    categoryChartInstance = new Chart(catCanvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: [
            '#0D9488', '#F97316', '#EF4444', '#3B82F6', '#8B5CF6',
            '#EC4899', '#10B981', '#F59E0B', '#6366F1', '#14B8A6'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } }
        }
      }
    });
  }

  // 2. Priority Chart
  const prioCanvas = document.getElementById('priorityChart');
  if (prioCanvas && stats.priorityCounts) {
    if (priorityChartInstance) priorityChartInstance.destroy();

    priorityChartInstance = new Chart(prioCanvas, {
      type: 'bar',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          label: 'Number of Active Complaints',
          data: [
            stats.priorityCounts.Critical || 0,
            stats.priorityCounts.High || 0,
            stats.priorityCounts.Medium || 0,
            stats.priorityCounts.Low || 0
          ],
          backgroundColor: ['#EF4444', '#F97316', '#F59E0B', '#10B981'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  // 3. Department Resolution Performance Chart
  const deptCanvas = document.getElementById('departmentChart');
  if (deptCanvas && stats.departmentStats) {
    if (departmentChartInstance) departmentChartInstance.destroy();

    const labels = stats.departmentStats.map(d => d.name.split(' ')[0]);
    const totalData = stats.departmentStats.map(d => d.total);
    const resolvedData = stats.departmentStats.map(d => d.resolved);

    departmentChartInstance = new Chart(deptCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Assigned',
            data: totalData,
            backgroundColor: '#CBD5E1',
            borderRadius: 4
          },
          {
            label: 'Resolved',
            data: resolvedData,
            backgroundColor: '#0D9488',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
}

// Render Queue Table
function renderQueueTable(complaints) {
  const tbody = document.getElementById('queueTableBody');
  if (complaints.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px;">No complaints match this filter.</td></tr>';
    return;
  }

  tbody.innerHTML = complaints.map(c => {
    const priorityClass = `badge-${c.priority_level ? c.priority_level.toLowerCase() : 'low'}`;
    return `
      <tr>
        <td>
          <a href="/track.html?id=${c.tracking_id}" style="font-family:monospace; font-weight:800; color:var(--teal-700);">
            ${c.tracking_id}
          </a>
        </td>
        <td>
          <div style="font-weight:600; color:var(--navy-900);">${c.citizen_name || 'Citizen'}</div>
          <div style="font-size:0.78rem; color:var(--text-muted);">${c.citizen_phone || 'Private'}</div>
        </td>
        <td>
          <div style="font-size:0.8rem; font-weight:700; color:var(--teal-600);">${c.category_name}</div>
          <div style="font-size:0.9rem; font-weight:600; color:var(--navy-900); max-width:240px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.title}</div>
        </td>
        <td>
          <span style="font-size:0.85rem; color:var(--navy-800);">📍 ${c.area_name}</span>
        </td>
        <td>
          <span class="badge ${priorityClass}">
            ${c.priority_level} (${c.priority_score})
          </span>
        </td>
        <td>
          <span class="badge" style="background:var(--navy-900); color:#fff;">
            ${c.status}
          </span>
        </td>
        <td>
          <span style="font-weight:700; color:var(--navy-800);">👍 ${c.upvote_count || 0}</span>
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button onclick="openStatusModal(${c.id})" class="btn btn-primary btn-sm" title="Update status & remarks">
              Update
            </button>
            <button onclick="forwardToGovApi(${c.id})" class="btn btn-secondary btn-sm" title="Forward to Official Government API">
              Bridge API
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterQueueTable() {
  const search = document.getElementById('queueSearchInput').value.toLowerCase().trim();
  const prio = document.getElementById('queuePriorityFilter').value;
  const stat = document.getElementById('queueStatusFilter').value;

  const filtered = queueComplaints.filter(c => {
    if (prio && c.priority_level.toLowerCase() !== prio.toLowerCase()) return false;
    if (stat && c.status.toLowerCase() !== stat.toLowerCase()) return false;
    if (search) {
      const match = (
        (c.tracking_id && c.tracking_id.toLowerCase().includes(search)) ||
        (c.title && c.title.toLowerCase().includes(search)) ||
        (c.citizen_name && c.citizen_name.toLowerCase().includes(search)) ||
        (c.area_name && c.area_name.toLowerCase().includes(search))
      );
      if (!match) return false;
    }
    return true;
  });

  renderQueueTable(filtered);
}

// Status Update Modal
window.openStatusModal = function(complaintId) {
  const c = queueComplaints.find(item => Number(item.id) === Number(complaintId));
  if (!c) return;

  document.getElementById('updateComplaintId').value = c.id;
  document.getElementById('updateModalTicket').textContent = c.tracking_id;
  document.getElementById('updateModalTitle').textContent = c.title;
  document.getElementById('updateStatusSelect').value = c.status;
  document.getElementById('updateDepartmentSelect').value = c.assigned_department_id || 1;
  document.getElementById('updateOfficialRemarks').value = c.resolution_remarks || '';

  openModal('statusUpdateModal');
};

function populateDepartmentSelect(depts) {
  const select = document.getElementById('updateDepartmentSelect');
  select.innerHTML = depts.map(d => `
    <option value="${d.id}">${d.name} (${d.code})</option>
  `).join('');
}

// Render Departments Tab Cards
function renderDepartmentsTab(depts) {
  const container = document.getElementById('departmentsListContainer');
  container.innerHTML = depts.map(d => `
    <div style="background:#fff; border-radius:var(--radius-lg); padding:20px; border:1px solid var(--surface-200); box-shadow:var(--shadow-sm);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span class="category-pill" style="font-size:0.75rem;">${d.code}</span>
        <span style="font-size:0.8rem; font-weight:700; color:var(--teal-700);">Dept ID #${d.id}</span>
      </div>
      <h3 style="font-size:1.15rem; color:var(--navy-900); margin-bottom:6px;">${d.name}</h3>
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px; min-height:40px;">${d.description || 'Civic infrastructure body'}</p>
      
      <div style="background:var(--surface-50); padding:10px 12px; border-radius:var(--radius-md); font-size:0.82rem; margin-bottom:12px;">
        <div>👤 <strong>Designated Head:</strong> ${d.head_name || 'Zonal Officer'}</div>
        <div>📞 <strong>Phone:</strong> ${d.contact_phone || 'Control Room'}</div>
        <div>✉️ <strong>Email:</strong> ${d.contact_email || 'dept@smartcity360.gov.in'}</div>
      </div>
    </div>
  `).join('');
}

// Manually Forward to Government Department API (Section 11)
window.forwardToGovApi = async function(complaintId) {
  try {
    const res = await apiPost(`/official/complaints/${complaintId}/forward`, {});
    if (res.success) {
      showToast(`Success! Bridged to Government API. External Ref: ${res.externalReferenceId}`, 'success');
      loadGovLogs();
    }
  } catch (err) {
    showToast('Failed to forward to Government API: ' + err.message, 'error');
  }
};

// Load Government API Gateway Logs
async function loadGovLogs() {
  const tbody = document.getElementById('govLogsTableBody');
  try {
    const res = await apiGet('/settings/logs');
    if (res.success && res.data) {
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;">No external gateway transmissions recorded yet.</td></tr>';
        return;
      }
      tbody.innerHTML = res.data.map(l => `
        <tr>
          <td style="font-family:monospace; font-weight:700;">#${l.id}</td>
          <td><code>Ticket #${l.complaint_id}</code></td>
          <td>Dept #${l.department_id || 1}</td>
          <td><strong style="color:var(--teal-700);">${l.external_reference_id}</strong></td>
          <td>
            <span class="badge" style="background:#ECFDF5; color:#065F46;">
              ${l.status}
            </span>
          </td>
          <td style="font-size:0.8rem; color:var(--text-muted);">${new Date(l.synced_at).toLocaleString()}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Failed to load logs</td></tr>';
  }
}

// Load Algorithm Weights Settings
async function loadSettings() {
  try {
    const res = await apiGet('/settings');
    if (res.success && res.data) {
      const s = res.data;
      if (s.priority_weight_frequency) document.getElementById('weightFreq').value = s.priority_weight_frequency;
      if (s.priority_weight_unresolved) document.getElementById('weightUnres').value = s.priority_weight_unresolved;
      if (s.priority_weight_severity) document.getElementById('weightSev').value = s.priority_weight_severity;
      if (s.priority_weight_recency) document.getElementById('weightRec').value = s.priority_weight_recency;
      if (s.priority_weight_reporters) document.getElementById('weightRep').value = s.priority_weight_reporters;
    }
  } catch (e) {}
}

function setupEventListeners() {
  // Queue Filters
  document.getElementById('queueSearchInput').addEventListener('input', filterQueueTable);
  document.getElementById('queuePriorityFilter').addEventListener('change', filterQueueTable);
  document.getElementById('queueStatusFilter').addEventListener('change', filterQueueTable);

  // Status Form Submit
  const statusForm = document.getElementById('statusUpdateForm');
  statusForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('updateComplaintId').value;
    const status = document.getElementById('updateStatusSelect').value;
    const department_id = document.getElementById('updateDepartmentSelect').value;
    const remarks = document.getElementById('updateOfficialRemarks').value;
    const photoFiles = document.getElementById('resolutionEvidenceFiles').files;

    const formData = new FormData();
    formData.append('status', status);
    formData.append('department_id', department_id);
    formData.append('remarks', remarks);
    for (let f of photoFiles) {
      formData.append('resolution_evidence', f);
    }

    try {
      const btn = document.getElementById('btnSaveStatusUpdate');
      btn.disabled = true;
      btn.textContent = 'Saving & Logging Audit...';

      const res = await apiPatch(`/official/complaints/${id}/status`, formData);
      if (res.success) {
        showToast(`Status updated to "${status}" and audit trail recorded.`, 'success');
        closeModal('statusUpdateModal');
        await refreshDashboardData();
      }
    } catch (err) {
      showToast('Error updating status: ' + err.message, 'error');
    } finally {
      document.getElementById('btnSaveStatusUpdate').disabled = false;
      document.getElementById('btnSaveStatusUpdate').textContent = 'Save Status & Notify Citizen';
    }
  });

  // Export CSV Action
  document.getElementById('btnExportCsv').addEventListener('click', async () => {
    try {
      showToast('Preparing CSV report download...', 'info');
      const blob = await apiGet('/official/export-csv');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartcity360_complaints_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('CSV downloaded successfully!', 'success');
    } catch (err) {
      showToast('Could not export CSV: ' + err.message, 'error');
    }
  });

  // Algorithm Weights Form Submit
  const weightsForm = document.getElementById('weightsConfigForm');
  weightsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      priority_weight_frequency: parseFloat(document.getElementById('weightFreq').value),
      priority_weight_unresolved: parseFloat(document.getElementById('weightUnres').value),
      priority_weight_severity: parseFloat(document.getElementById('weightSev').value),
      priority_weight_recency: parseFloat(document.getElementById('weightRec').value),
      priority_weight_reporters: parseFloat(document.getElementById('weightRep').value)
    };

    const sum = Number((payload.priority_weight_frequency + payload.priority_weight_unresolved + payload.priority_weight_severity + payload.priority_weight_recency + payload.priority_weight_reporters).toFixed(2));
    if (sum !== 1.00) {
      showToast(`Warning: Weights sum to ${sum}, but should equal 1.00 (100%).`, 'warning');
    }

    try {
      const res = await apiPost('/settings', payload);
      if (res.success) {
        showToast('Algorithm weights updated! City priority scores recalculated.', 'success');
        await refreshDashboardData();
      }
    } catch (err) {
      showToast('Error saving settings: ' + err.message, 'error');
    }
  });
}

document.addEventListener('DOMContentLoaded', initDashboard);
