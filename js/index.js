/**
 * index.js — Homepage data loader for mangalamtravel.com static HTML
 */

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadPosters(),
    loadDestinations(),
    loadCollections(),
    loadTestimonials(),
    loadPartners(),
    loadBlogs()
  ]);
  initCarousels();
});

async function loadCollections() {
  const container = document.getElementById('collections-container');
  if (!container) return;

  const collections = await MT.apiGet('/api/collections?active=true');
  if (!collections || !collections.length) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  const validCollections = collections.filter(c => Array.isArray(c.packages) && c.packages.length > 0);
  if (!validCollections.length) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = '';
  container.innerHTML = validCollections.map((c, idx) => R.collectionSection(c, idx)).join('');
}

async function loadPosters() {
  if (typeof loadHomePosters === 'function') {
    await loadHomePosters();
  } else if (window.MT && typeof window.MT.loadHomePosters === 'function') {
    await window.MT.loadHomePosters();
  }
}

async function loadDestinations() {
  const gridEl = document.getElementById('destinations-grid');
  const destList = document.querySelector('#destinationCarousel .splide__list');
  const dests = await MT.apiGet('/api/destinations');

  if (!dests || !dests.length) {
    if (destList) {
      const emptySlide = `
        <li class="splide__slide">
            <div class="relative rounded-[32px] overflow-hidden h-[480px] lg:h-[540px]">
                <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                <div class="absolute bottom-0 left-0 right-0 p-6 lg:p-8 text-white text-left">
                    <h3 class="text-3xl font-bold mb-2 font-[Quicksand] tracking-wide text-white">No Destinations Available</h3>
                    <p class="text-sm md:text-base leading-relaxed font-dm-sans line-clamp-2 text-white/90">Please check back later for exciting destinations.</p>
                </div>
            </div>
        </li>`;
      destList.innerHTML = emptySlide.repeat(4);
    } else if (gridEl) {
      gridEl.innerHTML = '<p class="col-span-full text-center text-gray-400 py-16">No destinations available at the moment.</p>';
    }
    return;
  }

  // Cards carousel / grid
  if (destList) {
    destList.innerHTML = dests.map(d => `<li class="splide__slide">${R.destinationCard(d)}</li>`).join('');
  } else if (gridEl) {
    gridEl.innerHTML = dests.map(d => R.destinationCard(d)).join('');
  }

  // Populate hero search dropdowns with clean deduplicated destinations
  const seen = new Set();
  const uniqueDests = [];
  dests.forEach(d => {
    const name = (d.destination_name || d.name || d.title || '').trim();
    const slug = (d.slug_url || d.slug || '').trim();
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      uniqueDests.push({ name, slug });
    }
  });

  const dropdownHTML = uniqueDests.map(d => 
    `<div class="px-4 py-2.5 hover:bg-gray-100 cursor-pointer font-dm-sans text-sm text-gray-700 font-medium destination-menu-item transition-colors" data-value="${d.name}" data-slug="${d.slug}">${d.name}</div>`
  ).join('');

  document.querySelectorAll('#destinationMenu .destination-menu-scroll, #destinationMenu2 .destination-menu-scroll').forEach(menu => {
    const anyDestItem = `<div class="px-4 py-2.5 hover:bg-gray-100 cursor-pointer font-dm-sans text-sm text-gray-700 font-medium destination-menu-item transition-colors" data-value="Any Destination" data-slug="">Any Destination</div>`;
    menu.innerHTML = anyDestItem + dropdownHTML;
  });
}


async function loadTestimonials() {
  const grid = document.getElementById('testimonials-grid');
  if (!grid) return;
  const testimonials = await MT.apiGet('/api/testimonials');
  if (!testimonials || !testimonials.length) return;
  grid.innerHTML = testimonials.slice(0, 6).map(t => R.testimonialCard(t)).join('');
}

async function loadPartners() {
  const grid = document.getElementById('partners-grid');
  if (!grid) return;
  const partners = await MT.apiGet('/api/partners');
  if (!partners || !partners.length) return;
  grid.innerHTML = partners.map(p => R.partnerLogo(p)).join('');
}

async function loadBlogs() {
  const section = document.getElementById('home-blog-section');
  const carousel = document.getElementById('blogCarousel');
  const list = document.querySelector('#blogCarousel .splide__list');
  const viewAllBtn = document.getElementById('view-all-blogs-btn');

  const blogs = await MT.apiGet('/api/blogs');
  if (!blogs || !blogs.length) {
    if (section) section.style.display = '';
    if (viewAllBtn) viewAllBtn.style.display = 'none';
    if (carousel) {
      carousel.outerHTML = `
        <div class="flex flex-col items-center justify-center py-8 text-center" data-aos="fade-up">
            <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <h3 class="text-xl md:text-2xl font-bold text-slate-800 font-[Quicksand] mb-2">No Blog Posts Yet</h3>
            <p class="text-gray-500 font-dm-sans text-sm md:text-base">Check back soon for exciting travel stories and tips!</p>
        </div>
      `;
    }
    return;
  }
  if (!list) return;
  if (section) section.style.display = '';
  if (viewAllBtn) viewAllBtn.style.display = '';
  list.innerHTML = blogs.slice(0, 6).map((b, i) => R.blogCard(b, i)).join('');
}

function initCarousels() {
  if (window.Splide) {
    const destEl = document.getElementById('destinationCarousel');
    if (destEl) {
      const cnt = destEl.querySelectorAll('.splide__slide').length;
      if (cnt > 0) {
        new Splide('#destinationCarousel', {
          type: cnt > 1 ? 'loop' : 'slide',
          perPage: 4,
          gap: '1.5rem',
          arrows: true,
          pagination: false,
          drag: true,
          keyboard: true,
          autoplay: true,
          interval: 2500,
          pauseOnHover: true,
          pauseOnFocus: true,
          breakpoints: {
            1199: { perPage: 4, arrows: true },
            991: { perPage: 3, arrows: true },
            767: { perPage: 2, arrows: false },
            575: { perPage: 1, arrows: false }
          }
        }).mount();
      }
    }


    const blogEl = document.getElementById('blogCarousel');
    if (blogEl) {
      const cnt = blogEl.querySelectorAll('.splide__slide').length;
      if (cnt > 0) {
        new Splide('#blogCarousel', {
          type: cnt > 3 ? 'loop' : 'slide',
          perPage: Math.min(3, Math.max(1, cnt)),
          gap: '1.5rem',
          arrows: cnt > 1,
          breakpoints: { 1024: { perPage: Math.min(2, Math.max(1, cnt)) }, 640: { perPage: 1 } }
        }).mount();
      }
    }
  }
  if (window.AOS) AOS.refresh();
}
