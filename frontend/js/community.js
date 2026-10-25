/**
 * Smart City 360 - Community Reports Logic
 */

let allCommunityComplaints = [];

async function loadCommunityReports() {
  try {
    const [compRes, catRes] = await Promise.all([
      apiGet('/complaints'),
      apiGet('/complaints/categories')
    ]);

    if (catRes.success && catRes.data) {
      const select = document.getElementById('communityCategoryFilter');
      catRes.data.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
      });
    }

    if (compRes.success && compRes.data) {
      allCommunityComplaints = compRes.data;
      renderCommunityCards(allCommunityComplaints);
    }
  } catch (err) {
    console.error('Error loading community reports:', err);
    document.getElementById('communityGrid').innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--priority-critical);">
        Could not load community reports feed.
      </div>
    `;
  }
}

function renderCommunityCards(complaints) {
  const container = document.getElementById('communityGrid');
  if (complaints.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: #fff; border-radius: var(--radius-xl); border: 1px solid var(--surface-200);">
        <div style="font-size: 3rem; margin-bottom: 10px;">🔍</div>
        <h3 style="font-size: 1.3rem; color: var(--navy-900); margin-bottom: 6px;">No reports matched your filters</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Try selecting a different category or clearing search keywords.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = complaints.map(c => {
    const priorityClass = `badge-${c.priority_level ? c.priority_level.toLowerCase() : 'medium'}`;
    const imageSrc = (c.images && c.images.length > 0) ? c.images[0] : 'assets/images/hero-city.svg';

    return `
      <div class="complaint-card">
        <div class="card-media">
          <img src="${imageSrc}" alt="${c.title}" onerror="this.src='assets/images/hero-city.svg'">
          <div class="card-badges">
            <span class="badge ${priorityClass}">
              ${c.priority_level} (Score: ${c.priority_score})
            </span>
            <span class="badge" style="background: rgba(15,23,42,0.8); color: #fff;">
              ${c.status}
            </span>
          </div>
        </div>

        <div class="card-body">
          <div class="card-meta-line">
            <span class="category-pill">${c.category_name}</span>
            <span class="card-tracking-id">${c.tracking_id}</span>
          </div>

          <h3 class="card-title">${c.title}</h3>
          <p class="card-desc">${c.description}</p>

          <div class="card-location">
            <span>📍</span>
            <span>${c.address_landmark}, ${c.area_name}</span>
          </div>

          <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:14px; display:flex; justify-content:space-between;">
            <span>Reported by: <strong>${c.citizen_name || 'Citizen'}</strong></span>
            <span>${timeAgo(c.created_at)}</span>
          </div>

          <div class="card-footer">
            <button class="btn-support" onclick="handleUpvote(${c.id}, this)">
              <span>👍 Support Issue</span>
              <span class="support-count">${c.upvote_count || 0}</span>
            </button>

            <div style="display:flex; gap:8px;">
              <a href="/map.html?focus=${c.id}" class="btn btn-outline-primary btn-sm" title="View on map">
                Map
              </a>
              <a href="/track.html?id=${c.tracking_id}" class="btn btn-secondary btn-sm" title="Track Ticket">
                Track
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterCommunityFeed() {
  const search = document.getElementById('communitySearch').value.toLowerCase().trim();
  const cat = document.getElementById('communityCategoryFilter').value;
  const prio = document.getElementById('communityPriorityFilter').value;
  const stat = document.getElementById('communityStatusFilter').value;

  const filtered = allCommunityComplaints.filter(c => {
    if (cat && String(c.category_id) !== String(cat)) return false;
    if (prio && c.priority_level.toLowerCase() !== prio.toLowerCase()) return false;
    if (stat && c.status.toLowerCase() !== stat.toLowerCase()) return false;
    if (search) {
      const match = (
        (c.title && c.title.toLowerCase().includes(search)) ||
        (c.description && c.description.toLowerCase().includes(search)) ||
        (c.area_name && c.area_name.toLowerCase().includes(search)) ||
        (c.address_landmark && c.address_landmark.toLowerCase().includes(search)) ||
        (c.tracking_id && c.tracking_id.toLowerCase().includes(search))
      );
      if (!match) return false;
    }
    return true;
  });

  renderCommunityCards(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
  loadCommunityReports();

  document.getElementById('communitySearch').addEventListener('input', filterCommunityFeed);
  document.getElementById('communityCategoryFilter').addEventListener('change', filterCommunityFeed);
  document.getElementById('communityPriorityFilter').addEventListener('change', filterCommunityFeed);
  document.getElementById('communityStatusFilter').addEventListener('change', filterCommunityFeed);
});
