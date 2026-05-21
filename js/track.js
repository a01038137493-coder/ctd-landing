// Visitor analytics — logs page views and custom events to Supabase `pageviews`
// Single-table design (backward compatible):
//   event_name IS NULL  → page view row
//   event_name IS NOT NULL → custom event row (click, scroll_depth, download, etc.)
//
// Requires: supabase-js CDN + js/supabase-config.js loaded BEFORE this file.
//
// Auto-tracked events (no markup needed):
//   - page_view             every page load
//   - scroll_depth          fires once at 25 / 50 / 75 / 100% per page
//   - pdf_download          click on <a href="*.pdf">
//   - tel_click             click on <a href="tel:*">
//   - email_click           click on <a href="mailto:*">
//   - outbound_click        click on <a> to a different hostname
//
// Markup-driven events:
//   <button data-track="signup_start">           → event_name = "signup_start"
//   <a data-track="cta_apply" data-track-props='{"plan":"pro"}'> …  → with properties
//   <form data-track-submit="contact_submit"> …  → fires on submit
//
// Public API:
//   CTDTrack.event(name, props?)   manual event ('button_click', {...})
//   CTDTrack.pageView(path?)       manual extra page view (e.g. SPA route change)
(function () {
  if (typeof window === 'undefined') return;
  try {
    var VISITOR_KEY  = 'ctd_vid';
    var SESSION_KEY  = 'ctd_sid';
    var LANDING_KEY  = 'ctd_landing';   // first page URL of this session
    var FIRST_SEEN_K = 'ctd_first_seen';
    var ua           = navigator.userAgent;

    // ── Persistent visitor ID ────────────────────────────────────────
    var vid = null;
    var isNew = false;
    try {
      vid = localStorage.getItem(VISITOR_KEY);
      if (!vid) {
        isNew = true;
        vid = (crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(VISITOR_KEY, vid);
        localStorage.setItem(FIRST_SEEN_K, new Date().toISOString());
      }
    } catch (e) { vid = 'anon'; }

    // ── Per-session ID ───────────────────────────────────────────────
    var sid = null;
    var landingPage = null;
    try {
      sid = sessionStorage.getItem(SESSION_KEY);
      if (!sid) {
        sid = (crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem(SESSION_KEY, sid);
        landingPage = location.pathname + location.search;
        sessionStorage.setItem(LANDING_KEY, landingPage);
      } else {
        landingPage = sessionStorage.getItem(LANDING_KEY) || (location.pathname + location.search);
      }
    } catch (e) { sid = 'anon'; landingPage = location.pathname; }

    // ── Device ───────────────────────────────────────────────────────
    var isMobile = /Mobi|Android|iPhone/i.test(ua) && !/iPad/i.test(ua);
    var isTablet = /iPad/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
    var device   = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

    // ── Browser ──────────────────────────────────────────────────────
    var browser = 'Other';
    if (/Edg\//i.test(ua))          browser = 'Edge';
    else if (/OPR\//i.test(ua))     browser = 'Opera';
    else if (/Chrome\//i.test(ua))  browser = 'Chrome';
    else if (/Safari\//i.test(ua))  browser = 'Safari';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';

    // ── OS ───────────────────────────────────────────────────────────
    var os = 'Other';
    if (/iPhone|iPad/i.test(ua))     os = 'iOS';
    else if (/Android/i.test(ua))    os = 'Android';
    else if (/Windows NT/i.test(ua)) os = 'Windows';
    else if (/Macintosh/i.test(ua))  os = 'macOS';
    else if (/Linux/i.test(ua))      os = 'Linux';

    // ── Screen + language ───────────────────────────────────────────
    var screenStr = '';
    try { screenStr = (window.screen && screen.width && screen.height) ? (screen.width + 'x' + screen.height) : ''; } catch (e) {}
    var lang = '';
    try { lang = (navigator.language || navigator.userLanguage || '').slice(0, 16); } catch (e) {}

    // ── UTM parameters (override referrer when present) ──────────────
    var params      = new URLSearchParams(location.search);
    var utmSource   = params.get('utm_source')   || null;
    var utmMedium   = params.get('utm_medium')   || null;
    var utmCampaign = params.get('utm_campaign') || null;

    // ── Referrer label (human-readable) ──────────────────────────────
    var referrer = '직접';
    if (utmSource) {
      var src = utmSource.toLowerCase();
      if (src === 'instagram' || src === 'ig')     referrer = 'Instagram (광고)';
      else if (src === 'facebook' || src === 'fb') referrer = 'Facebook (광고)';
      else if (src === 'google')                   referrer = 'Google (광고)';
      else if (src === 'naver')                    referrer = 'Naver (광고)';
      else if (src === 'kakao')                    referrer = 'Kakao (광고)';
      else                                         referrer = utmSource;
      if (utmCampaign) referrer += ' · ' + utmCampaign;
    } else {
      try {
        if (document.referrer) {
          var rh = new URL(document.referrer).hostname;
          if (rh && rh !== location.hostname) {
            if (/instagram/i.test(rh))             referrer = 'Instagram';
            else if (/facebook|fb\.com/i.test(rh)) referrer = 'Facebook';
            else if (/google/i.test(rh))            referrer = 'Google';
            else if (/naver/i.test(rh))             referrer = 'Naver';
            else if (/kakao/i.test(rh))             referrer = 'Kakao';
            else if (/youtube/i.test(rh))           referrer = 'YouTube';
            else if (/t\.co|twitter/i.test(rh))    referrer = 'Twitter/X';
            else                                    referrer = rh;
          }
        }
      } catch (e) {}
    }

    var currentPath = location.pathname;

    // ── Supabase client lookup ───────────────────────────────────────
    function getClient() {
      var cfg = window.SUPABASE_CONFIG;
      if (!cfg || !cfg.url || !window.supabase) return null;
      return (window.CTDProducts && window.CTDProducts.client)
        ? window.CTDProducts.client()
        : window.supabase.createClient(cfg.url, cfg.anonKey);
    }

    // ── Core insert (handles both page views & events) ───────────────
    // Tries enriched payload first; on schema mismatch (new columns not
    // migrated yet), falls back to legacy 9-column shape and remembers it
    // for the rest of the session so we don't keep retrying.
    var legacyMode = false;
    function insertRow(opts) {
      try {
        var cl = getClient();
        if (!cl) return;
        var legacyRow = {
          page:        opts.page || currentPath,
          referrer:    referrer,
          device:      device,
          browser:     browser,
          os:          os,
          session_id:  sid,
          visitor_id:  vid,
          is_new:      isNew,
        };
        if (legacyMode) {
          cl.from('pageviews').insert(legacyRow).then(function () {});
          return;
        }
        var richRow = Object.assign({}, legacyRow, {
          screen:        screenStr || null,
          language:      lang || null,
          utm_source:    utmSource,
          utm_medium:    utmMedium,
          utm_campaign:  utmCampaign,
          landing_page:  landingPage,
          event_name:    opts.event_name || null,
          event_props:   opts.event_props || null,
        });
        cl.from('pageviews').insert(richRow).then(function (res) {
          if (res && res.error) {
            var msg = (res.error.message || '') + ' ' + (res.error.details || '');
            // PostgREST PGRST204 / 42703 → unknown column → fall back
            if (/column .* does not exist|schema cache|PGRST204|42703/i.test(msg)) {
              legacyMode = true;
              try { cl.from('pageviews').insert(legacyRow).then(function () {}); } catch (e) {}
            }
          }
        });
      } catch (e) {}
    }

    // ── Public API ───────────────────────────────────────────────────
    window.CTDTrack = {
      event: function (name, props) {
        // Back-compat: legacy callers passed a virtual path string like '/event/pdf-download'
        if (typeof name === 'string' && name.charAt(0) === '/') {
          insertRow({ page: name });
          return;
        }
        insertRow({ event_name: String(name || 'custom_event'), event_props: props || null });
      },
      pageView: function (path) { insertRow({ page: path || currentPath }); },
    };

    // ── Auto: page_view on load (deferred so it never blocks render) ─
    function fireInitialPageView() { insertRow({}); }
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(fireInitialPageView);
    } else {
      setTimeout(fireInitialPageView, 800);
    }

    // ── Auto: scroll depth (25/50/75/100) ────────────────────────────
    var scrollFired = { 25: false, 50: false, 75: false, 100: false };
    var scrollThrottle = false;
    function onScroll() {
      if (scrollThrottle) return;
      scrollThrottle = true;
      setTimeout(function () {
        scrollThrottle = false;
        try {
          var doc = document.documentElement;
          var max = Math.max(doc.scrollHeight, document.body.scrollHeight) - window.innerHeight;
          if (max <= 0) return;
          var pct = Math.min(100, Math.round((window.scrollY || window.pageYOffset || 0) / max * 100));
          [25, 50, 75, 100].forEach(function (t) {
            if (pct >= t && !scrollFired[t]) {
              scrollFired[t] = true;
              insertRow({ event_name: 'scroll_depth', event_props: { percent: t } });
            }
          });
        } catch (e) {}
      }, 250);
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    // ── Auto: click tracking (delegated) ─────────────────────────────
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t) return;
      // Walk up to find anchor/button with data-track or an interesting href
      var el = t.closest ? (t.closest('[data-track], a[href], button')) : null;
      if (!el) return;

      // 1) Explicit markup-driven event wins
      var manual = el.getAttribute && el.getAttribute('data-track');
      if (manual) {
        var props = null;
        var raw = el.getAttribute('data-track-props');
        if (raw) { try { props = JSON.parse(raw); } catch (er) { props = { raw: raw }; } }
        var label = (el.innerText || el.textContent || '').trim().slice(0, 80);
        if (label) {
          props = props || {};
          if (!props.label) props.label = label;
        }
        insertRow({ event_name: manual, event_props: props });
        return;
      }

      // 2) Anchor-based auto-detection
      if (el.tagName === 'A' && el.href) {
        var href = el.getAttribute('href') || '';
        var lower = href.toLowerCase();
        if (lower.indexOf('tel:') === 0) {
          insertRow({ event_name: 'tel_click', event_props: { href: href } });
          return;
        }
        if (lower.indexOf('mailto:') === 0) {
          insertRow({ event_name: 'email_click', event_props: { href: href } });
          return;
        }
        if (/\.pdf(\?|#|$)/i.test(href)) {
          var name = href.split('/').pop().split('?')[0];
          insertRow({ event_name: 'pdf_download', event_props: { file: name, href: href } });
          return;
        }
        try {
          var u = new URL(el.href, location.href);
          if (u.hostname && u.hostname !== location.hostname) {
            insertRow({ event_name: 'outbound_click', event_props: { href: u.href, host: u.hostname } });
          }
        } catch (er) {}
      }
    }, true);

    // ── Auto: form submit tracking ───────────────────────────────────
    document.addEventListener('submit', function (e) {
      var f = e.target;
      if (!f || f.tagName !== 'FORM') return;
      var name = f.getAttribute('data-track-submit');
      if (!name) return;
      var props = null;
      var raw = f.getAttribute('data-track-props');
      if (raw) { try { props = JSON.parse(raw); } catch (er) { props = { raw: raw }; } }
      insertRow({ event_name: name, event_props: props });
    }, true);
  } catch (e) {}
})();
