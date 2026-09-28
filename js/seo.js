/**
 * seo.js — Dynamic Google & Social Meta SEO Injector
 * Automatically fetches and injects page-specific Meta Title, Description, Keywords,
 * Canonical URL, OG Social cards, and Robots tags configured from the Admin Panel.
 */
(function() {
  'use strict';

  function setMetaTag(nameOrProperty, attr, content) {
    if (!content) return;
    let el = document.querySelector(`meta[${attr}="${nameOrProperty}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, nameOrProperty);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setLinkTag(rel, href) {
    if (!href) return;
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  async function applyPageSeo() {
    try {
      const pathname = window.location.pathname || '/';
      const cleanPath = pathname === '/' || pathname.endsWith('/index.html') ? '/' : pathname;
      const search = window.location.search || '';
      const params = new URLSearchParams(search);
      const slug = params.get('slug');
      
      const apiOrigin = window.MT?.API_BASE?.replace(/\/api$/, '') || '';
      
      let seo = null;
      // 1. If page has slug parameter (e.g. destination packages.html?slug=dubai), try matching destination route first
      if (slug) {
        const destRoute = `${cleanPath}?slug=${encodeURIComponent(slug.trim().toLowerCase())}`;
        try {
          const res = await fetch(`${apiOrigin}/api/seo/match?route=${encodeURIComponent(destRoute)}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.id) seo = data;
          }
        } catch (_) {}
      }

      // 2. Fall back to base pathname match
      if (!seo) {
        try {
          const res = await fetch(`${apiOrigin}/api/seo/match?route=${encodeURIComponent(cleanPath)}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.id) seo = data;
          }
        } catch (_) {}
      }

      if (!seo || !seo.id) {
        if (slug) {
          const destTitle = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/[-_]/g, ' ');
          const fallbackTitle = `${destTitle} Holiday Packages | Mangalam Travel & Tours`;
          if (!document.title || document.title.includes('Explore All Travel Packages') || document.title.includes('Malaysia')) {
            document.title = fallbackTitle;
            setMetaTag('og:title', 'property', fallbackTitle);
            setMetaTag('twitter:title', 'name', fallbackTitle);
          }
          const currentUrl = window.location.href.split('#')[0];
          setLinkTag('canonical', currentUrl);
          setMetaTag('og:url', 'property', currentUrl);
        }
        return;
      }

      // 1. Page Title
      if (seo.meta_title) {
        document.title = seo.meta_title;
        setMetaTag('og:title', 'property', seo.meta_title);
        setMetaTag('twitter:title', 'name', seo.meta_title);
      }

      // 2. Meta Description
      if (seo.meta_description) {
        setMetaTag('description', 'name', seo.meta_description);
        setMetaTag('og:description', 'property', seo.meta_description);
        setMetaTag('twitter:description', 'name', seo.meta_description);
      }

      // 3. Meta Keywords
      if (seo.meta_keywords) {
        setMetaTag('keywords', 'name', seo.meta_keywords);
      }

      // 4. Robots
      if (seo.robots) {
        setMetaTag('robots', 'name', seo.robots);
      }

      // 5. Canonical URL & OG URL
      if (seo.canonical_url) {
        setLinkTag('canonical', seo.canonical_url);
        setMetaTag('og:url', 'property', seo.canonical_url);
      }

      // 6. OG Image
      if (seo.og_image) {
        const resolvedImg = seo.og_image.startsWith('http') ? seo.og_image : `${window.location.origin}/${seo.og_image.replace(/^\.\//, '')}`;
        setMetaTag('og:image', 'property', resolvedImg);
        setMetaTag('twitter:image', 'name', resolvedImg);
        setMetaTag('twitter:card', 'name', 'summary_large_image');
      }

    } catch (e) {
      // Silently continue if offline
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyPageSeo);
  } else {
    applyPageSeo();
  }
})();
