/**
 * packages.js — Packages listing & Destination details page with in-page Attraction tabs
 */
document.addEventListener('DOMContentLoaded', async () => {
  const [dests, allPkgs, allAttractions] = await Promise.all([
    MT.apiGet('/api/destinations'),
    MT.apiGet('/api/packages'),
    MT.apiGet('/api/attractions')
  ]);

  const slugParam   = MT.qParam('slug');
  const typeParam   = (MT.qParam('type') || 'package').toLowerCase();
  const destIdParam = MT.qParam('destination_id');

  let activeDest = null;
  if (slugParam && dests && dests.length) {
    const slugClean = slugParam.toLowerCase().replace(/[-_]/g, ' ');
    activeDest = dests.find(d => {
      const dSlug = (d.slug_url || d.slug || '').toLowerCase();
      const dName = (d.destination_name || d.name || '').toLowerCase();
      return dSlug === slugParam.toLowerCase() || dName === slugClean || dName.includes(slugClean);
    });
  } else if (destIdParam && dests && dests.length) {
    activeDest = dests.find(d => String(d.destination_id || d.id) === String(destIdParam));
  }

  // Update Hero Section
  const heroImg = document.getElementById('dest-hero-img');
  const heroTitle = document.getElementById('dest-hero-title');
  const heroDesc = document.getElementById('dest-hero-desc');
  const destSpanPkg = document.getElementById('dest-span-name');
  const destSpanAttr = document.getElementById('dest-span-attraction-name');

  const destName = activeDest ? (activeDest.destination_name || activeDest.name || 'Destination') : '';
  const activeDestId = activeDest ? (activeDest.destination_id || activeDest.id) : (destIdParam || '');
  const activeDestSlug = activeDest ? (activeDest.slug_url || activeDest.slug || slugParam || '') : (slugParam || '');

  if (activeDest) {
    const rawInnerImg = activeDest.inner_image || activeDest.Inner_image || activeDest.card_image || '';
    const resolvedImg = MT.resolveImg(rawInnerImg) || './assets/images/bg-img.webp';

    if (heroImg) heroImg.src = resolvedImg;
    if (heroTitle) heroTitle.textContent = destName;
    if (heroDesc) heroDesc.textContent = activeDest.discription || activeDest.description || '';
    if (destSpanPkg) destSpanPkg.textContent = destName;
    if (destSpanAttr) destSpanAttr.textContent = destName;

    // Refresh Dynamic SEO with the resolved destination slug
    if (activeDestSlug && typeof window.loadDynamicSeo === 'function') {
      window.loadDynamicSeo(activeDestSlug);
    }
  } else {
    if (heroImg) heroImg.src = './assets/images/bg-img.webp';
    if (heroTitle) heroTitle.textContent = 'Holiday Packages & Experiences';
    if (heroDesc) heroDesc.textContent = 'Discover customized tour packages and memorable attractions for an unforgettable journey.';
    if (destSpanPkg) destSpanPkg.textContent = 'All Destinations';
    if (destSpanAttr) destSpanAttr.textContent = 'All Destinations';
  }

  // Build destination filter buttons if filter bar exists
  const bar = document.getElementById('dest-filter-bar');
  if (bar && dests && dests.length) {
    dests.forEach(d => {
      const btn = document.createElement('button');
      btn.className = 'dest-filter-btn px-4 py-2 rounded-full text-sm font-dm-sans border border-gray-300 hover:border-gray-800 hover:text-gray-800 transition-colors text-gray-600';
      btn.dataset.slug = d.slug_url || d.slug || '';
      btn.dataset.destId = d.destination_id || d.id || '';
      btn.dataset.destName = d.destination_name || d.name || '';
      btn.textContent = d.destination_name || d.name || '';
      bar.appendChild(btn);
    });
  }

  if (activeDestId && bar) {
    const btn = bar.querySelector(`[data-dest-id="${activeDestId}"]`);
    if (btn) setActive(btn);
  }

  // Navigation Tab Elements
  const tabPackages = document.getElementById('tab-packages');
  const tabActivity = document.getElementById('tab-activity');
  const indicatorPackages = document.getElementById('indicator-packages');
  const indicatorActivity = document.getElementById('indicator-activity');
  const sectionPackages = document.getElementById('section-packages');
  const sectionActivity = document.getElementById('section-activity');

  let currentTab = 'packages';

  function switchTab(targetTab) {
    currentTab = targetTab;
    if (targetTab === 'attractions' || targetTab === 'activity' || targetTab === 'attraction') {
      // Show Attractions, Hide Packages
      if (sectionActivity) {
        sectionActivity.classList.remove('hidden');
        sectionActivity.style.display = 'block';
      }
      if (sectionPackages) {
        sectionPackages.classList.add('hidden');
        sectionPackages.style.display = 'none';
      }

      // Tab Styling
      if (tabActivity) {
        tabActivity.classList.add('text-gray-900');
        tabActivity.classList.remove('text-gray-500');
      }
      if (tabPackages) {
        tabPackages.classList.remove('text-gray-900');
        tabPackages.classList.add('text-gray-500');
      }
      if (indicatorActivity) indicatorActivity.classList.remove('hidden');
      if (indicatorPackages) indicatorPackages.classList.add('hidden');

      // Update URL silently without full page reload
      const url = new URL(window.location.href);
      url.searchParams.set('type', 'attraction');
      window.history.replaceState({}, '', url.toString());

    } else {
      // Show Packages, Hide Attractions
      if (sectionPackages) {
        sectionPackages.classList.remove('hidden');
        sectionPackages.style.display = 'block';
      }
      if (sectionActivity) {
        sectionActivity.classList.add('hidden');
        sectionActivity.style.display = 'none';
      }

      // Tab Styling
      if (tabPackages) {
        tabPackages.classList.add('text-gray-900');
        tabPackages.classList.remove('text-gray-500');
      }
      if (tabActivity) {
        tabActivity.classList.remove('text-gray-900');
        tabActivity.classList.add('text-gray-500');
      }
      if (indicatorPackages) indicatorPackages.classList.remove('hidden');
      if (indicatorActivity) indicatorActivity.classList.add('hidden');

      // Update URL silently without full page reload
      const url = new URL(window.location.href);
      url.searchParams.set('type', 'package');
      window.history.replaceState({}, '', url.toString());
    }
  }

  // Tab Click Events
  tabPackages?.addEventListener('click', e => {
    e.preventDefault();
    switchTab('packages');
  });

  tabActivity?.addEventListener('click', e => {
    e.preventDefault();
    switchTab('attractions');
  });

  // Render initial content
  renderPackages(allPkgs, activeDestId);
  renderAttractions(allAttractions, activeDestId, destName, activeDestSlug);

  // Set initial active tab based on query param
  if (typeParam === 'attraction' || typeParam === 'attractions' || typeParam === 'activity' || typeParam === 'activities') {
    switchTab('attractions');
  } else {
    switchTab('packages');
  }

  // Filter click handler (if filter buttons are used)
  bar?.addEventListener('click', e => {
    const btn = e.target.closest('.dest-filter-btn');
    if (!btn) return;
    setActive(btn);
    const dId = btn.dataset.destId;
    const dName = btn.dataset.destName;
    const dSlug = btn.dataset.slug;

    if (destSpanPkg) destSpanPkg.textContent = dName;
    if (destSpanAttr) destSpanAttr.textContent = dName;

    renderPackages(allPkgs, dId);
    renderAttractions(allAttractions, dId, dName, dSlug);
  });

  function setActive(btn) {
    bar?.querySelectorAll('.dest-filter-btn').forEach(b => {
      b.className = 'dest-filter-btn px-4 py-2 rounded-full text-sm font-dm-sans border border-gray-300 hover:border-gray-800 hover:text-gray-800 transition-colors text-gray-600';
    });
    btn.className = 'dest-filter-btn px-4 py-2 rounded-full text-sm font-dm-sans border-2 border-gray-800 bg-gray-800 text-white transition-colors';
  }

  function renderPackages(pkgs, destId) {
    const grid = document.getElementById('packages-grid');
    if (!grid) return;
    if (!pkgs || !pkgs.length) {
      grid.innerHTML = '<div class="col-span-full text-center py-20 bg-gray-50 rounded-3xl p-8 border border-gray-100"><p class="text-gray-400 font-dm-sans">No packages available.</p></div>';
      return;
    }
    let list = pkgs;
    if (destId) list = pkgs.filter(p => String(p.destination_id) === String(destId));
    if (!list.length) {
      grid.innerHTML = '<div class="col-span-full text-center py-20 bg-gray-50 rounded-3xl p-8 border border-gray-100"><i class="fa-solid fa-suitcase text-4xl text-gray-300 mb-4 block"></i><h3 class="text-xl font-bold font-[Quicksand] text-gray-800 mb-2">No Packages Available</h3><p class="text-gray-500 font-dm-sans max-w-md mx-auto">No packages listed for this destination yet.</p></div>';
      return;
    }
    grid.innerHTML = list.map(p => R.packageCard(p)).join('');
  }

  function renderAttractions(attractions, destId, dName, dSlug) {
    const grid = document.getElementById('activities-grid') || document.getElementById('attractions-grid');
    if (!grid) return;
    if (!attractions || !attractions.length) {
      grid.innerHTML = '<div class="col-span-full text-center py-20 bg-gray-50 rounded-3xl p-8 border border-gray-100"><p class="text-gray-400 font-dm-sans">No attractions available.</p></div>';
      return;
    }

    let list = attractions;
    if (destId || dName || dSlug) {
      const cleanName = (dName || '').toLowerCase().trim();
      const cleanSlug = (dSlug || '').toLowerCase().trim();
      list = attractions.filter(a => {
        const aDestId = String(a.destination_id || '');
        const aDestName = (a.destination_name || '').toLowerCase();
        const aSlug = (a.slug_url || a.slug || '').toLowerCase();

        if (destId && aDestId && aDestId === String(destId)) return true;
        if (cleanName && (aDestName.includes(cleanName) || cleanName.includes(aDestName))) return true;
        if (cleanSlug && (aSlug.includes(cleanSlug) || aDestName.includes(cleanSlug))) return true;
        return false;
      });
    }

    if (!list.length) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-20 bg-gray-50 rounded-3xl p-8 border border-gray-100">
          <i class="fa-solid fa-camera text-4xl text-gray-300 mb-4 block"></i>
          <h3 class="text-xl font-bold font-[Quicksand] text-gray-800 mb-2">No Attractions Available</h3>
          <p class="text-gray-500 font-dm-sans max-w-md mx-auto">No attractions listed for this destination yet. Check back soon!</p>
        </div>`;
      return;
    }

    grid.innerHTML = list.map(a => R.attractionCard(a)).join('');
  }
});
