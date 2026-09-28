const express = require('express');
const store   = require('../db/store');
const { verifyToken } = require('./auth');
const router  = express.Router();

const map = s => ({
  id:               s.id,
  page_route:       s.page_route || '/',
  page_name:        s.page_name || 'Home Page',
  meta_title:       s.meta_title || '',
  meta_description: s.meta_description || '',
  meta_keywords:    s.meta_keywords || '',
  canonical_url:    s.canonical_url || '',
  og_image:         s.og_image || '',
  robots:           s.robots || 'index, follow',
  status:           s.status || 'Active',
  created_at:       s.created_at || new Date().toISOString()
});

// Auto-sync destinations to SEO table if any destination doesn't have an SEO entry yet
async function syncDestinationsToSeo() {
  try {
    const dests = await store.getAll('destinations');
    if (!dests || !dests.length) return;
    const existingSeo = await store.getAll('seo');
    const existingRoutes = new Set(existingSeo.map(s => (s.page_route || '').toLowerCase().trim()));

    for (const d of dests) {
      const slug = (d.slug_url || '').trim();
      if (!slug) continue;
      const expectedRoute = `/packages.html?slug=${slug}`.toLowerCase();
      if (!existingRoutes.has(expectedRoute)) {
        const destName = d.destination_name || 'Destination';
        await store.insert('seo', {
          page_route: `/packages.html?slug=${slug}`,
          page_name: `Destination: ${destName}`,
          meta_title: `${destName} Tour Packages | Best Travel Deals — Mangalam Travel & Tours`,
          meta_description: `Explore top-rated ${destName} tour packages, holiday itineraries, attractions, and flight bookings with Mangalam Travel & Tours.`,
          meta_keywords: `${destName} tour packages, ${destName} holidays, ${destName} trip, visit ${destName}, ${destName} tourism`,
          canonical_url: `https://mangalamtravel.com/packages.html?slug=${slug}`,
          og_image: d.card_image || d.inner_image || '',
          robots: 'index, follow',
          status: 'Active'
        });
        existingRoutes.add(expectedRoute);
      }
    }
  } catch (err) {
    console.warn('[SEO] syncDestinationsToSeo warning:', err.message);
  }
}

// GET all SEO configs (Admin)
router.get('/', async (req, res) => {
  try {
    await syncDestinationsToSeo();
    const all = await store.getAll('seo');
    res.json(all.map(map));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch SEO configs' });
  }
});

// GET SEO for specific page path (Frontend dynamic meta injection)
router.get('/match', async (req, res) => {
  try {
    const rawRoute = (req.query.route || req.query.path || '/').trim();
    const route = rawRoute.toLowerCase();
    const normalizedRoute = route.startsWith('/') ? route : `/${route}`;

    const all = (await store.getAll('seo')).map(map);
    
    // 1. Exact match (case-insensitive)
    let matched = all.find(s => s.page_route.toLowerCase() === normalizedRoute);

    // 2. Query param matching (e.g. /packages.html?slug=dubai or /packages.html?slug=dubai&type=package)
    if (!matched && normalizedRoute.includes('?')) {
      const [pathPart, queryPart] = normalizedRoute.split('?');
      const qParams = new URLSearchParams(queryPart);
      const slug = qParams.get('slug');
      if (slug) {
        matched = all.find(s => {
          const sRoute = s.page_route.toLowerCase();
          return sRoute === `${pathPart}?slug=${slug.toLowerCase()}` || sRoute.includes(`slug=${slug.toLowerCase()}`);
        });
      }
    }

    // 3. Match root
    if (!matched && (normalizedRoute === '' || normalizedRoute === '/' || normalizedRoute === '/index.html' || normalizedRoute === '/index.php')) {
      matched = all.find(s => s.page_route.toLowerCase() === '/' || s.page_route.toLowerCase() === '/index.html');
    }

    // 4. Base html extension match
    if (!matched) {
      const base = normalizedRoute.split('?')[0].replace(/\.html$/i, '');
      matched = all.find(s => s.page_route.split('?')[0].replace(/\.html$/i, '').toLowerCase() === base);
    }

    res.json(matched || {});
  } catch (e) {
    res.status(500).json({ error: 'Failed to match SEO config' });
  }
});

// GET single SEO entry by ID
router.get('/:id', async (req, res) => {
  try {
    const item = await store.getById('seo', req.params.id);
    if (!item) return res.status(404).json({ error: 'SEO record not found' });
    res.json(map(item));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch SEO config' });
  }
});

const fs = require('fs');
const path = require('path');

function syncSeoToStaticHtml(entry) {
  if (!entry || !entry.page_route) return;
  // Dynamic query-param routes (like /packages.html?slug=...) are handled dynamically by seo.js
  if (entry.page_route.includes('?')) return;
  let filename = entry.page_route === '/' ? 'index.html' : entry.page_route.replace(/^\//, '');
  if (!filename.endsWith('.html')) filename += '.html';

  const pathsToCheck = [
    path.join(__dirname, '../../', filename),
    path.join(__dirname, '../public', filename),
    path.join(__dirname, '../../public', filename)
  ];

  for (const filePath of pathsToCheck) {
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');

        // Update or insert <title>
        if (entry.meta_title) {
          if (/<title>[\s\S]*?<\/title>/i.test(content)) {
            content = content.replace(/<title>[\s\S]*?<\/title>/i, `<title>${entry.meta_title}</title>`);
          }
          if (/<meta\s+name="title"\s+content="[^"]*"/i.test(content)) {
            content = content.replace(/<meta\s+name="title"\s+content="[^"]*"/i, `<meta name="title" content="${entry.meta_title}"`);
          }
          if (/<meta\s+property="og:title"\s+content="[^"]*"/i.test(content)) {
            content = content.replace(/<meta\s+property="og:title"\s+content="[^"]*"/i, `<meta property="og:title" content="${entry.meta_title}"`);
          }
          if (/<meta\s+name="twitter:title"\s+content="[^"]*"/i.test(content)) {
            content = content.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"/i, `<meta name="twitter:title" content="${entry.meta_title}"`);
          }
        }

        // Update or insert <meta name="description">
        if (entry.meta_description) {
          if (/<meta\s+name="description"\s+content="[^"]*"/i.test(content)) {
            content = content.replace(/<meta\s+name="description"\s+content="[^"]*"/i, `<meta name="description" content="${entry.meta_description}"`);
          }
          if (/<meta\s+property="og:description"\s+content="[^"]*"/i.test(content)) {
            content = content.replace(/<meta\s+property="og:description"\s+content="[^"]*"/i, `<meta property="og:description" content="${entry.meta_description}"`);
          }
          if (/<meta\s+name="twitter:description"\s+content="[^"]*"/i.test(content)) {
            content = content.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"/i, `<meta name="twitter:description" content="${entry.meta_description}"`);
          }
        }

        // Update or insert <meta name="keywords">
        if (entry.meta_keywords) {
          if (/<meta\s+name="keywords"\s+content="[^"]*"/i.test(content)) {
            content = content.replace(/<meta\s+name="keywords"\s+content="[^"]*"/i, `<meta name="keywords" content="${entry.meta_keywords}"`);
          }
        }

        // Update or insert <link rel="canonical">
        if (entry.canonical_url) {
          if (/<link\s+rel="canonical"\s+href="[^"]*"/i.test(content)) {
            content = content.replace(/<link\s+rel="canonical"\s+href="[^"]*"/i, `<link rel="canonical" href="${entry.canonical_url}"`);
          } else if (/<link\s+href="[^"]*"\s+rel="canonical"/i.test(content)) {
            content = content.replace(/<link\s+href="[^"]*"\s+rel="canonical"/i, `<link rel="canonical" href="${entry.canonical_url}"`);
          }
          if (/<meta\s+property="og:url"\s+content="[^"]*"/i.test(content)) {
            content = content.replace(/<meta\s+property="og:url"\s+content="[^"]*"/i, `<meta property="og:url" content="${entry.canonical_url}"`);
          }
          if (/<meta\s+name="twitter:url"\s+content="[^"]*"/i.test(content)) {
            content = content.replace(/<meta\s+name="twitter:url"\s+content="[^"]*"/i, `<meta name="twitter:url" content="${entry.canonical_url}"`);
          }
        }

        // Update or insert <meta name="robots">
        if (entry.robots) {
          if (/<meta\s+name="robots"\s+content="[^"]*"/i.test(content)) {
            content = content.replace(/<meta\s+name="robots"\s+content="[^"]*"/i, `<meta name="robots" content="${entry.robots}"`);
          }
        }

        fs.writeFileSync(filePath, content, 'utf8');
      } catch (err) {
        console.warn('[SEO Sync] Error updating static HTML:', filePath, err);
      }
    }
  }
}

// POST create or upsert SEO entry (Admin)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { page_route, page_name, meta_title, meta_description, meta_keywords, canonical_url, og_image, robots, status } = req.body;
    if (!page_route || !meta_title) {
      return res.status(400).json({ error: 'Page Route and Meta Title are required.' });
    }

    const cleanRoute = page_route.startsWith('/') ? page_route.trim() : `/${page_route.trim()}`;
    
    // Check if route already exists in SEO table
    let existing = null;
    try {
      existing = await store.getOne('seo', 'WHERE LOWER(page_route) = ?', [cleanRoute.toLowerCase()]);
    } catch (_) {}

    let doc;
    if (existing && existing.id) {
      doc = await store.update('seo', existing.id, {
        page_route: cleanRoute,
        page_name: page_name || existing.page_name || 'Custom Page',
        meta_title: meta_title.trim(),
        meta_description: meta_description?.trim() || '',
        meta_keywords: meta_keywords?.trim() || '',
        canonical_url: canonical_url?.trim() || '',
        og_image: og_image?.trim() || '',
        robots: robots || 'index, follow',
        status: status || 'Active'
      });
    } else {
      doc = await store.insert('seo', {
        page_route: cleanRoute,
        page_name: page_name || 'Custom Page',
        meta_title: meta_title.trim(),
        meta_description: meta_description?.trim() || '',
        meta_keywords: meta_keywords?.trim() || '',
        canonical_url: canonical_url?.trim() || '',
        og_image: og_image?.trim() || '',
        robots: robots || 'index, follow',
        status: status || 'Active'
      });
    }

    const mapped = map(doc);
    try { syncSeoToStaticHtml(mapped); } catch (e) { console.warn('[SEO] sync error:', e); }

    res.status(201).json({ success: true, message: existing ? 'SEO configuration updated!' : 'SEO configuration added!', seo: mapped });
  } catch (e) {
    console.error('[SEO Save Error]:', e);
    res.status(500).json({ error: e.message || 'Failed to save SEO config' });
  }
});

// PUT update SEO entry (Admin)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { page_route, page_name, meta_title, meta_description, meta_keywords, canonical_url, og_image, robots, status } = req.body;

    const updates = {};
    if (page_route !== undefined) updates.page_route = page_route.startsWith('/') ? page_route.trim() : `/${page_route.trim()}`;
    if (page_name !== undefined) updates.page_name = page_name.trim();
    if (meta_title !== undefined) updates.meta_title = meta_title.trim();
    if (meta_description !== undefined) updates.meta_description = meta_description.trim();
    if (meta_keywords !== undefined) updates.meta_keywords = meta_keywords.trim();
    if (canonical_url !== undefined) updates.canonical_url = canonical_url.trim();
    if (og_image !== undefined) updates.og_image = og_image.trim();
    if (robots !== undefined) updates.robots = robots.trim();
    if (status !== undefined) updates.status = status;

    const doc = await store.update('seo', req.params.id, updates);
    if (!doc) return res.status(404).json({ error: 'SEO record not found' });

    const mapped = map(doc);
    try { syncSeoToStaticHtml(mapped); } catch (e) { console.warn('[SEO] sync error:', e); }

    res.json({ success: true, message: 'SEO configuration updated!', seo: mapped });
  } catch (e) {
    console.error('[SEO Update Error]:', e);
    res.status(500).json({ error: e.message || 'Failed to update SEO config' });
  }
});

// DELETE SEO entry (Admin)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await store.remove('seo', req.params.id);
    res.json({ success: true, message: 'SEO record deleted!' });
  } catch (e) {
    console.error('[SEO Delete Error]:', e);
    res.status(500).json({ error: 'Failed to delete SEO config' });
  }
});

module.exports = router;
