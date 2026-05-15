// Visitor page-view tracker — logs to Supabase `pageviews` table
// Requires: supabase-js CDN, js/supabase-config.js loaded before this file
(function () {
  if (typeof window === 'undefined') return;
  try {
    var VISITOR_KEY = 'ctd_vid';
    var SESSION_KEY = 'ctd_sid';
    var ua = navigator.userAgent;

    // Persistent visitor ID (new vs returning)
    var vid = null;
    var isNew = false;
    try {
      vid = localStorage.getItem(VISITOR_KEY);
      if (!vid) {
        isNew = true;
        vid = (crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(VISITOR_KEY, vid);
      }
    } catch (e) { vid = 'anon'; }

    // Per-session ID
    var sid = null;
    try {
      sid = sessionStorage.getItem(SESSION_KEY);
      if (!sid) {
        sid = (crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem(SESSION_KEY, sid);
      }
    } catch (e) { sid = 'anon'; }

    // Device
    var isMobile = /Mobi|Android|iPhone/i.test(ua) && !/iPad/i.test(ua);
    var isTablet = /iPad/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
    var device = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

    // Browser
    var browser = 'Other';
    if (/Edg\//i.test(ua))          browser = 'Edge';
    else if (/OPR\//i.test(ua))     browser = 'Opera';
    else if (/Chrome\//i.test(ua))  browser = 'Chrome';
    else if (/Safari\//i.test(ua))  browser = 'Safari';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';

    // OS
    var os = 'Other';
    if (/iPhone|iPad/i.test(ua))     os = 'iOS';
    else if (/Android/i.test(ua))    os = 'Android';
    else if (/Windows NT/i.test(ua)) os = 'Windows';
    else if (/Macintosh/i.test(ua))  os = 'macOS';
    else if (/Linux/i.test(ua))      os = 'Linux';

    // UTM parameters (광고 URL 추적 — referrer보다 우선)
    var params = new URLSearchParams(location.search);
    var utmSource   = params.get('utm_source');    // e.g. instagram
    var utmMedium   = params.get('utm_medium');    // e.g. paid
    var utmCampaign = params.get('utm_campaign');  // e.g. summer2025

    // Referrer detection (UTM이 있으면 UTM 우선)
    var referrer = '직접';
    if (utmSource) {
      // UTM source를 사람이 읽기 좋게 변환
      var src = utmSource.toLowerCase();
      if (src === 'instagram' || src === 'ig')       referrer = 'Instagram (광고)';
      else if (src === 'facebook' || src === 'fb')   referrer = 'Facebook (광고)';
      else if (src === 'google')                     referrer = 'Google (광고)';
      else if (src === 'naver')                      referrer = 'Naver (광고)';
      else if (src === 'kakao')                      referrer = 'Kakao (광고)';
      else                                           referrer = utmSource;
      if (utmCampaign) referrer += ' · ' + utmCampaign;
    } else {
      try {
        if (document.referrer) {
          var rh = new URL(document.referrer).hostname;
          if (/instagram/i.test(rh))             referrer = 'Instagram';
          else if (/facebook|fb\.com/i.test(rh)) referrer = 'Facebook';
          else if (/google/i.test(rh))            referrer = 'Google';
          else if (/naver/i.test(rh))             referrer = 'Naver';
          else if (/kakao/i.test(rh))             referrer = 'Kakao';
          else if (/youtube/i.test(rh))           referrer = 'YouTube';
          else if (/t\.co|twitter/i.test(rh))    referrer = 'Twitter/X';
          else                                    referrer = rh;
        }
      } catch (e) {}
    }

    var page = location.pathname;

    function doTrack() {
      try {
        var cfg = window.SUPABASE_CONFIG;
        if (!cfg || !cfg.url || !window.supabase) return;
        var client = (window.CTDProducts && window.CTDProducts.client)
          ? window.CTDProducts.client()
          : window.supabase.createClient(cfg.url, cfg.anonKey);
        client.from('pageviews').insert({
          page:       page,
          referrer:   referrer,
          device:     device,
          browser:    browser,
          os:         os,
          session_id: sid,
          visitor_id: vid,
          is_new:     isNew,
        }).then(function () {});
      } catch (e) {}
    }

    // Defer so tracking never blocks page render
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(function () { doTrack(); });
    } else {
      setTimeout(doTrack, 800);
    }
  } catch (e) {}
})();
