const express = require('express');
const store   = require('../db/store');
const { verifyToken } = require('./auth');
const router  = express.Router();
const slugify = t => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const map = d => ({
  destination_id:   d.id,
  destination_name: d.destination_name,
  footer_title:     d.footer_title || '',
  slug_url:         d.slug_url,
  card_image:       d.card_image || '',
  inner_image:      d.inner_image || '',
  description:      d.description || '',
  places_to_visit:  Array.isArray(d.places_to_visit) ? d.places_to_visit : (typeof d.places_to_visit === 'string' ? d.places_to_visit.split('\n').map(s=>s.trim()).filter(Boolean) : []),
  created_at:       d.created_at
});

router.get('/', async (req, res) => {
  try {
    const items = await store.getAll('destinations');
    res.json(items.map(map));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch destinations' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const isNum = !isNaN(Number(req.params.id));
    const d = isNum
      ? await store.getById('destinations', req.params.id)
      : await store.getOne('destinations', 'WHERE slug_url = ?', [req.params.id]);
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.json(map(d));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch destination' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { destination_name, footer_title, card_image, inner_image, description, places_to_visit } = req.body;
    if (!destination_name) return res.status(400).json({ error: 'destination_name is required' });
    const slug = slugify(destination_name);
    const doc = await store.insert('destinations', { 
      destination_name, 
      footer_title: footer_title || '',
      slug_url: slug, 
      card_image: card_image||'', 
      inner_image: inner_image||'', 
      description: description||'',
      places_to_visit: Array.isArray(places_to_visit) ? places_to_visit : (typeof places_to_visit === 'string' ? places_to_visit.split('\n').map(s=>s.trim()).filter(Boolean) : [])
    });

    // Auto-create SEO configuration for this destination so it immediately reaches SEO Pages
    try {
      const destRoute = `/packages.html?slug=${slug}`;
      const existingSeo = await store.getOne('seo', 'WHERE LOWER(page_route) = ?', [destRoute.toLowerCase()]);
      if (!existingSeo) {
        await store.insert('seo', {
          page_route: destRoute,
          page_name: `Destination: ${destination_name}`,
          meta_title: `${destination_name} Tour Packages | Best Travel Deals — Mangalam Travel & Tours`,
          meta_description: `Explore top-rated ${destination_name} tour packages, holiday itineraries, attractions, and flight bookings with Mangalam Travel & Tours.`,
          meta_keywords: `${destination_name} tour packages, ${destination_name} holidays, ${destination_name} trip, visit ${destination_name}, ${destination_name} tourism`,
          canonical_url: `https://mangalamtravel.com/packages.html?slug=${slug}`,
          og_image: card_image || inner_image || '',
          robots: 'index, follow',
          status: 'Active'
        });
      }
    } catch (seoErr) {
      console.warn('[Destinations -> SEO Sync Error]:', seoErr.message);
    }

    res.status(201).json(map(doc));
  } catch (e) {
    res.status(500).json({ error: 'Failed to create destination' });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { destination_name, footer_title, card_image, inner_image, description, places_to_visit } = req.body;
    let oldDoc = null;
    try { oldDoc = await store.getById('destinations', req.params.id); } catch (_) {}

    const updates = { destination_name, footer_title: footer_title !== undefined ? footer_title : '', card_image, inner_image, description };
    let newSlug = oldDoc ? oldDoc.slug_url : '';
    if (destination_name) {
      newSlug = slugify(destination_name);
      updates.slug_url = newSlug;
    }
    if (places_to_visit !== undefined) {
      updates.places_to_visit = Array.isArray(places_to_visit) ? places_to_visit : (typeof places_to_visit === 'string' ? places_to_visit.split('\n').map(s=>s.trim()).filter(Boolean) : []);
    }
    const doc = await store.update('destinations', req.params.id, updates);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    // Sync updated destination details to SEO entry
    try {
      if (oldDoc && oldDoc.slug_url && newSlug) {
        const oldRoute = `/packages.html?slug=${oldDoc.slug_url}`.toLowerCase();
        const newRoute = `/packages.html?slug=${newSlug}`;
        const existingSeo = await store.getOne('seo', 'WHERE LOWER(page_route) = ?', [oldRoute]);
        if (existingSeo) {
          await store.update('seo', existingSeo.id, {
            page_route: newRoute,
            page_name: `Destination: ${destination_name || oldDoc.destination_name}`,
            canonical_url: `https://mangalamtravel.com/packages.html?slug=${newSlug}`,
            og_image: card_image || inner_image || existingSeo.og_image || ''
          });
        }
      }
    } catch (seoErr) {
      console.warn('[Destinations -> SEO Update Sync Error]:', seoErr.message);
    }

    res.json({ message: 'Updated', ...map(doc) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update destination' });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    let dest = null;
    try { dest = await store.getById('destinations', req.params.id); } catch (_) {}
    if (dest && dest.slug_url) {
      const destRoute = `/packages.html?slug=${dest.slug_url}`.toLowerCase();
      try {
        const existingSeo = await store.getOne('seo', 'WHERE LOWER(page_route) = ?', [destRoute]);
        if (existingSeo && existingSeo.id) {
          await store.remove('seo', existingSeo.id);
        }
      } catch (_) {}
    }
    await store.remove('destinations', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete destination' });
  }
});

module.exports = router;
