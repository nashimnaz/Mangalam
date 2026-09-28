/**
 * admin.js — Mangalam Travel & Tours Admin Panel Logic
 * Handles: Auth, Navigation, CRUD for all data types, Image upload, Modals
 */

const API_ORIGIN = window.API_ORIGIN || (
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? (window.location.port === '3000' ? 'http://localhost:4000' : window.location.origin)
    : window.location.origin
);
const API = `${API_ORIGIN}/api`;

// ── Auth ─────────────────────────────────────────────────────────────────────
const token = localStorage.getItem('mt_admin_token');
if (!token) window.location.href = '/admin/index.html';

const username = localStorage.getItem('mt_admin_user') || 'Admin';
document.getElementById('sidebar-username').textContent = username;
document.getElementById('sidebar-avatar').textContent = username.charAt(0).toUpperCase();

document.getElementById('btn-logout').addEventListener('click', () => {
  if (confirm('Logout?')) { localStorage.clear(); window.location.href = '/admin/index.html'; }
});

// ── API helpers ───────────────────────────────────────────────────────────────
async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (res.status === 401) { localStorage.clear(); window.location.href = '/admin/index.html'; }
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function uploadImage(file) {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${API}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form
  });
  if (res.status === 401) {
    localStorage.clear();
    window.location.href = '/admin/index.html';
    throw new Error('Session expired. Please log in again.');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  // Cloudinary returns absolute URLs (https://res.cloudinary.com/...)
  // Local disk returns relative paths (/uploads/filename.jpg)
  return data.url.startsWith('http') ? data.url : `${API_ORIGIN}${data.url}`;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Escape HTML Helper ────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

// ── Navigation ────────────────────────────────────────────────────────────────
const sections = {
  dashboard:    { title: 'Dashboard',    subtitle: 'Overview of your website data' },
  destinations: { title: 'Destinations', subtitle: 'Manage travel destinations' },
  packages:     { title: 'Packages',     subtitle: 'Manage holiday packages' },
  collections:  { title: 'Collections',  subtitle: 'Manage curated homepage package collections' },
  attractions:  { title: 'Attractions',  subtitle: 'Manage places and attraction experiences' },
  enquiries:    { title: 'Destination & Package Enquiries', subtitle: 'Manage customer leads, destination requests & package enquiries' },
  blogs:        { title: 'Blogs',        subtitle: 'Manage blog posts' },
  seo:          { title: 'Google SEO & Keywords', subtitle: 'Manage page titles, Google meta descriptions, SEO focus keywords & search previews' },
  testimonials: { title: 'Testimonials', subtitle: 'Manage customer reviews' },
  partners:     { title: 'Partners',     subtitle: 'Manage partner logos' },
  posters:      { title: 'Promotional Banners', subtitle: 'Manage promotional banners and slider images' },
  gallery:      { title: 'Photo Gallery', subtitle: 'Manage tour & traveler photos' },
  settings:     { title: 'Settings',     subtitle: 'Admin account & configuration' },
};

let currentSection = 'dashboard';

function navigateTo(section) {
  currentSection = section;
  // Nav items
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.section === section);
  });
  // Sections
  document.querySelectorAll('.content-section').forEach(el => {
    el.classList.toggle('hidden', !el.id.endsWith(section));
  });
  // Header
  document.getElementById('page-title').textContent = sections[section]?.title || section;
  document.getElementById('page-subtitle').textContent = sections[section]?.subtitle || '';
  // Load data
  loaders[section]?.();
}

document.querySelectorAll('[data-section]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const s = el.dataset.section;
    const action = el.dataset.action;
    navigateTo(s);
    if (action === 'add') setTimeout(() => openAddModal(s), 100);
  });
});

// Sidebar toggle
document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  const stats = await api('GET', '/stats');
  if (!stats) return;
  ['destinations','packages','collections','attractions','blogs','testimonials','partners','posters','gallery','enquiries','seo'].forEach(k => {
    const el = document.getElementById(`stat-${k}`);
    if (el) el.textContent = stats[k] ?? 0;
  });
}

// ── Image upload helper ───────────────────────────────────────────────────────
function createImageUpload(id, currentUrl = '') {
  return `
    <div class="img-upload-area" id="upload-area-${id}">
      <input type="file" accept="image/*" id="file-${id}" onchange="handleFileSelect('${id}')">
      <div class="upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
      <p>Click or drag image here</p>
      <p style="font-size:11px;margin-top:4px;color:#9ca3af">JPG, PNG, WEBP — Max 10MB</p>
    </div>
    ${currentUrl ? `
      <div class="img-preview" id="preview-${id}">
        <img src="${currentUrl}" alt="Preview">
        <button type="button" class="btn-remove-img" onclick="removeImageUpload('${id}')" title="Delete this image">
          <i class="fas fa-trash-alt"></i> Delete Image
        </button>
      </div>` : `
      <div class="img-preview" id="preview-${id}" style="display:none"></div>
    `}
    <input type="hidden" id="img-url-${id}" value="${currentUrl}">
  `;
}

window.removeImageUpload = function(id) {
  const hiddenInput = document.getElementById(`img-url-${id}`);
  if (hiddenInput) hiddenInput.value = '';
  const preview = document.getElementById(`preview-${id}`);
  if (preview) {
    preview.innerHTML = '';
    preview.style.display = 'none';
  }
  const area = document.getElementById(`upload-area-${id}`);
  if (area) {
    area.innerHTML = `
      <input type="file" accept="image/*" id="file-${id}" onchange="handleFileSelect('${id}')">
      <div class="upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
      <p>Click or drag image here</p>
      <p style="font-size:11px;margin-top:4px;color:#9ca3af">JPG, PNG, WEBP — Max 10MB</p>
    `;
  }
  showToast('Image deleted. Click Update / Save to persist.', 'info');
};

window.handleFileSelect = async function(id) {
  const fileInput = document.getElementById(`file-${id}`);
  const file = fileInput?.files?.[0];
  if (!file) return;
  const area = document.getElementById(`upload-area-${id}`);
  area.innerHTML = `<div style="padding:12px;color:#6b7280;font-size:13px"><i class="fas fa-spinner fa-spin"></i> Uploading...</div>`;
  try {
    const url = await uploadImage(file);
    document.getElementById(`img-url-${id}`).value = url;
    const preview = document.getElementById(`preview-${id}`);
    if (preview) {
      preview.style.display = 'inline-block';
      preview.innerHTML = `
        <img src="${url}" alt="Preview">
        <button type="button" class="btn-remove-img" onclick="removeImageUpload('${id}')" title="Delete this image">
          <i class="fas fa-trash-alt"></i> Delete Image
        </button>
      `;
    }
    area.innerHTML = `<input type="file" accept="image/*" id="file-${id}" onchange="handleFileSelect('${id}')"><div class="upload-icon" style="color:#10b981"><i class="fas fa-check-circle"></i></div><p style="color:#10b981;font-size:13px">Uploaded! (Click to replace)</p>`;
    showToast('Image uploaded', 'success');
  } catch (e) {
    area.innerHTML = `<input type="file" accept="image/*" id="file-${id}" onchange="handleFileSelect('${id}')"><div class="upload-icon" style="color:#dc2626"><i class="fas fa-exclamation-circle"></i></div><p style="color:#dc2626;font-size:13px">${e.message}</p>`;
  }
};

// ── Star rating helper ─────────────────────────────────────────────────────────
function starRatingHtml(id, current = 5) {
  return `<div class="star-rating" id="stars-${id}">
    ${[1,2,3,4,5].map(n => `<span data-v="${n}" class="${n <= current ? 'active' : ''}" onclick="setStars('${id}',${n})">★</span>`).join('')}
  </div><input type="hidden" id="rating-${id}" value="${current}">`;
}
window.setStars = function(id, val) {
  document.getElementById(`rating-${id}`).value = val;
  document.querySelectorAll(`#stars-${id} span`).forEach(s => {
    s.classList.toggle('active', Number(s.dataset.v) <= val);
  });
};

// ── Table image cell ──────────────────────────────────────────────────────────
function imgCell(src) {
  if (src && src.trim()) return `<img src="${src}" class="table-img" onerror="this.parentElement.innerHTML='<div class=table-img-placeholder><i class=fas fa-image></i></div>'">`;
  return `<div class="table-img-placeholder"><i class="fas fa-image"></i></div>`;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }
document.getElementById('modal-close').addEventListener('click', closeModal);
// Do NOT close modal when clicking outside the modal box, so user data is never lost by accident.

// ── Open add modal ─────────────────────────────────────────────────────────────
function openAddModal(section) {
  const forms = {
    destinations: openDestinationForm,
    packages:     openPackageForm,
    collections:  openCollectionForm,
    enquiries:    openEnquiryForm,
    seo:          openSeoForm,
    blogs:        openBlogForm,
    testimonials: openTestimonialForm,
    partners:     openPartnerForm,
    posters:      openPosterForm,
    gallery:      openGalleryForm,
  };
  forms[section]?.();
}

// ══════════════════════════════════════════════════════════════════════════════
// DESTINATIONS
// ══════════════════════════════════════════════════════════════════════════════
let destinations = [];

async function loadDestinations() {
  destinations = await api('GET', '/destinations') || [];
  const tbody = document.getElementById('tbody-destinations');
  if (!tbody) return;
  if (!destinations.length) { tbody.innerHTML = `<tr class="empty-row"><td colspan="5"><i class="fas fa-map-marker-alt" style="font-size:24px;color:#e5e7eb;display:block;margin-bottom:8px"></i>No destinations yet. Add your first destination.</td></tr>`; return; }
  tbody.innerHTML = destinations.map(d => {
    const destId = d.destination_id || d.id;
    return `
    <tr>
      <td>${imgCell(d.card_image)}</td>
      <td><strong>${d.destination_name}</strong></td>
      <td><code style="font-size:12px;background:#f3f4f6;padding:2px 8px;border-radius:6px">${d.slug_url}</code></td>
      <td><span class="text-truncate">${d.description || '<span style="color:#d1d5db">—</span>'}</span></td>
      <td><div class="table-actions">
        <button class="btn-sm btn-edit" onclick="editDestination(${destId})"><i class="fas fa-pen"></i> Edit</button>
        <button class="btn-sm btn-delete" onclick="deleteDestination(${destId})" title="Delete Destination"><i class="fas fa-trash"></i> Delete</button>
      </div></td>
    </tr>`;
  }).join('');
}

function openDestinationForm(d = null) {
  let initialPlaces = [];
  if (Array.isArray(d?.places_to_visit)) {
    initialPlaces = d.places_to_visit.map(p => typeof p === 'string' ? { name: p, image: '' } : p);
  }
  const destId = d ? (d.destination_id || d.id) : null;

  const modalHtml = `
    <div class="form-group"><label>Destination / Country Name *</label><input id="d-name" value="${d?.destination_name||''}" placeholder="e.g. Dubai"></div>
    <div class="form-group">
      <label>Footer Link Title (Optional)</label>
      <input id="d-footer-title" value="${d?.footer_title||d?.footer_label||''}" placeholder="e.g. Best Safari Ride in Dubai (Leave empty to use Destination Name)">
      <small style="color:#64748b;font-size:11px">Custom text to display in website footer under 'Top Destinations' linking to this destination.</small>
    </div>
    <div class="form-group"><label>Card Image</label>${createImageUpload('d-card', d?.card_image||'')}</div>
    <div class="form-group"><label>Inner/Banner Image</label>${createImageUpload('d-inner', d?.inner_image||'')}</div>
    <div class="form-group"><label>Description</label><textarea id="d-desc" placeholder="Short destination description">${d?.description||''}</textarea></div>
    
    <!-- Places to Visit Section -->
    <div class="form-group" style="margin-top:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <label style="font-weight:700;margin:0">Places & Attractions to Visit (Name & Image)</label>
        <button type="button" class="btn-sm btn-edit" onclick="addPlaceRow()"><i class="fas fa-plus"></i> Add Place</button>
      </div>
      <div id="places-rows-container" style="display:flex;flex-direction:column;gap:12px;max-height:220px;overflow-y:auto;padding-right:4px">
        <!-- Rendered dynamically -->
      </div>
    </div>

    <div class="modal-actions">
      <div>
        ${destId ? `<button type="button" class="btn-danger" onclick="deleteDestination(${destId})"><i class="fas fa-trash-alt"></i> Delete Destination</button>` : ''}
      </div>
      <div class="modal-actions-right">
        <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn-primary" onclick="saveDestination(${destId || 'null'})"><i class="fas fa-save"></i> ${d ? 'Update' : 'Save'}</button>
      </div>
    </div>`;

  openModal(d ? 'Edit Destination' : 'Add Destination', modalHtml);

  window._placesData = initialPlaces.length > 0 ? [...initialPlaces] : [{ name: '', image: '' }];
  renderPlacesRows();
}

window.renderPlacesRows = function() {
  const container = document.getElementById('places-rows-container');
  if (!container) return;
  if (!window._placesData || window._placesData.length === 0) {
    window._placesData = [{ name: '', image: '' }];
  }

  container.innerHTML = window._placesData.map((p, idx) => `
    <div class="place-row-item" style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px;border-radius:10px;display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;gap:8px;align-items:center">
        <input type="text" placeholder="Place Name (e.g. Burj Khalifa)" value="${p.name||''}" onchange="window._placesData[${idx}].name=this.value.trim()" style="flex:1">
        <button type="button" class="btn-sm btn-delete" onclick="removePlaceRow(${idx})" title="Remove Place"><i class="fas fa-trash"></i></button>
      </div>
      <div>
        ${createImageUpload('place-img-' + idx, p.image||'')}
      </div>
    </div>
  `).join('');
};

window.addPlaceRow = function() {
  window._placesData.push({ name: '', image: '' });
  renderPlacesRows();
};

window.removePlaceRow = function(idx) {
  window._placesData.splice(idx, 1);
  renderPlacesRows();
};

window.editDestination = function(id) {
  const d = destinations.find(x => String(x.destination_id || x.id) === String(id));
  if (d) openDestinationForm(d);
};

window.saveDestination = async function(id) {
  const placesArr = [];
  if (window._placesData && window._placesData.length > 0) {
    window._placesData.forEach((p, idx) => {
      const nameVal = p.name || '';
      const imgEl = document.getElementById('img-url-place-img-' + idx);
      const imgVal = imgEl ? imgEl.value : p.image;
      if (nameVal) {
        placesArr.push({ name: nameVal, image: imgVal || '' });
      }
    });
  }

  const body = {
    destination_name: document.getElementById('d-name').value.trim(),
    footer_title: document.getElementById('d-footer-title')?.value.trim() || '',
    card_image: document.getElementById('img-url-d-card').value,
    inner_image: document.getElementById('img-url-d-inner').value,
    description: document.getElementById('d-desc').value.trim(),
    places_to_visit: placesArr
  };
  if (!body.destination_name) { showToast('Name is required', 'error'); return; }
  const res = id ? await api('PUT', `/destinations/${id}`, body) : await api('POST', '/destinations', body);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast(id ? 'Destination updated!' : 'Destination added!', 'success');
  closeModal();
  await loadDestinations();
  await loadSeo();
  loadDashboard();
};

window.deleteDestination = async function(id) {
  if (!confirm('Are you sure you want to delete this destination?')) return;
  const res = await api('DELETE', `/destinations/${id}`);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast('Destination deleted', 'success');
  closeModal();
  await loadDestinations();
  await loadSeo();
  loadDashboard();
};

document.getElementById('btn-add-destination')?.addEventListener('click', () => openDestinationForm());

// ══════════════════════════════════════════════════════════════════════════════
// PACKAGES
// ══════════════════════════════════════════════════════════════════════════════
let packages = [];

async function loadPackages() {
  packages = await api('GET', '/packages') || [];
  const tbody = document.getElementById('tbody-packages');
  if (!tbody) return;
  if (!packages.length) { tbody.innerHTML = `<tr class="empty-row"><td colspan="6"><i class="fas fa-suitcase" style="font-size:24px;color:#e5e7eb;display:block;margin-bottom:8px"></i>No packages yet. Add your first package.</td></tr>`; return; }
  const typeClass = { package:'badge-package', curated:'badge-curated', honeymoon:'badge-honeymoon', 'fixed-departure':'badge-fixed' };
  tbody.innerHTML = packages.map(p => {
    const pkgId = p.package_id || p.id;
    return `
    <tr>
      <td>${imgCell(p.card_image)}</td>
      <td><strong>${p.package_name}</strong></td>
      <td>${p.nights||'—'}N / ${p.days||'—'}D</td>
      <td>${p.amount ? '₹ ' + Number(p.amount).toLocaleString('en-IN') : '<span style="color:#d1d5db">—</span>'}</td>
      <td><span class="badge ${typeClass[p.type]||'badge-package'}">${p.type||'package'}</span></td>
      <td><div class="table-actions">
        <button class="btn-sm btn-edit" onclick="editPackage(${pkgId})"><i class="fas fa-pen"></i> Edit</button>
        <button class="btn-sm btn-delete" onclick="deletePackage(${pkgId})" title="Delete Package"><i class="fas fa-trash"></i> Delete</button>
      </div></td>
    </tr>`;
  }).join('');
}

function getDestOptions(selected = null) {
  return `<option value="">— No Destination —</option>` + destinations.map(d => `<option value="${d.destination_id}" ${selected == d.destination_id ? 'selected' : ''}>${d.destination_name}</option>`).join('');
}

window.addItineraryDay = function(title = '', desc = '') {
  const container = document.getElementById('itinerary-days-container');
  if (!container) return;
  const currentRows = container.querySelectorAll('.itinerary-day-row');
  if (currentRows.length >= 15) {
    showToast('Maximum 15 itinerary days allowed', 'error');
    return;
  }
  const nextNum = currentRows.length + 1;
  const div = document.createElement('div');
  div.className = 'itinerary-day-row border border-gray-200 rounded-xl p-3.5 mb-3 bg-gray-50/70 relative';
  div.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <span class="font-bold text-xs uppercase tracking-wider text-red-600">Day <span class="day-num">${nextNum}</span></span>
      <button type="button" class="text-red-500 hover:text-red-700 text-xs font-bold bg-transparent border-0 cursor-pointer" onclick="removeItineraryDay(this)">
        <i class="fas fa-trash-alt"></i> Delete
      </button>
    </div>
    <div class="form-group mb-2">
      <label class="text-xs font-bold text-gray-700">Day Title / Header</label>
      <input class="itinerary-day-title" value="${title ? title.replace(/"/g, '&quot;') : `Day ${nextNum}: Schedule`}" placeholder="e.g. Day ${nextNum}: Arrival & Dhow Cruise">
    </div>
    <div class="form-group mb-0">
      <label class="text-xs font-bold text-gray-700">Day Schedule & Details</label>
      <textarea class="itinerary-day-desc" rows="2" placeholder="Activities, sightseeing, and schedule for Day ${nextNum}...">${desc || ''}</textarea>
    </div>`;
  container.appendChild(div);
  reindexItineraryDays();
};

window.removeItineraryDay = function(btn) {
  const row = btn.closest('.itinerary-day-row');
  if (row) {
    row.remove();
    reindexItineraryDays();
  }
};

function reindexItineraryDays() {
  const rows = document.querySelectorAll('#itinerary-days-container .itinerary-day-row');
  rows.forEach((r, idx) => {
    const numSpan = r.querySelector('.day-num');
    if (numSpan) numSpan.textContent = idx + 1;
  });
}

function openPackageForm(p = null) {
  const pkgId = p ? (p.package_id || p.id) : null;
  const bannerImgs = Array.isArray(p?.banner_images) ? p.banner_images : 
    (typeof p?.banner_images === 'string' ? (JSON.parse(p.banner_images || '[]') || []) : []);
  const b1 = bannerImgs[0] || p?.banner_image || p?.inner_image || p?.card_image || '';
  const b2 = bannerImgs[1] || '';
  const b3 = bannerImgs[2] || '';
  const b4 = bannerImgs[3] || '';

  openModal(p ? 'Edit Package' : 'Add Package', `
    <div class="form-group"><label>Package Name *</label><input id="p-name" value="${p?.package_name||''}" placeholder="e.g. Extravagant Dubai Luxury Tour"></div>
    <div class="form-group">
      <label>Footer Link Title (Optional)</label>
      <input id="p-footer-title" value="${p?.footer_title||p?.footer_label||''}" placeholder="e.g. 5-Star Dubai Luxury Tour (Leave empty to use Package Name)">
      <small style="color:#64748b;font-size:11px">Custom text to display in website footer under 'Holiday Packages' linking to this package.</small>
    </div>
    <div class="form-row-two">
      <div class="form-group"><label>Nights</label><input id="p-nights" type="number" value="${p?.nights||''}" placeholder="4"></div>
      <div class="form-group"><label>Days</label><input id="p-days" type="number" value="${p?.days||''}" placeholder="5"></div>
    </div>
    <div class="form-row-two">
      <div class="form-group"><label>Hotel Type</label><input id="p-hotel" value="${p?.hotel_type||'4 Star Hotel'}" placeholder="e.g. 4 Star Hotel / 5-Star Luxury"></div>
      <div class="form-group"><label>Number of Sightseeings</label><input id="p-activities" value="${p?.activities_count||'5 Included'}" placeholder="e.g. 5 Sightseeings"></div>
    </div>
    <div class="form-row-two">
      <div class="form-group"><label>Price (₹)</label><input id="p-amount" type="number" value="${p?.amount||''}" placeholder="25000"></div>
      <div class="form-group"><label>Type</label>
        <select id="p-type">
          <option value="package" ${p?.type==='package'?'selected':''}>Package</option>
          <option value="curated" ${p?.type==='curated'?'selected':''}>Curated Itinerary</option>
          <option value="honeymoon" ${p?.type==='honeymoon'?'selected':''}>Honeymoon</option>
          <option value="fixed-departure" ${p?.type==='fixed-departure'?'selected':''}>Fixed Departure</option>
        </select>
      </div>
    </div>
    <div class="form-row-two">
      <div class="form-group"><label>Transfers Spec</label><input id="p-transfers" value="${p?.transfers||'Included'}" placeholder="e.g. Airport Transfers Included"></div>
      <div class="form-group"><label>Destination</label><select id="p-dest">${getDestOptions(p?.destination_id)}</select></div>
    </div>
    <div class="form-group"><label>Card Image (Grid Thumbnail)</label>${createImageUpload('p-card', p?.card_image||'')}</div>
    
    <!-- Up to 4 Banner Slider Images -->
    <div class="form-group" style="margin-top:12px; margin-bottom:12px">
      <label style="font-weight:bold; color:#1f2937">Banner Slider Images (Up to 4 Images - Auto slides every 2s on website)</label>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:6px">
        <div><label style="font-size:11px; font-weight:bold; color:#4b5563">Banner 1 (Main Cover)</label>${createImageUpload('p-banner-1', b1)}</div>
        <div><label style="font-size:11px; font-weight:bold; color:#4b5563">Banner 2 (Optional Slide 2)</label>${createImageUpload('p-banner-2', b2)}</div>
        <div><label style="font-size:11px; font-weight:bold; color:#4b5563">Banner 3 (Optional Slide 3)</label>${createImageUpload('p-banner-3', b3)}</div>
        <div><label style="font-size:11px; font-weight:bold; color:#4b5563">Banner 4 (Optional Slide 4)</label>${createImageUpload('p-banner-4', b4)}</div>
      </div>
    </div>

    <div class="form-group"><label>Overview</label><textarea id="p-overview" placeholder="Package overview...">${p?.overview||''}</textarea></div>
    
    <!-- Multi-Day Itinerary Builder (Up to 15 Days) -->
    <div class="form-group">
      <label class="flex items-center justify-between font-bold text-gray-800 mb-1">
        <span>Day-by-Day Itinerary (Up to 15 Days)</span>
        <span class="text-xs text-gray-500 font-normal">Each day will display as a separate box on the website</span>
      </label>
      <div id="itinerary-days-container" class="mt-2"></div>
      <button type="button" class="btn-secondary" style="width:100%; padding:10px; border:1px dashed #dc2626; color:#dc2626; background:#fef2f2; border-radius:12px; font-weight:bold; cursor:pointer; margin-top:6px" onclick="addItineraryDay()">
        <i class="fas fa-plus-circle"></i> + Add Next Day Box (Up to 15 Days)
      </button>
    </div>

    <div class="form-row-two">
      <div class="form-group"><label>Inclusions (Features - comma or line separated)</label><textarea id="p-inclusions" rows="3" placeholder="Flight, 4-Star Hotel, Meals, Transfers, Sightseeing...">${p?.inclusions||''}</textarea></div>
      <div class="form-group"><label>Exclusions (comma or line separated)</label><textarea id="p-exclusions" rows="3" placeholder="Personal expenses, Travel Insurance...">${p?.exclusions||''}</textarea></div>
    </div>
    <div class="form-group"><label>Terms & Conditions (Booking Policy & Rules)</label><textarea id="p-terms" rows="3" placeholder="Enter terms & conditions, cancellation policy, booking rules...">${p?.terms||''}</textarea></div>
    <div class="modal-actions">
      <div>
        ${pkgId ? `<button type="button" class="btn-danger" onclick="deletePackage(${pkgId})"><i class="fas fa-trash-alt"></i> Delete Package</button>` : ''}
      </div>
      <div class="modal-actions-right">
        <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn-primary" onclick="savePackage(${pkgId || 'null'})"><i class="fas fa-save"></i> ${p ? 'Update' : 'Save'}</button>
      </div>
    </div>`);

  // Populate existing days or initial day
  const rawItinerary = p?.itinerary;
  let existingDays = p?.itinerary_days || [];
  if (!existingDays.length && rawItinerary) {
    try {
      existingDays = JSON.parse(rawItinerary);
    } catch {
      const lines = rawItinerary.split('\n').map(s => s.trim()).filter(Boolean);
      existingDays = lines.map((l, i) => ({ day: i + 1, title: l.startsWith('Day') ? l : `Day ${i + 1}`, description: l }));
    }
  }

  if (existingDays && existingDays.length) {
    existingDays.forEach(d => addItineraryDay(d.title || d.name, d.description || d.desc || d.text));
  } else {
    addItineraryDay('Day 1: Arrival & Hotel Check-in', '');
  }
}

window.editPackage = function(id) { const p = packages.find(x => String(x.package_id || x.id) === String(id)); if (p) openPackageForm(p); };

window.savePackage = async function(id) {
  const itineraryDays = [];
  document.querySelectorAll('#itinerary-days-container .itinerary-day-row').forEach((row, idx) => {
    const title = row.querySelector('.itinerary-day-title')?.value.trim();
    const desc = row.querySelector('.itinerary-day-desc')?.value.trim();
    if (title || desc) {
      itineraryDays.push({
        day: idx + 1,
        title: title || `Day ${idx + 1}`,
        description: desc || ''
      });
    }
  });

  const b1 = document.getElementById('img-url-p-banner-1')?.value || '';
  const b2 = document.getElementById('img-url-p-banner-2')?.value || '';
  const b3 = document.getElementById('img-url-p-banner-3')?.value || '';
  const b4 = document.getElementById('img-url-p-banner-4')?.value || '';
  const bannerList = [b1, b2, b3, b4].filter(Boolean);

  const body = {
    package_name: document.getElementById('p-name').value.trim(),
    footer_title: document.getElementById('p-footer-title')?.value.trim() || '',
    nights: document.getElementById('p-nights').value,
    days: document.getElementById('p-days').value,
    hotel_type: document.getElementById('p-hotel').value.trim() || '4 Star Hotel',
    activities_count: document.getElementById('p-activities').value.trim() || '5 Included',
    transfers: document.getElementById('p-transfers').value.trim() || 'Included',
    amount: document.getElementById('p-amount').value,
    type: document.getElementById('p-type').value,
    destination_id: document.getElementById('p-dest').value || null,
    card_image: document.getElementById('img-url-p-card').value,
    banner_image: b1,
    banner_images: bannerList,
    overview: document.getElementById('p-overview').value.trim(),
    itinerary: JSON.stringify(itineraryDays),
    inclusions: document.getElementById('p-inclusions').value.trim(),
    exclusions: document.getElementById('p-exclusions').value.trim(),
    terms: document.getElementById('p-terms').value.trim(),
  };
  if (!body.package_name) { showToast('Package name required', 'error'); return; }
  const res = id ? await api('PUT', `/packages/${id}`, body) : await api('POST', '/packages', body);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast(id ? 'Package updated!' : 'Package added!', 'success');
  closeModal(); loadPackages(); loadDashboard();
};

window.deletePackage = async function(id) {
  if (!confirm('Are you sure you want to delete this package?')) return;
  const res = await api('DELETE', `/packages/${id}`);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast('Package deleted', 'success');
  closeModal(); loadPackages(); loadDashboard();
};

document.getElementById('btn-add-package')?.addEventListener('click', () => { if (!destinations.length) loadDestinations().then(() => openPackageForm()); else openPackageForm(); });

// ══════════════════════════════════════════════════════════════════════════════
// COLLECTIONS
// ══════════════════════════════════════════════════════════════════════════════
let collections = [];
window._selectedPackageIds = [];
window._allPackagesCache = [];

async function loadCollections() {
  collections = await api('GET', '/collections') || [];
  const tbody = document.getElementById('tbody-collections');
  if (!tbody) return;
  if (!collections.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7"><i class="fas fa-layer-group" style="font-size:24px;color:#e5e7eb;display:block;margin-bottom:8px"></i>No collections yet. Click "Add Collection" to create your first curated package collection.</td></tr>`;
    return;
  }

  tbody.innerHTML = collections.map(c => {
    const colId = c.id || c.collection_id;
    const pkgs = Array.isArray(c.packages) ? c.packages : [];
    const pkgCount = pkgs.length;
    const pkgNames = pkgs.length > 0
      ? pkgs.map(p => `<span style="display:inline-block;background:#f1f5f9;color:#334155;font-size:11px;font-weight:600;padding:2px 8px;border-radius:6px;margin:2px">${p.package_name}</span>`).join('')
      : '<span style="color:#94a3b8;font-size:12px">No packages assigned</span>';

    const statusBadge = c.active !== false
      ? `<span class="badge green">Active</span>`
      : `<span class="badge gray">Hidden</span>`;

    return `
      <tr>
        <td><strong>${c.title}</strong><br><code style="font-size:11px;background:#f3f4f6;padding:2px 6px;border-radius:4px">${c.slug}</code></td>
        <td><span class="text-truncate">${c.subtitle || '<span style="color:#d1d5db">—</span>'}</span></td>
        <td><span class="badge blue">${pkgCount} Package${pkgCount === 1 ? '' : 's'}</span></td>
        <td style="max-width:280px">${pkgNames}</td>
        <td><strong>${c.order || 0}</strong></td>
        <td>${statusBadge}</td>
        <td><div class="table-actions">
          <button class="btn-sm btn-edit" onclick="editCollection(${colId})"><i class="fas fa-pen"></i> Edit</button>
          <button class="btn-sm btn-delete" onclick="deleteCollection(${colId})" title="Delete Collection"><i class="fas fa-trash"></i> Delete</button>
        </div></td>
      </tr>`;
  }).join('');
}

function renderPackagePickerCards(pkgs, selectedIds, filterQuery = '') {
  if (!pkgs || !pkgs.length) {
    return `<div style="grid-column:1/-1;text-align:center;padding:24px;color:#94a3b8;font-size:13px"><i class="fas fa-box-open" style="font-size:24px;display:block;margin-bottom:6px"></i>No packages available in the system. Create packages first in the Packages section.</div>`;
  }

  const query = (filterQuery || '').toLowerCase().trim();
  const filtered = pkgs.filter(p => {
    if (!query) return true;
    const name = (p.package_name || '').toLowerCase();
    const type = (p.type || '').toLowerCase();
    return name.includes(query) || type.includes(query);
  });

  if (!filtered.length) {
    return `<div style="grid-column:1/-1;text-align:center;padding:20px;color:#94a3b8;font-size:13px">No packages matching "${filterQuery}"</div>`;
  }

  return filtered.map(p => {
    const isSelected = selectedIds.includes(Number(p.package_id || p.id));
    const img = p.card_image || p.banner_image || '';
    const badgeType = p.type || 'Package';

    return `
      <div class="pkg-picker-card ${isSelected ? 'selected' : ''}" onclick="togglePackageForCollection(${p.package_id || p.id}, this)">
        <div class="pkg-check-indicator">${isSelected ? '<i class="fas fa-check"></i>' : ''}</div>
        <img class="pkg-card-thumb" src="${img || '/assets/images/default-tour.jpg'}" alt="${p.package_name}" onerror="this.src='/assets/images/default-tour.jpg'">
        <div class="pkg-card-body">
          <div class="pkg-card-title">${p.package_name}</div>
          <div class="pkg-card-meta">
            <span class="badge ${badgeType === 'honeymoon' ? 'red' : (badgeType === 'curated' ? 'green' : 'blue')}" style="font-size:10px;padding:1px 6px">${badgeType}</span>
            <span style="font-size:11px;color:#64748b">${p.days ? p.days + ' Days' : ''}</span>
            <span style="font-size:11px;font-weight:700;color:#0f172a">${p.amount ? '₹' + Number(p.amount).toLocaleString('en-IN') : ''}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function openCollectionForm(c = null) {
  const colId = c ? (c.id || c.collection_id) : null;
  // Ensure we have fresh packages list
  let allPkgs = packages;
  if (!allPkgs || !allPkgs.length) {
    allPkgs = await api('GET', '/packages') || [];
    packages = allPkgs;
  }
  window._allPackagesCache = allPkgs;

  window._selectedPackageIds = [];
  if (c) {
    if (Array.isArray(c.package_ids)) {
      window._selectedPackageIds = c.package_ids.map(Number);
    } else if (Array.isArray(c.packages)) {
      window._selectedPackageIds = c.packages.map(p => Number(p.package_id || p.id));
    }
  }

  const modalHtml = `
    <div class="form-row">
      <div class="form-group">
        <label>Collection Title *</label>
        <input id="c-title" value="${(c?.title || '').replace(/"/g, '&quot;')}" placeholder="e.g. Europe Special Packages" required>
      </div>
      <div class="form-group">
        <label>Subtitle / Tagline</label>
        <input id="c-subtitle" value="${(c?.subtitle || '').replace(/"/g, '&quot;')}" placeholder="e.g. Handcrafted Escapes with Premium Inclusions">
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label>Display Order (Priority)</label>
        <input id="c-order" type="number" value="${c?.order !== undefined ? c.order : 0}" placeholder="0 (Lower shows first)">
      </div>
      <div class="form-group" style="display:flex;align-items:center;margin-top:24px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:0">
          <input type="checkbox" id="c-active" ${c?.active !== false ? 'checked' : ''} style="width:16px;height:16px">
          <strong style="font-size:14px">Active & Visible on Website</strong>
        </label>
      </div>
    </div>

    <!-- Interactive Package Selector -->
    <div class="form-group">
      <label style="display:flex;align-items:center;justify-content:space-between;font-weight:700;margin-bottom:6px">
        <span>Select Packages for this Collection</span>
        <span class="pkg-count-badge" id="pkg-selected-counter">${window._selectedPackageIds.length} Selected</span>
      </label>
      <div class="pkg-picker-container">
        <div class="pkg-picker-toolbar">
          <input type="text" class="pkg-search-input" id="pkg-picker-search" placeholder="🔍 Search packages by name..." oninput="filterCollectionPackages(this.value)">
          <button type="button" class="btn-sm btn-edit" onclick="selectAllCollectionPackages()"><i class="fas fa-check-double"></i> Select All</button>
          <button type="button" class="btn-sm btn-cancel" onclick="clearAllCollectionPackages()"><i class="fas fa-times"></i> Clear All</button>
        </div>
        <div class="pkg-grid-picker" id="pkg-grid-picker">
          ${renderPackagePickerCards(allPkgs, window._selectedPackageIds)}
        </div>
      </div>
    </div>

    <div class="modal-actions">
      <div>
        ${colId ? `<button type="button" class="btn-danger" onclick="deleteCollection(${colId})"><i class="fas fa-trash-alt"></i> Delete Collection</button>` : ''}
      </div>
      <div class="modal-actions-right">
        <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn-primary" onclick="saveCollection(${colId || 'null'})"><i class="fas fa-save"></i> ${c ? 'Update Collection' : 'Save Collection'}</button>
      </div>
    </div>`;

  openModal(c ? 'Edit Collection' : 'Add Collection', modalHtml);
  updateCollectionCounter();
}

window.togglePackageForCollection = function(pkgId, cardEl) {
  pkgId = Number(pkgId);
  const idx = window._selectedPackageIds.indexOf(pkgId);
  if (idx > -1) {
    window._selectedPackageIds.splice(idx, 1);
    cardEl.classList.remove('selected');
    cardEl.querySelector('.pkg-check-indicator').innerHTML = '';
  } else {
    window._selectedPackageIds.push(pkgId);
    cardEl.classList.add('selected');
    cardEl.querySelector('.pkg-check-indicator').innerHTML = '<i class="fas fa-check"></i>';
  }
  updateCollectionCounter();
};

window.filterCollectionPackages = function(query) {
  const container = document.getElementById('pkg-grid-picker');
  if (container && window._allPackagesCache) {
    container.innerHTML = renderPackagePickerCards(window._allPackagesCache, window._selectedPackageIds, query);
  }
};

window.selectAllCollectionPackages = function() {
  if (!window._allPackagesCache) return;
  window._selectedPackageIds = window._allPackagesCache.map(p => Number(p.package_id || p.id));
  const searchVal = document.getElementById('pkg-picker-search')?.value || '';
  filterCollectionPackages(searchVal);
  updateCollectionCounter();
};

window.clearAllCollectionPackages = function() {
  window._selectedPackageIds = [];
  const searchVal = document.getElementById('pkg-picker-search')?.value || '';
  filterCollectionPackages(searchVal);
  updateCollectionCounter();
};

function updateCollectionCounter() {
  const counter = document.getElementById('pkg-selected-counter');
  if (counter) {
    const len = window._selectedPackageIds ? window._selectedPackageIds.length : 0;
    counter.textContent = `${len} Selected`;
    counter.style.background = len > 0 ? '#dc2626' : '#e2e8f0';
    counter.style.color = len > 0 ? '#fff' : '#4b5563';
  }
}

window.editCollection = function(id) {
  const c = collections.find(x => String(x.id || x.collection_id) === String(id));
  if (c) openCollectionForm(c);
};

window.saveCollection = async function(id) {
  const title = document.getElementById('c-title')?.value.trim();
  const subtitle = document.getElementById('c-subtitle')?.value.trim();
  const order = document.getElementById('c-order')?.value;
  const active = document.getElementById('c-active')?.checked;

  if (!title) {
    showToast('Collection title is required', 'error');
    return;
  }

  const body = {
    title,
    subtitle,
    order: Number(order) || 0,
    active: Boolean(active),
    package_ids: window._selectedPackageIds || []
  };

  const res = id
    ? await api('PUT', `/collections/${id}`, body)
    : await api('POST', '/collections', body);

  if (res?.error) {
    showToast(res.error, 'error');
    return;
  }

  showToast(id ? 'Collection updated!' : 'Collection added!', 'success');
  closeModal();
  loadCollections();
  loadDashboard();
};

window.deleteCollection = async function(id) {
  if (!confirm('Are you sure you want to delete this collection?')) return;
  const res = await api('DELETE', `/collections/${id}`);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast('Collection deleted', 'success');
  closeModal();
  loadCollections();
  loadDashboard();
};

document.getElementById('btn-add-collection')?.addEventListener('click', () => openCollectionForm());

// ══════════════════════════════════════════════════════════════════════════════
// TICKETS
// ══════════════════════════════════════════════════════════════════════════════
let tickets = [];

async function loadTickets() {
  tickets = await api('GET', '/tickets') || [];
  const tbody = document.getElementById('tbody-tickets');
  if (!tbody) return;
  if (!tickets.length) { tbody.innerHTML = `<tr class="empty-row"><td colspan="5"><i class="fas fa-ticket-alt" style="font-size:24px;color:#e5e7eb;display:block;margin-bottom:8px"></i>No tickets yet.</td></tr>`; return; }
  tbody.innerHTML = tickets.map(t => {
    const ticketId = t.ticket_id || t.id;
    return `
    <tr>
      <td>${imgCell(t.card_image)}</td>
      <td><strong>${t.title}</strong>${t.short_title ? `<br><span style="font-size:12px;color:#9ca3af">${t.short_title}</span>` : ''}</td>
      <td>${t.destination_name || '<span style="color:#d1d5db">—</span>'}</td>
      <td>${t.display_amount ? '₹ ' + Number(t.display_amount).toLocaleString('en-IN') : '<span style="color:#d1d5db">—</span>'}</td>
      <td><div class="table-actions">
        <button class="btn-sm btn-edit" onclick="editTicket(${ticketId})"><i class="fas fa-pen"></i> Edit</button>
        <button class="btn-sm btn-delete" onclick="deleteTicket(${ticketId})" title="Delete Ticket"><i class="fas fa-trash"></i> Delete</button>
      </div></td>
    </tr>`;
  }).join('');
}

function openTicketForm(t = null) {
  const ticketId = t ? (t.ticket_id || t.id) : null;
  openModal(t ? 'Edit Ticket' : 'Add Ticket', `
    <div class="form-group"><label>Title *</label><input id="t-title" value="${t?.title||''}" placeholder="e.g. Burj Khalifa 124th Floor"></div>
    <div class="form-group"><label>Short Title</label><input id="t-short" value="${t?.short_title||''}" placeholder="Short display name"></div>
    <div class="form-row-two">
      <div class="form-group"><label>Price (₹)</label><input id="t-price" type="number" value="${t?.display_amount||''}" placeholder="1500"></div>
      <div class="form-group"><label>Destination</label><input id="t-dest" value="${t?.destination_name||''}" placeholder="e.g. Dubai"></div>
    </div>
    <div class="form-group"><label>Card Image</label>${createImageUpload('t-card', t?.card_image||'')}</div>
    <div class="form-group"><label>Description</label><textarea id="t-desc" placeholder="Ticket description...">${t?.description||''}</textarea></div>
    <div class="modal-actions">
      <div>
        ${ticketId ? `<button type="button" class="btn-danger" onclick="deleteTicket(${ticketId})"><i class="fas fa-trash-alt"></i> Delete Ticket</button>` : ''}
      </div>
      <div class="modal-actions-right">
        <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn-primary" onclick="saveTicket(${ticketId || 'null'})"><i class="fas fa-save"></i> ${t ? 'Update' : 'Save'}</button>
      </div>
    </div>`);
}

window.editTicket = function(id) { const t = tickets.find(x => String(x.ticket_id || x.id) === String(id)); if (t) openTicketForm(t); };

window.saveTicket = async function(id) {
  const body = {
    title: document.getElementById('t-title').value.trim(),
    short_title: document.getElementById('t-short').value.trim(),
    display_amount: document.getElementById('t-price').value,
    destination_name: document.getElementById('t-dest').value.trim(),
    card_image: document.getElementById('img-url-t-card').value,
    description: document.getElementById('t-desc').value.trim(),
  };
  if (!body.title) { showToast('Title required', 'error'); return; }
  const res = id ? await api('PUT', `/tickets/${id}`, body) : await api('POST', '/tickets', body);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast(id ? 'Ticket updated!' : 'Ticket added!', 'success');
  closeModal(); loadTickets(); loadDashboard();
};

window.deleteTicket = async function(id) {
  if (!confirm('Are you sure you want to delete this ticket?')) return;
  const res = await api('DELETE', `/tickets/${id}`);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast('Ticket deleted', 'success');
  closeModal(); loadTickets(); loadDashboard();
};

document.getElementById('btn-add-ticket')?.addEventListener('click', () => openTicketForm());

// ══════════════════════════════════════════════════════════════════════════════
// BLOGS
// ══════════════════════════════════════════════════════════════════════════════
let blogs = [];

async function loadBlogs() {
  blogs = await api('GET', '/blogs') || [];
  const tbody = document.getElementById('tbody-blogs');
  if (!tbody) return;
  if (!blogs.length) { tbody.innerHTML = `<tr class="empty-row"><td colspan="5"><i class="fas fa-blog" style="font-size:24px;color:#e5e7eb;display:block;margin-bottom:8px"></i>No blogs yet.</td></tr>`; return; }
  tbody.innerHTML = blogs.map(b => {
    const blogId = b.blog_id || b.id;
    return `
    <tr>
      <td>${imgCell(b.card_image)}</td>
      <td><strong>${b.title}</strong></td>
      <td><code style="font-size:12px;background:#f3f4f6;padding:2px 8px;border-radius:6px">${b.slug_url}</code></td>
      <td>${b.date || '<span style="color:#d1d5db">—</span>'}</td>
      <td><div class="table-actions">
        <button class="btn-sm btn-edit" onclick="editBlog(${blogId})"><i class="fas fa-pen"></i> Edit</button>
        <button class="btn-sm btn-delete" onclick="deleteBlog(${blogId})" title="Delete Blog"><i class="fas fa-trash"></i> Delete</button>
      </div></td>
    </tr>`;
  }).join('');
}

function openBlogForm(b = null) {
  const today = new Date().toISOString().split('T')[0];
  const blogId = b ? (b.blog_id || b.id) : null;
  openModal(b ? 'Edit Blog' : 'Add Blog', `
    <div class="form-group"><label>Title *</label><input id="b-title" value="${b?.title||''}" placeholder="Blog post title"></div>
    <div class="form-row">
      <div class="form-group"><label>Category</label><input id="b-category" value="${b?.category||'Travel Guide'}" placeholder="e.g. Destination Guide, Travel Tips, Adventure"></div>
      <div class="form-group"><label>Date</label><input id="b-date" type="date" value="${b?.date||today}"></div>
    </div>
    <div class="form-group"><label>Cover / Banner Image</label>${createImageUpload('b-card', b?.card_image||b?.banner_image||'')}</div>
    <div class="form-group"><label>Short Overview / Excerpt (Optional)</label><textarea id="b-desc" rows="2" placeholder="Brief 1-2 sentence excerpt for cards...">${b?.description||''}</textarea></div>
    <div class="form-group"><label>Full Article Content *</label><textarea id="b-content" rows="8" placeholder="Write or paste your article content here...">${b?.content||''}</textarea></div>
    <div class="modal-actions">
      <div>
        ${blogId ? `<button type="button" class="btn-danger" onclick="deleteBlog(${blogId})"><i class="fas fa-trash-alt"></i> Delete Blog</button>` : ''}
      </div>
      <div class="modal-actions-right">
        <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn-primary" onclick="saveBlog(${blogId || 'null'})"><i class="fas fa-save"></i> ${b ? 'Update' : 'Save'}</button>
      </div>
    </div>`);
}

window.editBlog = function(id) { const b = blogs.find(x => String(x.blog_id || x.id) === String(id)); if (b) openBlogForm(b); };

window.saveBlog = async function(id) {
  const cardImg = document.getElementById('img-url-b-card')?.value || '';
  const body = {
    title: document.getElementById('b-title').value.trim(),
    category: document.getElementById('b-category')?.value.trim() || 'Travel Guide',
    date: document.getElementById('b-date').value,
    card_image: cardImg,
    banner_image: cardImg,
    description: document.getElementById('b-desc')?.value.trim() || '',
    content: document.getElementById('b-content').value.trim(),
  };
  if (!body.title) { showToast('Title required', 'error'); return; }
  const res = id ? await api('PUT', `/blogs/${id}`, body) : await api('POST', '/blogs', body);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast(id ? 'Blog updated!' : 'Blog added!', 'success');
  closeModal(); loadBlogs(); loadDashboard();
};

window.deleteBlog = async function(id) {
  if (!confirm('Are you sure you want to delete this blog?')) return;
  const res = await api('DELETE', `/blogs/${id}`);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast('Blog deleted', 'success');
  closeModal(); loadBlogs(); loadDashboard();
};

document.getElementById('btn-add-blog')?.addEventListener('click', () => openBlogForm());

// ══════════════════════════════════════════════════════════════════════════════
// TESTIMONIALS
// ══════════════════════════════════════════════════════════════════════════════
let testimonials = [];

async function loadTestimonials() {
  testimonials = await api('GET', '/testimonials') || [];
  const tbody = document.getElementById('tbody-testimonials');
  if (!tbody) return;
  if (!testimonials.length) { tbody.innerHTML = `<tr class="empty-row"><td colspan="5"><i class="fas fa-star" style="font-size:24px;color:#e5e7eb;display:block;margin-bottom:8px"></i>No testimonials yet.</td></tr>`; return; }
  tbody.innerHTML = testimonials.map(t => {
    const testimonialId = t.testimonial_id || t.id;
    return `
    <tr>
      <td><strong>${t.name}</strong></td>
      <td>${t.location || '<span style="color:#d1d5db">—</span>'}</td>
      <td>${'★'.repeat(t.rating||5)}</td>
      <td><span class="text-truncate">${t.feedback || '<span style="color:#d1d5db">—</span>'}</span></td>
      <td><div class="table-actions">
        <button class="btn-sm btn-edit" onclick="editTestimonial(${testimonialId})"><i class="fas fa-pen"></i> Edit</button>
        <button class="btn-sm btn-delete" onclick="deleteTestimonial(${testimonialId})" title="Delete Testimonial"><i class="fas fa-trash"></i> Delete</button>
      </div></td>
    </tr>`;
  }).join('');
}

function openTestimonialForm(t = null) {
  const testimonialId = t ? (t.testimonial_id || t.id) : null;
  openModal(t ? 'Edit Testimonial' : 'Add Testimonial', `
    <div class="form-row-two">
      <div class="form-group"><label>Name *</label><input id="r-name" value="${t?.name||''}" placeholder="John Doe"></div>
      <div class="form-group"><label>Location</label><input id="r-loc" value="${t?.location||''}" placeholder="Dubai, UAE"></div>
    </div>
    <div class="form-group"><label>Rating</label>${starRatingHtml('r', t?.rating||5)}</div>
    <div class="form-group"><label>Feedback</label><textarea id="r-feedback" rows="4" placeholder="Customer review...">${t?.feedback||''}</textarea></div>
    <div class="modal-actions">
      <div>
        ${testimonialId ? `<button type="button" class="btn-danger" onclick="deleteTestimonial(${testimonialId})"><i class="fas fa-trash-alt"></i> Delete Testimonial</button>` : ''}
      </div>
      <div class="modal-actions-right">
        <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn-primary" onclick="saveTestimonial(${testimonialId || 'null'})"><i class="fas fa-save"></i> ${t ? 'Update' : 'Save'}</button>
      </div>
    </div>`);
}

window.editTestimonial = function(id) { const t = testimonials.find(x => String(x.testimonial_id || x.id) === String(id)); if (t) openTestimonialForm(t); };

window.saveTestimonial = async function(id) {
  const body = {
    name: document.getElementById('r-name').value.trim(),
    location: document.getElementById('r-loc').value.trim(),
    rating: document.getElementById('rating-r').value,
    feedback: document.getElementById('r-feedback').value.trim(),
  };
  if (!body.name) { showToast('Name required', 'error'); return; }
  const res = id ? await api('PUT', `/testimonials/${id}`, body) : await api('POST', '/testimonials', body);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast(id ? 'Updated!' : 'Added!', 'success');
  closeModal(); loadTestimonials(); loadDashboard();
};

window.deleteTestimonial = async function(id) {
  if (!confirm('Are you sure you want to delete this testimonial?')) return;
  const res = await api('DELETE', `/testimonials/${id}`);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast('Testimonial deleted', 'success');
  closeModal(); loadTestimonials(); loadDashboard();
};

document.getElementById('btn-add-testimonial')?.addEventListener('click', () => openTestimonialForm());

// ══════════════════════════════════════════════════════════════════════════════
// PARTNERS
// ══════════════════════════════════════════════════════════════════════════════
let partners = [];

async function loadPartners() {
  partners = await api('GET', '/partners') || [];
  const tbody = document.getElementById('tbody-partners');
  if (!tbody) return;
  if (!partners.length) { tbody.innerHTML = `<tr class="empty-row"><td colspan="3"><i class="fas fa-handshake" style="font-size:24px;color:#e5e7eb;display:block;margin-bottom:8px"></i>No partners yet.</td></tr>`; return; }
  tbody.innerHTML = partners.map(p => {
    const partnerId = p.partner_id || p.id;
    return `
    <tr>
      <td>${imgCell(p.image)}</td>
      <td><strong>${p.name}</strong></td>
      <td><div class="table-actions">
        <button class="btn-sm btn-edit" onclick="editPartner(${partnerId})"><i class="fas fa-pen"></i> Edit</button>
        <button class="btn-sm btn-delete" onclick="deletePartner(${partnerId})" title="Delete Partner"><i class="fas fa-trash"></i> Delete</button>
      </div></td>
    </tr>`;
  }).join('');
}

function openPartnerForm(p = null) {
  const partnerId = p ? (p.partner_id || p.id) : null;
  openModal(p ? 'Edit Partner' : 'Add Partner', `
    <div class="form-group"><label>Partner Name *</label><input id="pr-name" value="${p?.name||''}" placeholder="e.g. Emirates Airlines"></div>
    <div class="form-group"><label>Logo Image</label>${createImageUpload('pr-img', p?.image||'')}</div>
    <div class="modal-actions">
      <div>
        ${partnerId ? `<button type="button" class="btn-danger" onclick="deletePartner(${partnerId})"><i class="fas fa-trash-alt"></i> Delete Partner</button>` : ''}
      </div>
      <div class="modal-actions-right">
        <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn-primary" onclick="savePartner(${partnerId || 'null'})"><i class="fas fa-save"></i> ${p ? 'Update' : 'Save'}</button>
      </div>
    </div>`);
}

window.editPartner = function(id) { const p = partners.find(x => String(x.partner_id || x.id) === String(id)); if (p) openPartnerForm(p); };

window.savePartner = async function(id) {
  const body = {
    name: document.getElementById('pr-name').value.trim(),
    image: document.getElementById('img-url-pr-img').value,
  };
  if (!body.name) { showToast('Name required', 'error'); return; }
  const res = id ? await api('PUT', `/partners/${id}`, body) : await api('POST', '/partners', body);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast(id ? 'Updated!' : 'Added!', 'success');
  closeModal(); loadPartners(); loadDashboard();
};

window.deletePartner = async function(id) {
  if (!confirm('Are you sure you want to delete this partner?')) return;
  const res = await api('DELETE', `/partners/${id}`);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast('Partner deleted', 'success');
  closeModal(); loadPartners(); loadDashboard();
};

document.getElementById('btn-add-partner')?.addEventListener('click', () => openPartnerForm());

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════════════════════════════
document.getElementById('form-change-password')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('settings-msg');
  const np = document.getElementById('s-new-pass').value;
  const cp = document.getElementById('s-conf-pass').value;
  if (np !== cp) { msg.textContent = 'Passwords do not match'; msg.className = 'settings-msg error'; return; }
  const res = await api('POST', '/auth/change-password', {
    currentPassword: document.getElementById('s-cur-pass').value,
    newPassword: np
  });
  if (res?.error) { msg.textContent = res.error; msg.className = 'settings-msg error'; }
  else { msg.textContent = 'Password updated successfully!'; msg.className = 'settings-msg success'; }
});

// ══════════════════════════════════════════════════════════════════════════════
// ATTRACTIONS
// ══════════════════════════════════════════════════════════════════════════════
let attractions = [];

async function loadAttractions() {
  attractions = await api('GET', '/attractions') || [];
  const tbody = document.getElementById('tbody-attractions');
  if (!tbody) return;
  if (!attractions.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7"><i class="fas fa-camera" style="font-size:24px;color:#e5e7eb;display:block;margin-bottom:8px"></i>No attractions found.</td></tr>`;
    return;
  }
  tbody.innerHTML = attractions.map(a => {
    const attrId = a.attraction_id || a.id;
    return `
    <tr>
      <td>${imgCell(a.card_image || a.banner_image)}</td>
      <td><strong>${a.name || a.title}</strong></td>
      <td><span class="badge" style="background:#f1f5f9;color:#334155;font-weight:600;padding:4px 10px;border-radius:12px">${a.destination_name || '—'}</span></td>
      <td><span class="badge" style="background:#e0f2fe;color:#0369a1;font-weight:bold;padding:4px 10px;border-radius:12px">${a.experience_type || 'Cultural'}</span></td>
      <td>${a.duration || '2-3 Hours'}</td>
      <td>${a.price || a.amount ? `₹ ${Number(a.price || a.amount).toLocaleString('en-IN')}` : 'Free / Included'}</td>
      <td><div class="table-actions">
        <button class="btn-sm btn-edit" onclick="editAttraction(${attrId})"><i class="fas fa-pen"></i> Edit</button>
        <button class="btn-sm btn-delete" onclick="deleteAttraction(${attrId})" title="Delete Attraction"><i class="fas fa-trash"></i> Delete</button>
      </div></td>
    </tr>`;
  }).join('');
}

function openAttractionForm(a = null) {
  const attrId = a ? (a.attraction_id || a.id) : null;
  openModal(a ? 'Edit Attraction' : 'Add Attraction', `
    <div class="form-group"><label>Attraction Name *</label><input id="a-name" value="${a?.name||a?.title||''}" placeholder="e.g. Burj Khalifa Observation Deck & Sky Views"></div>
    <div class="form-row-two">
      <div class="form-group"><label>Destination / Category *</label>
        <select id="a-dest-id">
          ${getDestOptions(a?.destination_id)}
        </select>
      </div>
      <div class="form-group"><label>Experience Type *</label>
        <select id="a-exp">
          <option value="Adventure" ${a?.experience_type==='Adventure'?'selected':''}>Adventure</option>
          <option value="Cultural" ${a?.experience_type==='Cultural'?'selected':''}>Cultural</option>
          <option value="Luxury" ${a?.experience_type==='Luxury'?'selected':''}>Luxury</option>
          <option value="Sightseeing" ${a?.experience_type==='Sightseeing'?'selected':''}>Sightseeing</option>
          <option value="Nature" ${a?.experience_type==='Nature'?'selected':''}>Nature</option>
          <option value="Family" ${a?.experience_type==='Family'?'selected':''}>Family</option>
        </select>
      </div>
    </div>
    <div class="form-row-two">
      <div class="form-group"><label>Duration</label><input id="a-duration" value="${a?.duration||'2-3 Hours'}" placeholder="e.g. 2-3 Hours, Half Day, Full Day"></div>
      <div class="form-group"><label>Price (₹)</label><input id="a-price" type="number" value="${a?.price||a?.amount||''}" placeholder="3500"></div>
    </div>
    <div class="form-group"><label>Included Items (comma or line separated)</label><textarea id="a-included" rows="2" placeholder="e.g. Timed Entry Ticket, Access to Observation Deck, Soft Drinks">${a?.included||''}</textarea></div>
    <div class="form-group"><label>Card Image (Thumbnail)</label>${createImageUpload('a-card', a?.card_image||'')}</div>
    <div class="form-group"><label>Banner Image (Detail Page Header Cover)</label>${createImageUpload('a-banner', a?.banner_image||a?.card_image||'')}</div>
    <div class="form-group"><label>Description / Overview</label><textarea id="a-desc" rows="4" placeholder="Detailed description of attraction & experiences...">${a?.description||a?.overview||''}</textarea></div>
    <div class="modal-actions">
      <div>
        ${attrId ? `<button type="button" class="btn-danger" onclick="deleteAttraction(${attrId})"><i class="fas fa-trash-alt"></i> Delete Attraction</button>` : ''}
      </div>
      <div class="modal-actions-right">
        <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn-primary" onclick="saveAttraction(${attrId || 'null'})"><i class="fas fa-save"></i> ${a ? 'Update' : 'Save'}</button>
      </div>
    </div>`);
}

window.editAttraction = function(id) { const a = attractions.find(x => String(x.attraction_id || x.id) === String(id)); if (a) openAttractionForm(a); };

window.saveAttraction = async function(id) {
  const destSelect = document.getElementById('a-dest-id');
  const selectedDestId = destSelect ? destSelect.value : '';
  const selectedDestName = destSelect && destSelect.selectedIndex >= 0 ? destSelect.options[destSelect.selectedIndex].text.replace(/^[—\-]\s*/, '') : '';

  const body = {
    name: document.getElementById('a-name').value.trim(),
    destination_id: selectedDestId ? Number(selectedDestId) : null,
    destination_name: selectedDestId ? selectedDestName : '',
    experience_type: document.getElementById('a-exp').value,
    duration: document.getElementById('a-duration').value.trim() || '2-3 Hours',
    price: document.getElementById('a-price').value,
    included: document.getElementById('a-included').value.trim(),
    card_image: document.getElementById('img-url-a-card').value,
    banner_image: document.getElementById('img-url-a-banner').value || document.getElementById('img-url-a-card').value,
    description: document.getElementById('a-desc').value.trim(),
  };
  if (!body.name) { showToast('Attraction name required', 'error'); return; }
  const res = id ? await api('PUT', `/attractions/${id}`, body) : await api('POST', '/attractions', body);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast(id ? 'Updated!' : 'Added!', 'success');
  closeModal(); loadAttractions(); loadDashboard();
};

window.deleteAttraction = async function(id) {
  if (!confirm('Are you sure you want to delete this attraction?')) return;
  const res = await api('DELETE', `/attractions/${id}`);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast('Attraction deleted', 'success');
  closeModal(); loadAttractions(); loadDashboard();
};

document.getElementById('btn-add-attraction')?.addEventListener('click', () => openAttractionForm());

// ── POSTERS ───────────────────────────────────────────────────────────────────
let posters = [];

async function loadPosters() {
  posters = await api('GET', '/posters') || [];
  const tbody = document.getElementById('tbody-posters');
  if (!tbody) return;
  if (!posters.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="4"><i class="fas fa-image" style="font-size:24px;color:#e5e7eb;display:block;margin-bottom:8px"></i>No promotional banners found. Upload one to get started.</td></tr>`;
    return;
  }
  tbody.innerHTML = posters.map(p => {
    const posterId = p.poster_id || p.id;
    return `
    <tr>
      <td>${imgCell(p.image)}</td>
      <td><strong>${p.title || p.name || 'Banner'}</strong></td>
      <td><span class="badge" style="background:#f3f4f6;color:#374151;font-weight:600;padding:4px 10px;border-radius:12px">${p.link || 'No Link'}</span></td>
      <td><div class="table-actions">
        <button class="btn-sm btn-edit" onclick="editPoster(${posterId})"><i class="fas fa-pen"></i> Edit</button>
        <button class="btn-sm btn-delete" onclick="deletePoster(${posterId})" title="Delete Banner"><i class="fas fa-trash"></i> Delete</button>
      </div></td>
    </tr>`;
  }).join('');
}

function openPosterForm(p = null) {
  const posterId = p ? (p.poster_id || p.id) : null;
  openModal(p ? 'Edit Promotional Banner' : 'Add Promotional Banner', `
    <div class="form-group"><label>Banner Title / Name *</label><input id="p-title" value="${p?.title||p?.name||''}" placeholder="e.g. Summer Special Holiday Discount"></div>
    <div class="form-group"><label>Promotional Banner Image (Long Image) *</label>${createImageUpload('p-img', p?.image||'')}</div>
    <div class="form-group"><label>Target Redirect Link (Optional)</label><input id="p-link" value="${p?.link||''}" placeholder="e.g. /holiday-package.html or /attraction.html"></div>
    <div class="modal-actions">
      <div>
        ${posterId ? `<button type="button" class="btn-danger" onclick="deletePoster(${posterId})"><i class="fas fa-trash-alt"></i> Delete Banner</button>` : ''}
      </div>
      <div class="modal-actions-right">
        <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn-primary" onclick="savePoster(${posterId || 'null'})"><i class="fas fa-save"></i> ${p ? 'Update' : 'Save'}</button>
      </div>
    </div>`);
}

window.openPosterForm = openPosterForm;
window.editPoster = function(id) { const p = posters.find(x => String(x.poster_id || x.id) === String(id)); if (p) openPosterForm(p); };

window.savePoster = async function(id) {
  const body = {
    title: document.getElementById('p-title').value.trim(),
    image: document.getElementById('img-url-p-img').value,
    link: document.getElementById('p-link').value.trim(),
  };
  if (!body.title) { showToast('Banner title required', 'error'); return; }
  if (!body.image) { showToast('Banner image required', 'error'); return; }
  const res = id ? await api('PUT', `/posters/${id}`, body) : await api('POST', '/posters', body);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast(id ? 'Updated!' : 'Banner Saved!', 'success');
  closeModal(); loadPosters(); loadDashboard();
};

window.deletePoster = async function(id) {
  if (!confirm('Delete this promotional banner?')) return;
  const res = await api('DELETE', `/posters/${id}`);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast('Deleted', 'success');
  closeModal(); loadPosters(); loadDashboard();
};

document.getElementById('btn-add-poster')?.addEventListener('click', () => openPosterForm());

// ══════════════════════════════════════════════════════════════════════════════
// TRIP & PACKAGE ENQUIRIES
// ══════════════════════════════════════════════════════════════════════════════
let enquiries = [];
let currentEnquiryFilter = 'all';
let currentEnquirySearch = '';

async function loadEnquiries() {
  if (!destinations.length) destinations = await api('GET', '/destinations') || [];
  if (!packages.length) packages = await api('GET', '/packages') || [];

  enquiries = await api('GET', '/enquiries') || [];
  updateEnquiryCounts();
  renderEnquiriesTable();
}

function updateEnquiryCounts() {
  const allCnt = enquiries.length;
  const pkgCnt = enquiries.filter(e => String(e.enquiry_type).toLowerCase() === 'package' || e.package_name).length;
  const destCnt = enquiries.filter(e => String(e.enquiry_type).toLowerCase() === 'destination' && !e.package_name).length;
  const customCnt = enquiries.filter(e => !e.package_name && String(e.enquiry_type).toLowerCase() !== 'package' && String(e.enquiry_type).toLowerCase() !== 'destination').length;

  const setCnt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setCnt('count-enq-all', allCnt);
  setCnt('count-enq-pkg', pkgCnt);
  setCnt('count-enq-dest', destCnt);
  setCnt('count-enq-custom', customCnt);
}

function renderEnquiriesTable() {
  const tbody = document.getElementById('tbody-enquiries');
  if (!tbody) return;

  let filtered = [...enquiries];

  // Apply tab filter
  if (currentEnquiryFilter === 'Package') {
    filtered = filtered.filter(e => String(e.enquiry_type).toLowerCase() === 'package' || e.package_name);
  } else if (currentEnquiryFilter === 'Destination') {
    filtered = filtered.filter(e => String(e.enquiry_type).toLowerCase() === 'destination' && !e.package_name);
  } else if (currentEnquiryFilter === 'Custom') {
    filtered = filtered.filter(e => !e.package_name && String(e.enquiry_type).toLowerCase() !== 'package' && String(e.enquiry_type).toLowerCase() !== 'destination');
  }

  // Apply search query
  if (currentEnquirySearch) {
    const q = currentEnquirySearch.toLowerCase();
    filtered = filtered.filter(e =>
      (e.name || '').toLowerCase().includes(q) ||
      (e.phone || '').toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q) ||
      (e.destination_name || '').toLowerCase().includes(q) ||
      (e.package_name || '').toLowerCase().includes(q)
    );
  }

  if (!filtered.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7"><i class="fas fa-clipboard-list" style="font-size:24px;color:#e5e7eb;display:block;margin-bottom:8px"></i>No enquiries matching current criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(e => {
    const enqId = e.enquiry_id || e.id;
    const rawType = (e.enquiry_type || (e.package_name ? 'Package' : (e.destination_name ? 'Destination' : 'Custom'))).toLowerCase();
    let typeBadge = '<span class="badge blue">📍 Destination</span>';
    if (rawType.includes('career')) {
      typeBadge = '<span class="badge" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a">💼 Career</span>';
    } else if (rawType.includes('package') || e.package_name) {
      typeBadge = '<span class="badge red">📦 Package</span>';
    } else if (rawType.includes('custom') || rawType.includes('general') || rawType.includes('contact')) {
      typeBadge = '<span class="badge green">✨ Custom / Msg</span>';
    }

    const destOrPkg = e.package_name || e.destination_name || e.destination || 'Custom Itinerary';
    const durationText = e.start_date && e.end_date ? `${e.start_date} to ${e.end_date} (${e.duration_days||0}D)` : (e.duration_days ? `${e.duration_days} Days (Flexible)` : (rawType.includes('career') ? 'Job Application' : 'Flexible Dates'));
    const passengersText = rawType.includes('career') ? '<span class="badge gray" style="font-size:10px">Applicant</span>' : `${e.adults||1} Adult${(e.adults||1)>1?'s':''}${e.children>0?`, ${e.children} Child`:''}`;
    const cleanPhone = (e.phone || '').replace(/[^0-9]/g, '');

    return `
      <tr>
        <td>
          <strong>${e.name || 'Anonymous'}</strong><br>
          <span style="font-size:12px;color:#6b7280;display:flex;align-items:center;gap:6px;margin-top:2px">
            <i class="fas fa-phone text-xs"></i> <a href="tel:${e.phone}" style="color:#2563eb;text-decoration:none">${e.phone}</a>
            ${cleanPhone ? `<a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent('Hello ' + (e.name||'') + ', regarding your enquiry for ' + destOrPkg + ' on Mangalam Travel & Tours...')}" target="_blank" style="color:#16a34a;margin-left:4px" title="Chat on WhatsApp"><i class="fab fa-whatsapp"></i></a>` : ''}
          </span>
          ${e.email ? `<span style="font-size:11px;color:#9ca3af;display:block">${e.email}</span>` : ''}
        </td>
        <td>${typeBadge}</td>
        <td><strong style="color:#1e293b">${destOrPkg}</strong></td>
        <td><span style="font-size:12px;font-weight:500">${durationText}</span></td>
        <td><span style="font-size:12px">${passengersText}</span><br><span class="badge gray" style="font-size:10px;margin-top:3px">${e.hotel_rating || '3-Star'}</span></td>
        <td>
          <select onchange="updateEnquiryStatus(${enqId}, this.value)" style="padding:4px 8px;border-radius:6px;font-size:12px;font-weight:600;border:1px solid #d1d5db;background:#fff">
            <option value="New" ${e.status === 'New' ? 'selected' : ''}>🔴 New</option>
            <option value="Contacted" ${e.status === 'Contacted' ? 'selected' : ''}>🔵 Contacted</option>
            <option value="In Progress" ${e.status === 'In Progress' ? 'selected' : ''}>🟡 In Progress</option>
            <option value="Completed" ${e.status === 'Completed' ? 'selected' : ''}>🟢 Completed</option>
            <option value="Cancelled" ${e.status === 'Cancelled' ? 'selected' : ''}>⚪ Cancelled</option>
          </select>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-sm btn-edit" onclick="viewEnquiryModal(${enqId})" title="View Full Details"><i class="fas fa-eye"></i> View</button>
            <button class="btn-sm btn-delete" onclick="deleteEnquiry(${enqId})" title="Delete Enquiry"><i class="fas fa-trash"></i> Delete</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

window.filterEnquiries = function(type) {
  currentEnquiryFilter = type;
  document.querySelectorAll('#enquiry-filter-tabs .filter-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === type);
  });
  renderEnquiriesTable();
};

window.searchEnquiries = function(val) {
  currentEnquirySearch = (val || '').trim();
  renderEnquiriesTable();
};

function openEnquiryForm(e = null) {
  const pkgOptions = packages.map(p => `<option value="${p.package_name||p.title}">${p.package_name||p.title}</option>`).join('');
  const destOptions = destinations.map(d => `<option value="${d.destination_name||d.name}">${d.destination_name||d.name}</option>`).join('');
  const enqId = e ? (e.enquiry_id || e.id) : null;

  openModal(e ? 'Edit Enquiry' : 'Log New Enquiry', `
    <div class="form-group">
      <label>Enquiry Type *</label>
      <select id="enq-type">
        <option value="Package" ${e?.enquiry_type === 'Package' || e?.package_name ? 'selected' : ''}>📦 Holiday Package</option>
        <option value="Destination" ${e?.enquiry_type === 'Destination' ? 'selected' : ''}>📍 Destination Trip</option>
        <option value="Custom" ${e?.enquiry_type === 'Custom' ? 'selected' : ''}>✨ Custom Tailormade Tour</option>
        <option value="Career" ${e?.enquiry_type === 'Career' ? 'selected' : ''}>💼 Career / Job Application</option>
      </select>
    </div>

    <div class="form-group" id="enq-target-group">
      <label id="enq-target-label">Selected Destination / Package Name *</label>
      <input id="enq-target-name" list="enq-targets-datalist" value="${e?.package_name || e?.destination_name || e?.destination || ''}" placeholder="e.g. Dubai Luxury Extravaganza or Bali">
      <datalist id="enq-targets-datalist">
        ${pkgOptions}
        ${destOptions}
      </datalist>
    </div>

    <div class="form-row">
      <div class="form-group"><label>Customer Name *</label><input id="enq-name" value="${e?.name||''}" placeholder="e.g. John Doe"></div>
      <div class="form-group"><label>Phone / WhatsApp Number *</label><input id="enq-phone" value="${e?.phone||''}" placeholder="e.g. +971 50 123 4567"></div>
    </div>

    <div class="form-row">
      <div class="form-group"><label>Email Address</label><input id="enq-email" type="email" value="${e?.email||''}" placeholder="john@example.com"></div>
      <div class="form-group">
        <label>Hotel Category</label>
        <select id="enq-hotel">
          <option value="3-Star" ${e?.hotel_rating === '3-Star' ? 'selected' : ''}>3-Star Hotel</option>
          <option value="4-Star" ${e?.hotel_rating === '4-Star' ? 'selected' : ''}>4-Star Premium Hotel</option>
          <option value="5-Star" ${e?.hotel_rating === '5-Star' ? 'selected' : ''}>5-Star Luxury Hotel</option>
          <option value="Luxury Resort" ${e?.hotel_rating === 'Luxury Resort' ? 'selected' : ''}>Luxury Resort / Villa</option>
          <option value="Budget" ${e?.hotel_rating === 'Budget' ? 'selected' : ''}>Budget / Standard</option>
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group"><label>Travel Start Date</label><input id="enq-start-date" type="date" value="${e?.start_date||''}"></div>
      <div class="form-group"><label>Travel End Date</label><input id="enq-end-date" type="date" value="${e?.end_date||''}"></div>
    </div>

    <div class="form-row">
      <div class="form-group"><label>Adult Travelers (12+ yrs)</label><input id="enq-adults" type="number" min="1" value="${e?.adults||2}"></div>
      <div class="form-group"><label>Child Travelers (2-11 yrs)</label><input id="enq-children" type="number" min="0" value="${e?.children||0}"></div>
      <div class="form-group"><label>Duration (Days)</label><input id="enq-duration" type="number" min="1" value="${e?.duration_days||5}"></div>
    </div>

    <div class="form-group">
      <label>Customer Notes / Preferences</label>
      <textarea id="enq-notes" rows="3" placeholder="Special requests, flight requirements, dietary preferences...">${e?.notes||''}</textarea>
    </div>

    <div class="form-group">
      <label>Lead Status</label>
      <select id="enq-status">
        <option value="New" ${e?.status === 'New' ? 'selected' : ''}>🔴 New</option>
        <option value="Contacted" ${e?.status === 'Contacted' ? 'selected' : ''}>🔵 Contacted</option>
        <option value="In Progress" ${e?.status === 'In Progress' ? 'selected' : ''}>🟡 In Progress</option>
        <option value="Completed" ${e?.status === 'Completed' ? 'selected' : ''}>🟢 Completed</option>
        <option value="Cancelled" ${e?.status === 'Cancelled' ? 'selected' : ''}>⚪ Cancelled</option>
      </select>
    </div>

    <div class="modal-actions">
      <div>
        ${enqId ? `<button type="button" class="btn-danger" onclick="deleteEnquiry(${enqId})"><i class="fas fa-trash-alt"></i> Delete Enquiry</button>` : ''}
      </div>
      <div class="modal-actions-right">
        <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn-primary" onclick="saveEnquiry(${enqId || 'null'})"><i class="fas fa-save"></i> ${e ? 'Update Enquiry' : 'Save Enquiry'}</button>
      </div>
    </div>
  `);
}

window.saveEnquiry = async function(id) {
  const name = document.getElementById('enq-name').value.trim();
  const phone = document.getElementById('enq-phone').value.trim();
  const target = document.getElementById('enq-target-name').value.trim();
  const type = document.getElementById('enq-type').value;

  if (!name || !phone) {
    showToast('Customer Name and Phone are required', 'error');
    return;
  }

  const body = {
    enquiry_type: type,
    destination_name: target,
    package_name: type === 'Package' ? target : '',
    name,
    phone,
    email: document.getElementById('enq-email').value.trim(),
    hotel_rating: document.getElementById('enq-hotel').value,
    start_date: document.getElementById('enq-start-date').value,
    end_date: document.getElementById('enq-end-date').value,
    adults: Number(document.getElementById('enq-adults').value) || 1,
    children: Number(document.getElementById('enq-children').value) || 0,
    duration_days: Number(document.getElementById('enq-duration').value) || 0,
    notes: document.getElementById('enq-notes').value.trim(),
    status: document.getElementById('enq-status').value
  };

  const res = id ? await api('PUT', `/enquiries/${id}`, body) : await api('POST', '/enquiries', body);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast(id ? 'Enquiry updated!' : 'Enquiry saved!', 'success');
  closeModal(); loadEnquiries(); loadDashboard();
};

window.viewEnquiryModal = function(id) {
  const e = enquiries.find(x => String(x.enquiry_id || x.id) === String(id));
  if (!e) return;

  const enqId = e.enquiry_id || e.id;
  const placesList = Array.isArray(e.places_to_visit) && e.places_to_visit.length > 0
    ? e.places_to_visit.map(p => `<li style="margin-bottom:4px">📍 ${p}</li>`).join('')
    : '<li style="color:#9ca3af">Flexible / All major attractions</li>';

  const cleanPhone = (e.phone || '').replace(/[^0-9]/g, '');
  const destOrPkg = e.package_name || e.destination_name || e.destination || 'Custom Tour';
  const typeText = e.enquiry_type || (e.package_name ? 'Package Enquiry' : 'Destination Enquiry');

  // Convert any URL or uploaded file in notes into a clickable link
  const formattedNotes = (e.notes || '').replace(/((https?:\/\/|\/uploads\/)[^\s\n\r]+)/g, '<a href="$1" target="_blank" style="color:#2563eb;text-decoration:underline;font-weight:bold"><i class="fas fa-file-download"></i> View / Download Attachment ($1)</a>');

  // Build only the details provided by the customer
  const tripDetails = [];
  tripDetails.push(`<div><span style="color:#64748b">Enquiry Type:</span> <strong>${typeText}</strong></div>`);
  tripDetails.push(`<div><span style="color:#64748b">Destination / Package:</span> <strong style="color:#dc2626">${destOrPkg}</strong></div>`);
  
  if (e.start_date || e.end_date) {
    tripDetails.push(`<div><span style="color:#64748b">Travel Dates:</span> <strong>${e.start_date || 'Flexible'} ${e.end_date ? 'to ' + e.end_date : ''}</strong></div>`);
  }
  if (e.duration_days) {
    tripDetails.push(`<div><span style="color:#64748b">Duration:</span> <strong>${e.duration_days} Days</strong></div>`);
  }
  if (e.adults !== null && e.adults !== undefined && e.adults !== '') {
    tripDetails.push(`<div><span style="color:#64748b">Travelers:</span> <strong>${e.adults} Adults${e.children ? `, ${e.children} Children` : ''}</strong></div>`);
  }
  if (e.hotel_rating) {
    tripDetails.push(`<div><span style="color:#64748b">Hotel Preference:</span> <strong>${e.hotel_rating}</strong></div>`);
  }

  openModal(`Enquiry Details: ${e.name || 'Lead'}`, `
    <div style="font-size:14px;line-height:1.6">
      <!-- Customer Information Card -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:12px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <h4 style="font-size:16px;font-weight:700;color:#0f172a">${e.name || 'Anonymous Customer'}</h4>
            <p style="color:#64748b;font-size:12px;margin-top:2px">Submitted on ${e.created_at ? new Date(e.created_at).toLocaleString() : 'Recent'}</p>
          </div>
          <span class="badge ${e.status === 'New' ? 'red' : (e.status === 'Completed' ? 'green' : 'blue')}">${e.status || 'New'}</span>
        </div>
        <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
          <div><strong>📞 Phone:</strong> <a href="tel:${e.phone}" style="color:#2563eb;font-weight:600">${e.phone || 'N/A'}</a></div>
          <div><strong>✉️ Email:</strong> <a href="mailto:${e.email}" style="color:#2563eb">${e.email || 'Not provided'}</a></div>
        </div>
      </div>

      <!-- Trip & Package Specifications -->
      <div style="margin-bottom:16px;background:#fff;border:1px solid #f1f5f9;padding:14px;border-radius:10px">
        <h4 style="font-weight:700;margin-bottom:10px;color:#1e293b;border-bottom:1px solid #f1f5f9;padding-bottom:6px">Trip Information</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px">
          ${tripDetails.join('')}
        </div>
      </div>

      <!-- Places to Visit -->
      ${Array.isArray(e.places_to_visit) && e.places_to_visit.length ? `
      <div style="margin-bottom:16px">
        <h4 style="font-weight:700;margin-bottom:6px;color:#1e293b;font-size:13px">Selected Places / Activities:</h4>
        <ul style="padding-left:16px;list-style-type:none;font-size:13px">
          ${placesList}
        </ul>
      </div>` : ''}

      <!-- Special Notes -->
      ${e.notes ? `<div style="background:#fffbeb;border:1px solid #fef3c7;padding:12px 14px;border-radius:10px;margin-bottom:16px">
        <strong style="color:#92400e;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px">Customer Requests & Notes:</strong>
        <p style="color:#78350f;font-size:13px;white-space:pre-wrap">${e.notes}</p>
      </div>` : ''}
    </div>

    <div class="modal-actions">
      <div>
        <button type="button" class="btn-danger" onclick="deleteEnquiry(${enqId})"><i class="fas fa-trash-alt"></i> Delete Enquiry</button>
      </div>
      <div class="modal-actions-right">
        <button type="button" class="btn-cancel" onclick="closeModal()">Close</button>
        ${cleanPhone ? `<a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent('Hello ' + (e.name||'') + ', regarding your enquiry for ' + destOrPkg + ' on Mangalam Travel & Tours...')}" target="_blank" class="btn-primary" style="background:#25D366;text-decoration:none;display:inline-flex;align-items:center;gap:6px"><i class="fab fa-whatsapp"></i> Chat on WhatsApp</a>` : ''}
        <a href="tel:${e.phone}" class="btn-primary" style="background:#2563eb;text-decoration:none;display:inline-flex;align-items:center;gap:6px"><i class="fas fa-phone-alt"></i> Call Customer</a>
      </div>
    </div>
  `);
};

window.updateEnquiryStatus = async function(id, status) {
  const res = await api('PUT', `/enquiries/${id}`, { status });
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast('Status updated', 'success');
  loadEnquiries(); loadDashboard();
};

window.deleteEnquiry = async function(id) {
  if (!confirm('Are you sure you want to delete this trip enquiry?')) return;
  const res = await api('DELETE', `/enquiries/${id}`);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast('Enquiry deleted', 'success');
  closeModal();
  loadEnquiries(); loadDashboard();
};

document.getElementById('btn-add-enquiry')?.addEventListener('click', () => openEnquiryForm());

// ══════════════════════════════════════════════════════════════════════════════
// GOOGLE SEO & KEYWORDS
// ══════════════════════════════════════════════════════════════════════════════
let seoList = [];
let currentSeoSearch = '';

async function loadSeo() {
  if (!destinations || !destinations.length) {
    destinations = await api('GET', '/destinations') || [];
  }
  seoList = await api('GET', '/seo') || [];
  renderSeoTable();
}

function renderSeoTable() {
  const tbody = document.getElementById('tbody-seo');
  if (!tbody) return;

  let filtered = [...seoList];
  if (currentSeoSearch) {
    const q = currentSeoSearch.toLowerCase();
    filtered = filtered.filter(s =>
      (s.page_route || '').toLowerCase().includes(q) ||
      (s.page_name || '').toLowerCase().includes(q) ||
      (s.meta_title || '').toLowerCase().includes(q) ||
      (s.meta_description || '').toLowerCase().includes(q) ||
      (s.meta_keywords || '').toLowerCase().includes(q)
    );
  }

  if (!filtered.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6"><i class="fas fa-search" style="font-size:24px;color:#e5e7eb;display:block;margin-bottom:8px"></i>No SEO configurations found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const seoId = s.id || s.seo_id;
    const isDest = (s.page_route || '').includes('/packages.html?slug=') || (s.page_name || '').toLowerCase().startsWith('destination:');
    const typeBadge = isDest
      ? `<span class="badge blue" style="background:#eff6ff;color:#2563eb;font-size:10px;padding:2px 6px;margin-left:6px;font-weight:600"><i class="fas fa-map-marker-alt"></i> Destination</span>`
      : `<span class="badge gray" style="font-size:10px;padding:2px 6px;margin-left:6px"><i class="fas fa-file-alt"></i> Page</span>`;

    const keywordsList = s.meta_keywords
      ? s.meta_keywords.split(/,|;/).map(k => k.trim()).filter(Boolean).slice(0, 4)
      : [];

    const keywordsBadges = keywordsList.length
      ? keywordsList.map(k => `<span class="badge gray" style="font-size:11px;margin:2px 2px 2px 0;display:inline-block">#${k}</span>`).join('') + (s.meta_keywords.split(/,|;/).length > 4 ? ` <span style="font-size:10px;color:#9ca3af">+${s.meta_keywords.split(/,|;/).length - 4} more</span>` : '')
      : `<span style="color:#9ca3af;font-size:12px">No keywords added</span>`;

    return `
      <tr>
        <td>
          <code style="background:#f1f5f9;padding:3px 8px;border-radius:6px;font-size:12px;font-weight:700;color:#0f172a">${s.page_route}</code>
        </td>
        <td>
          <strong>${s.page_name || 'Page'}</strong> ${typeBadge}
        </td>
        <td style="max-width:320px">
          <div style="font-weight:700;font-size:13px;color:#1a0dab;line-height:1.3;margin-bottom:3px">${s.meta_title || 'No Meta Title'}</div>
          <div style="font-size:12px;color:#4d5156;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${s.meta_description || 'No Meta Description'}</div>
        </td>
        <td style="max-width:240px">
          <div>${keywordsBadges}</div>
        </td>
        <td>
          <span class="badge ${s.status === 'Active' ? 'green' : 'gray'}">${s.status || 'Active'}</span>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-sm btn-edit" onclick="editSeo(${seoId})"><i class="fas fa-pen"></i> Edit</button>
            <button class="btn-sm btn-delete" onclick="deleteSeo(${seoId})" title="Delete SEO"><i class="fas fa-trash"></i> Delete</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

window.searchSeo = function(val) {
  currentSeoSearch = (val || '').trim();
  renderSeoTable();
};

const COMMON_PAGE_ROUTES = [
  { route: '/', name: 'Home Page' },
  { route: '/holiday-package.html', name: 'Holiday Packages' },
  { route: '/packages.html', name: 'All Packages Listing' },
  { route: '/attraction.html', name: 'Attractions & Sightseeing' },
  { route: '/blog.html', name: 'Travel Journal & Blog' },
  { route: '/about.html', name: 'About Us' },
  { route: '/contact.html', name: 'Contact Us' },
  { route: '/global-visa-services.html', name: 'Global Visa Services' },
  { route: '/flight-tickets.html', name: 'Flight Tickets' },
  { route: '/travel-insurance.html', name: 'Travel Insurance' },
  { route: '/mice-tourism.html', name: 'MICE Tourism' },
  { route: '/cruises.html', name: 'Luxury Cruises' },
  { route: '/miscellaneous.html', name: 'Miscellaneous Services' },
  { route: '/customize-trip.html', name: 'Customize Your Trip' },
  { route: '/career.html', name: 'Career Opportunities' },
  { route: '/privacy-policy.html', name: 'Privacy Policy' },
  { route: '/terms-and-conditions.html', name: 'Terms & Conditions' }
];

async function openSeoForm(s = null) {
  // Ensure destinations list is populated and fresh from server
  if (!destinations || !destinations.length) {
    destinations = await api('GET', '/destinations') || [];
  }

  const seoId = s ? (s.id || s.seo_id) : null;

  // Build standard page options
  const staticOptions = COMMON_PAGE_ROUTES.map(r => `<option value="${r.route}">${r.name} (${r.route})</option>`).join('');

  // Build dynamic destination routes
  const destOptions = (destinations || []).map(d => {
    const slug = d.slug_url || (d.destination_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const route = `/packages.html?slug=${slug}`;
    const name = d.destination_name || 'Destination';
    return `<option value="${route}">Destination: ${name} (${route})</option>`;
  }).join('');

  const routesDatalist = staticOptions + destOptions;

  openModal(s ? `Edit SEO: ${s.page_name}` : 'Add Page SEO Configuration', `
    <!-- Google Search Live Preview Card -->
    <div style="background:#ffffff;border:1px solid #dfe1e5;border-radius:12px;padding:16px;margin-bottom:20px;box-shadow:0 1px 6px rgba(32,33,36,0.08)">
      <div style="font-size:11px;font-weight:700;color:#70757a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;display:flex;align-items:center;gap:6px">
        <i class="fab fa-google" style="color:#4285F4"></i> Google Search Snippet Live Preview
      </div>
      <div style="font-size:12px;color:#202124;display:flex;align-items:center;gap:4px;margin-bottom:4px">
        <span style="color:#202124">https://mangalamtravel.com</span>
        <span style="color:#70757a">› <span id="preview-seo-route">${(s?.page_route||'/').replace(/^\//,'') || 'home'}</span></span>
      </div>
      <div id="preview-seo-title" style="font-size:18px;line-height:1.3;color:#1a0dab;font-family:Arial,sans-serif;font-weight:400;margin-bottom:4px;cursor:pointer">
        ${s?.meta_title || 'Enter a Meta Title below to see Google preview'}
      </div>
      <div id="preview-seo-desc" style="font-size:13px;line-height:1.4;color:#4d5156;font-family:Arial,sans-serif">
        ${s?.meta_description || 'Enter a Meta Description below. Google typically displays between 140 to 160 characters in search results.'}
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <label style="margin:0">Page Route / URL Path *</label>
          <select id="seo-route-picker" onchange="selectSeoQuickRoute(this.value)" style="font-size:11px;padding:2px 8px;border-radius:6px;border:1px solid #cbd5e1;background:#f8fafc;color:#1e293b;max-width:240px;cursor:pointer">
            <option value="">⚡ Select Destination or Page...</option>
            <optgroup label="📍 All Destinations (${destinations.length})">
              ${(destinations || []).map(d => {
                const slug = d.slug_url || (d.destination_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const route = `/packages.html?slug=${slug}`;
                const isSelected = (s?.page_route === route) ? 'selected' : '';
                return `<option value="${route}" ${isSelected}>Destination: ${d.destination_name}</option>`;
              }).join('')}
            </optgroup>
            <optgroup label="📄 Standard Website Pages">
              ${COMMON_PAGE_ROUTES.map(r => {
                const isSelected = (s?.page_route === r.route) ? 'selected' : '';
                return `<option value="${r.route}" ${isSelected}>${r.name}</option>`;
              }).join('')}
            </optgroup>
          </select>
        </div>
        <input id="seo-route" list="seo-routes-list" value="${s?.page_route || '/'}" placeholder="e.g. / or /packages.html?slug=dubai" oninput="handleSeoRouteChange(this.value)">
        <datalist id="seo-routes-list">
          ${routesDatalist}
        </datalist>
        <span style="font-size:11px;color:#64748b;margin-top:4px;display:block">
          Select from the quick dropdown above, choose from destinations in the list, or type any URL path.
        </span>
      </div>
      <div class="form-group">
        <label>Page Name *</label>
        <input id="seo-page-name" value="${s?.page_name || ''}" placeholder="e.g. Destination: Dubai or Holiday Packages">
      </div>
    </div>

    <div class="form-group">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <label style="margin:0">Google Meta Title *</label>
        <span id="char-count-title" style="font-size:11px;color:#6b7280">${(s?.meta_title||'').length}/60 chars</span>
      </div>
      <input id="seo-title" value="${s?.meta_title || ''}" placeholder="e.g. Dubai Tour Packages | Best Travel Deals — Mangalam" oninput="updateSeoPreview()">
    </div>

    <div class="form-group">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <label style="margin:0">Google Meta Description *</label>
        <span id="char-count-desc" style="font-size:11px;color:#6b7280">${(s?.meta_description||'').length}/160 chars</span>
      </div>
      <textarea id="seo-desc" rows="3" placeholder="Brief summary for search engines (140-160 characters)..." oninput="updateSeoPreview()">${s?.meta_description || ''}</textarea>
    </div>

    <div class="form-group">
      <label>SEO Focus Keywords (Comma separated) *</label>
      <textarea id="seo-keywords" rows="2" placeholder="e.g. dubai tour packages, dubai holiday, dubai travel, best dubai deals">${s?.meta_keywords || ''}</textarea>
      <span style="font-size:11px;color:#9ca3af;margin-top:2px;display:block">Separate keywords with commas. Example: <code>dubai tours, cheap flights, visa processing</code></span>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Canonical URL (Optional)</label>
        <input id="seo-canonical" value="${s?.canonical_url || ''}" placeholder="e.g. https://mangalamtravel.com/packages.html?slug=dubai">
      </div>
      <div class="form-group">
        <label>Robots Indexing</label>
        <select id="seo-robots">
          <option value="index, follow" ${s?.robots === 'index, follow' || !s ? 'selected' : ''}>index, follow (Recommended)</option>
          <option value="noindex, follow" ${s?.robots === 'noindex, follow' ? 'selected' : ''}>noindex, follow</option>
          <option value="noindex, nofollow" ${s?.robots === 'noindex, nofollow' ? 'selected' : ''}>noindex, nofollow (Hidden)</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label>Social / OG Share Image</label>
      ${createImageUpload('seo-og', s?.og_image || '')}
    </div>

    <div class="form-group">
      <label>Status</label>
      <select id="seo-status">
        <option value="Active" ${s?.status === 'Active' || !s ? 'selected' : ''}>Active</option>
        <option value="Draft" ${s?.status === 'Draft' ? 'selected' : ''}>Draft</option>
      </select>
    </div>

    <div class="modal-actions">
      <div>
        ${seoId ? `<button type="button" class="btn-danger" onclick="deleteSeo(${seoId})"><i class="fas fa-trash-alt"></i> Delete SEO</button>` : ''}
      </div>
      <div class="modal-actions-right">
        <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn-primary" onclick="saveSeo(${seoId || 'null'})"><i class="fas fa-save"></i> ${s ? 'Update SEO' : 'Save SEO'}</button>
      </div>
    </div>
  `);
}

window.selectSeoQuickRoute = function(val) {
  if (!val) return;
  const routeInput = document.getElementById('seo-route');
  if (routeInput) {
    routeInput.value = val;
    handleSeoRouteChange(val);
  }
};

window.handleSeoRouteChange = function(routeVal) {
  updateSeoPreview();
  const route = (routeVal || '').trim();
  const pageNameInput = document.getElementById('seo-page-name');
  const titleInput = document.getElementById('seo-title');
  const descInput = document.getElementById('seo-desc');
  const keywordsInput = document.getElementById('seo-keywords');
  const canonicalInput = document.getElementById('seo-canonical');
  const ogInput = document.getElementById('img-url-seo-og');
  const previewOg = document.getElementById('preview-seo-og');

  if (route.includes('/packages.html?slug=')) {
    const slug = route.split('slug=')[1]?.split('&')[0];
    const dest = (destinations || []).find(d => {
      const dSlug = d.slug_url || (d.destination_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return dSlug.toLowerCase() === (slug || '').toLowerCase();
    });

    if (dest) {
      const destName = dest.destination_name || 'Destination';
      if (pageNameInput && (!pageNameInput.value || pageNameInput.value === 'Custom Page' || pageNameInput.value.startsWith('Destination:'))) {
        pageNameInput.value = `Destination: ${destName}`;
      }
      if (titleInput && (!titleInput.value || titleInput.value.includes('Holiday Packages — Best'))) {
        titleInput.value = `${destName} Tour Packages | Best Travel Deals — Mangalam Travel & Tours`;
      }
      if (descInput && !descInput.value) {
        const dDesc = dest.description ? dest.description.replace(/<[^>]*>?/gm, '').slice(0, 120) : '';
        descInput.value = dDesc 
          ? `Explore ${destName} holiday packages. ${dDesc} Book customized tours with Mangalam Travel.` 
          : `Explore top-rated ${destName} tour packages, holiday itineraries, attractions, and flight bookings with Mangalam Travel & Tours.`;
      }
      if (keywordsInput && !keywordsInput.value) {
        keywordsInput.value = `${destName.toLowerCase()} tour packages, ${destName.toLowerCase()} holidays, ${destName.toLowerCase()} trip, visit ${destName.toLowerCase()}, best ${destName.toLowerCase()} packages`;
      }
      if (canonicalInput && !canonicalInput.value) {
        canonicalInput.value = `https://mangalamtravel.com/packages.html?slug=${slug}`;
      }
      if (ogInput && !ogInput.value && (dest.card_image || dest.inner_image)) {
        const img = dest.card_image || dest.inner_image;
        ogInput.value = img;
        if (previewOg) {
          previewOg.style.display = 'inline-block';
          previewOg.innerHTML = `<img src="${img}" alt="OG Preview"><button type="button" class="btn-remove-img" onclick="removeImageUpload('seo-og')" title="Delete this image"><i class="fas fa-trash-alt"></i> Delete Image</button>`;
        }
      }
      updateSeoPreview();
    }
  } else {
    const page = COMMON_PAGE_ROUTES.find(p => p.route.toLowerCase() === route.toLowerCase());
    if (page && pageNameInput && (!pageNameInput.value || pageNameInput.value === 'Custom Page')) {
      pageNameInput.value = page.name;
    }
  }
};

window.updateSeoPreview = function() {
  const route = document.getElementById('seo-route')?.value || '/';
  const title = document.getElementById('seo-title')?.value || '';
  const desc = document.getElementById('seo-desc')?.value || '';

  const prevRoute = document.getElementById('preview-seo-route');
  const prevTitle = document.getElementById('preview-seo-title');
  const prevDesc = document.getElementById('preview-seo-desc');
  const countTitle = document.getElementById('char-count-title');
  const countDesc = document.getElementById('char-count-desc');

  if (prevRoute) prevRoute.textContent = route.replace(/^\//, '') || 'home';
  if (prevTitle) prevTitle.textContent = title || 'Enter a Meta Title below to see Google preview';
  if (prevDesc) prevDesc.textContent = desc || 'Enter a Meta Description below. Google typically displays between 140 to 160 characters in search results.';

  if (countTitle) {
    countTitle.textContent = `${title.length}/60 chars`;
    countTitle.style.color = title.length > 65 ? '#dc2626' : (title.length >= 40 ? '#16a34a' : '#6b7280');
  }
  if (countDesc) {
    countDesc.textContent = `${desc.length}/160 chars`;
    countDesc.style.color = desc.length > 165 ? '#dc2626' : (desc.length >= 120 ? '#16a34a' : '#6b7280');
  }
};

window.editSeo = async function(id) {
  const s = seoList.find(x => String(x.id || x.seo_id) === String(id));
  if (s) await openSeoForm(s);
};

window.saveSeo = async function(id) {
  const route = document.getElementById('seo-route').value.trim();
  const pageName = document.getElementById('seo-page-name').value.trim();
  const title = document.getElementById('seo-title').value.trim();
  const desc = document.getElementById('seo-desc').value.trim();
  const keywords = document.getElementById('seo-keywords').value.trim();
  const canonical = document.getElementById('seo-canonical').value.trim();
  const ogImg = document.getElementById('img-url-seo-og')?.value || '';
  const robots = document.getElementById('seo-robots').value;
  const status = document.getElementById('seo-status').value;

  if (!route || !title) {
    showToast('Page Route and Meta Title are required', 'error');
    return;
  }

  const body = {
    page_route: route,
    page_name: pageName || 'Custom Page',
    meta_title: title,
    meta_description: desc,
    meta_keywords: keywords,
    canonical_url: canonical,
    og_image: ogImg,
    robots,
    status
  };

  const res = id ? await api('PUT', `/seo/${id}`, body) : await api('POST', '/seo', body);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast(id ? 'SEO updated!' : 'SEO added!', 'success');
  closeModal(); loadSeo(); loadDashboard();
};

window.deleteSeo = async function(id) {
  if (!confirm('Are you sure you want to delete this SEO configuration?')) return;
  const res = await api('DELETE', `/seo/${id}`);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast('SEO configuration deleted', 'success');
  closeModal();
  loadSeo(); loadDashboard();
};

document.getElementById('btn-add-seo')?.addEventListener('click', () => openSeoForm());

// ── Gallery ──────────────────────────────────────────────────────────────────
let galleryList = [];
let currentGallerySearch = '';

async function loadGallery() {
  const data = await api('GET', '/gallery');
  galleryList = Array.isArray(data) ? data : (data?.data || data?.items || []);
  renderGalleryTable();
}

function renderGalleryTable() {
  const tbody = document.getElementById('tbody-gallery') || document.getElementById('tbl-gallery-body') || document.querySelector('.gallery-tbl-body');
  if (!tbody) return;

  let filtered = Array.isArray(galleryList) ? [...galleryList] : [];
  if (currentGallerySearch) {
    const q = currentGallerySearch.toLowerCase();
    filtered = filtered.filter(g =>
      (g.title || '').toLowerCase().includes(q) ||
      (g.caption || '').toLowerCase().includes(q)
    );
  }

  if (!filtered.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5" style="text-align:center;padding:32px;color:#9ca3af"><i class="fas fa-images" style="font-size:24px;color:#e5e7eb;display:block;margin-bottom:8px"></i>No gallery photos found. Click "Upload New Tour Photo" to add.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(g => {
    const id = g.id || g.gallery_id;
    return `
      <tr>
        <td>${imgCell(g.image)}</td>
        <td><strong style="color:#0f172a">${escapeHtml(g.title || 'Tour Moment')}</strong></td>
        <td><span style="color:#64748b;font-size:13px;max-width:260px;display:block;overflow:hidden;text-overflow:ellipsis">${escapeHtml(g.caption || '-')}</span></td>
        <td><span style="color:#94a3b8;font-size:12px">${g.created_at ? new Date(g.created_at).toLocaleDateString('en-IN') : '-'}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn-sm btn-edit" onclick="editGallery(${id})" title="Edit Photo"><i class="fas fa-pen"></i> Edit</button>
            <button class="btn-sm btn-delete" onclick="deleteGallery(${id})" title="Delete Photo"><i class="fas fa-trash"></i> Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.editGallery = function(id) {
  const g = galleryList.find(x => x.id === id || x.gallery_id === id);
  if (g) openGalleryForm(g);
};

function openGalleryForm(g = null) {
  const id = g ? (g.id || g.gallery_id) : null;
  openModal(g ? 'Edit Tour Photo' : 'Upload New Tour Photo', `
    <form id="form-gallery" onsubmit="saveGallery(event, ${id})">
      <div class="form-group">
        <label>Photo Title *</label>
        <input id="g-title" value="${escapeHtml(g?.title || '')}" placeholder="e.g. Kerala Backwaters Tour / Dubai Desert Safari" required>
      </div>
      <div class="form-group">
        <label>Photo Image *</label>
        ${createImageUpload('gallery-img', g?.image || '')}
      </div>
      <div class="form-group">
        <label>Caption / Short Description</label>
        <textarea id="g-caption" rows="2" placeholder="Brief memory notes about this tour moment...">${escapeHtml(g?.caption || '')}</textarea>
      </div>
      <div class="modal-actions">
        <div>
          ${id ? `<button type="button" class="btn-danger" onclick="deleteGallery(${id})"><i class="fas fa-trash-alt"></i> Delete Photo</button>` : ''}
        </div>
        <div class="modal-actions-right">
          <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn-primary">${g ? 'Update Photo' : 'Save Photo'}</button>
        </div>
      </div>
    </form>
  `);
}

window.openGalleryForm = openGalleryForm;

window.saveGallery = async function(e, id = null) {
  if (e) e.preventDefault();
  const titleEl = document.getElementById('g-title');
  const imageEl = document.getElementById('img-url-gallery-img');
  const captionEl = document.getElementById('g-caption');

  const title = titleEl ? titleEl.value.trim() : '';
  const image = imageEl ? imageEl.value.trim() : '';
  const caption = captionEl ? captionEl.value.trim() : '';

  if (!image) {
    showToast('Please select or upload a photo image', 'error');
    return;
  }

  const payload = { title: title || 'Tour Moment', image, caption };
  const targetId = (id && id !== 'null' && id !== 'undefined') ? id : null;
  const res = targetId
    ? await api('PUT', `/gallery/${targetId}`, payload)
    : await api('POST', '/gallery', payload);

  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast(targetId ? 'Photo updated successfully!' : 'Photo uploaded successfully to Gallery!', 'success');
  closeModal();
  await loadGallery();
  loadDashboard();
};

window.deleteGallery = async function(id) {
  if (!confirm('Are you sure you want to delete this photo from Gallery?')) return;
  const res = await api('DELETE', `/gallery/${id}`);
  if (res?.error) { showToast(res.error, 'error'); return; }
  showToast('Photo deleted from Gallery', 'success');
  closeModal();
  await loadGallery();
  loadDashboard();
};

document.getElementById('btn-add-gallery')?.addEventListener('click', () => openGalleryForm());
document.getElementById('search-gallery')?.addEventListener('input', (e) => {
  currentGallerySearch = (e.target.value || '').trim();
  renderGalleryTable();
});

// ── Section loaders map ───────────────────────────────────────────────────────
const loaders = {
  dashboard:    loadDashboard,
  destinations: loadDestinations,
  packages:     () => { loadDestinations(); loadPackages(); },
  collections:  loadCollections,
  attractions:  loadAttractions,
  blogs:        loadBlogs,
  seo:          loadSeo,
  testimonials: loadTestimonials,
  partners:     loadPartners,
  posters:      loadPosters,
  gallery:      loadGallery,
  enquiries:    loadEnquiries,
  settings:     () => {},
};

// ── Initial load ──────────────────────────────────────────────────────────────
navigateTo('dashboard');
