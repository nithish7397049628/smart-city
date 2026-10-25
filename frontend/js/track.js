/**
 * Smart City 360 - Complaint Tracking & Lifecycle Stepper Logic
 */

const LIFECYCLE_STEPS = [
  'Submitted',
  'Acknowledged',
  'Under Review',
  'Assigned to Department',
  'In Progress',
  'Resolved',
  'Closed'
];

let currentTrackedComplaint = null;

// Search complaint by ID or tracking code
async function trackComplaint(query) {
  if (!query) return;

  try {
    const res = await apiGet(`/complaints/${encodeURIComponent(query.trim())}`);
    const resultBox = document.getElementById('trackResultContainer');
    const notFoundBox = document.getElementById('trackNotFound');

    if (res.success && res.data) {
      currentTrackedComplaint = res.data;
      renderComplaintDetails(currentTrackedComplaint);
      resultBox.style.display = 'block';
      notFoundBox.style.display = 'none';
    } else {
      currentTrackedComplaint = null;
      resultBox.style.display = 'none';
      notFoundBox.style.display = 'block';
    }
  } catch (err) {
    currentTrackedComplaint = null;
    document.getElementById('trackResultContainer').style.display = 'none';
    document.getElementById('trackNotFound').style.display = 'block';
  }
}

// Render Lifecycle Stepper and Meta
function renderComplaintDetails(c) {
  document.getElementById('trackTicketId').textContent = c.tracking_id;
  document.getElementById('trackTitle').textContent = c.title;
  document.getElementById('trackCategory').textContent = c.category_name;
  document.getElementById('trackLocation').textContent = `${c.address_landmark}, ${c.area_name}, ${c.city}`;
  document.getElementById('trackDepartment').textContent = c.department_name || 'Municipal Corporation & Specialized Board';
  document.getElementById('trackDescription').textContent = c.description;
  document.getElementById('trackCreatedDate').textContent = `Reported: ${new Date(c.created_at).toLocaleDateString()} (${timeAgo(c.created_at)})`;

  // Priority Badge
  const pBadge = document.getElementById('trackPriorityBadge');
  pBadge.className = `badge badge-${c.priority_level ? c.priority_level.toLowerCase() : 'medium'}`;
  pBadge.textContent = `${c.priority_level} Priority (Score: ${c.priority_score})`;

  // Render Stepper
  renderTimelineStepper(c.status);

  // Resolution Proof
  const evidenceBox = document.getElementById('resolutionEvidenceBox');
  const reopenBox = document.getElementById('reopenOptionBox');

  if (['Resolved', 'Closed'].includes(c.status)) {
    evidenceBox.style.display = 'block';
    reopenBox.style.display = 'block';
    document.getElementById('resolutionRemarksText').textContent = 
      c.resolution_remarks || 'Official task force verified the site and finished repairs as per municipal standards.';
    
    const photosWrap = document.getElementById('resolutionPhotosWrap');
    if (c.resolution_images && c.resolution_images.length > 0) {
      photosWrap.innerHTML = c.resolution_images.map(img => `
        <img src="${img}" alt="Resolution Proof" style="width:100px; height:80px; object-fit:cover; border-radius:6px; border:1px solid #10B981;">
      `).join('');
    } else {
      photosWrap.innerHTML = '<span style="font-size:0.8rem; color:#047857;">Resolution verified by site engineer report.</span>';
    }
  } else {
    evidenceBox.style.display = 'none';
    reopenBox.style.display = 'none';
  }

  // Audit History
  renderAuditHistory(c.history || []);
}

function renderTimelineStepper(currentStatus) {
  const container = document.getElementById('timelineStepper');
  const currentIndex = LIFECYCLE_STEPS.indexOf(currentStatus);
  const isSpecial = ['Rejected', 'Reopened'].includes(currentStatus);

  let progressPct = 0;
  if (currentIndex >= 0) {
    progressPct = (currentIndex / (LIFECYCLE_STEPS.length - 1)) * 100;
  } else if (currentStatus === 'Reopened') {
    progressPct = 50; // Set to mid-way
  }

  let html = `
    <div class="timeline-progress-bar" style="width: ${progressPct}%;"></div>
  `;

  LIFECYCLE_STEPS.forEach((step, idx) => {
    let nodeClass = 'step-node';
    let iconContent = idx + 1;

    if (idx < currentIndex) {
      nodeClass += ' completed';
      iconContent = '✓';
    } else if (idx === currentIndex) {
      nodeClass += ' current';
      iconContent = '●';
    }

    html += `
      <div class="${nodeClass}">
        <div class="step-circle">${iconContent}</div>
        <div class="step-label">${step}</div>
      </div>
    `;
  });

  // If rejected or reopened, append alert tag
  if (isSpecial) {
    html += `
      <div style="position: absolute; right: 0; top: -30px;">
        <span class="badge ${currentStatus === 'Rejected' ? 'badge-critical' : 'badge-high'}">
          ${currentStatus === 'Rejected' ? '✕ Application Rejected' : '🔄 Ticket Reopened for Field Review'}
        </span>
      </div>
    `;
  }

  container.innerHTML = html;
}

function renderAuditHistory(historyList) {
  const container = document.getElementById('auditHistoryList');
  if (historyList.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem;">Initial submission recorded. Department review pending.</div>';
    return;
  }

  container.innerHTML = historyList.map(h => `
    <div style="position:relative; margin-bottom: 20px;">
      <div style="position:absolute; left:-27px; top:3px; width:14px; height:14px; border-radius:50%; background:var(--teal-600); border:3px solid #fff;"></div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <span style="font-weight:700; color:var(--navy-900); font-size:0.95rem;">
          ${h.new_status}
        </span>
        <span style="font-size:0.8rem; color:var(--text-muted);">
          ${new Date(h.created_at).toLocaleString()}
        </span>
      </div>
      <div style="font-size:0.85rem; color:var(--navy-700); margin-bottom:2px;">
        Updated by: <strong>${h.changed_by_name || 'System'}</strong>
      </div>
      <div style="font-size:0.88rem; color:var(--text-muted); line-height:1.4;">
        ${h.remarks || 'Status update logged.'}
      </div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('trackForm');
  const input = document.getElementById('trackInput');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    trackComplaint(input.value);
  });

  // Check URL param ?id=
  const urlParams = new URLSearchParams(window.location.search);
  const ticketId = urlParams.get('id');
  if (ticketId) {
    input.value = ticketId;
    trackComplaint(ticketId);
  }

  // Reopen Modal Actions
  const btnReopen = document.getElementById('btnReopenComplaint');
  if (btnReopen) {
    btnReopen.addEventListener('click', () => {
      openModal('reopenModal');
    });
  }

  document.getElementById('btnConfirmReopen').addEventListener('click', async () => {
    if (!currentTrackedComplaint) return;
    const remarks = document.getElementById('reopenRemarks').value;
    if (!remarks.trim()) {
      showToast('Please provide details regarding why the issue persists.', 'warning');
      return;
    }

    try {
      const res = await apiPost(`/complaints/${currentTrackedComplaint.id}/reopen`, { remarks });
      if (res.success) {
        showToast('Complaint reopened for urgent supervisor review.', 'success');
        closeModal('reopenModal');
        trackComplaint(currentTrackedComplaint.tracking_id);
      }
    } catch (err) {
      showToast('Could not reopen complaint: ' + err.message, 'error');
    }
  });
});
