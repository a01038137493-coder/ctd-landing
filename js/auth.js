// Auth utilities — shared across pages
// Depends on: supabase-js (CDN), js/supabase-config.js, js/products.js
//
// Public API:
//   CTDAuth.signUp(email, password, metadata?) → { user, session }
//   CTDAuth.signIn(email, password) → user
//   CTDAuth.signOut()
//   CTDAuth.getUser() → user | null
//   CTDAuth.getSession() → session | null
//   CTDAuth.onAuthChange(cb)  →  unsubscribe fn
//   CTDAuth.attachNav()  →  initializes nav swap on auth state
//
// Behavior: if Supabase isn't configured, all methods no-op gracefully and
// nav stays in default '로그인 / 장바구니' state.

(function (global) {
  const cfg = global.SUPABASE_CONFIG;
  const ready = !!(cfg && cfg.url && cfg.anonKey && global.supabase);

  function client() {
    // Reuse CTDProducts client if available (single shared instance)
    if (global.CTDProducts && global.CTDProducts.client) {
      return global.CTDProducts.client();
    }
    return global.supabase.createClient(cfg.url, cfg.anonKey);
  }

  async function signUp(email, password, metadata) {
    if (!ready) throw new Error('Supabase가 설정되지 않았습니다.');
    const { data, error } = await client().auth.signUp({
      email, password,
      options: metadata ? { data: metadata } : undefined,
    });
    if (error) throw error;
    return data;
  }
  async function signIn(email, password) {
    if (!ready) throw new Error('Supabase가 설정되지 않았습니다.');
    const { data, error } = await client().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }
  async function signOut() {
    if (!ready) return;
    await client().auth.signOut();
  }
  async function getUser() {
    if (!ready) return null;
    const { data } = await client().auth.getUser();
    return data.user || null;
  }
  async function getSession() {
    if (!ready) return null;
    const { data } = await client().auth.getSession();
    return data.session || null;
  }
  function onAuthChange(cb) {
    if (!ready) return () => {};
    const { data } = client().auth.onAuthStateChange((_evt, session) => cb(session));
    return () => data.subscription.unsubscribe();
  }

  // ── Nav state swap ────────────────────────────────────────────────
  function renderNav(user) {
    const navRight = document.querySelector('.nav-right');
    if (!navRight) return;
    // Find the existing login anchor (any <a> that's not .nav-cart or .nav-logout)
    const loginLink = Array.from(navRight.querySelectorAll('a'))
      .find(a => !a.classList.contains('nav-cart') && !a.classList.contains('nav-logout'));
    let logoutLink = navRight.querySelector('.nav-logout');

    if (user) {
      const handle = (user.user_metadata && user.user_metadata.name)
        || (user.email ? user.email.split('@')[0] : '회원');
      if (loginLink) {
        loginLink.textContent = handle + ' 님';
        loginLink.href = '#';
        loginLink.title = user.email || '';
        // Click on name does nothing for now; replace with /mypage.html later
        loginLink.onclick = (e) => e.preventDefault();
      }
      if (!logoutLink) {
        logoutLink = document.createElement('a');
        logoutLink.className = 'nav-logout';
        logoutLink.href = '#';
        logoutLink.textContent = '로그아웃';
        logoutLink.style.cursor = 'pointer';
        logoutLink.addEventListener('click', async (e) => {
          e.preventDefault();
          await signOut();
          location.reload();
        });
        // Insert before the cart button
        const cart = navRight.querySelector('.nav-cart');
        if (cart) navRight.insertBefore(logoutLink, cart);
        else navRight.appendChild(logoutLink);
      }
    } else {
      if (loginLink) {
        loginLink.textContent = '로그인';
        loginLink.href = '/login.html';
        loginLink.onclick = null;
      }
      if (logoutLink) logoutLink.remove();
    }
  }

  function attachNav() {
    if (!ready) {
      // ensure login link points to /login.html even without supabase
      const navRight = document.querySelector('.nav-right');
      if (navRight) {
        const loginLink = Array.from(navRight.querySelectorAll('a'))
          .find(a => !a.classList.contains('nav-cart') && !a.classList.contains('nav-logout'));
        if (loginLink && (loginLink.getAttribute('href') === '#' || loginLink.getAttribute('href') === '')) {
          loginLink.href = '/login.html';
        }
      }
      return;
    }
    getUser().then(renderNav);
    onAuthChange((session) => renderNav(session ? session.user : null));
  }

  global.CTDAuth = {
    ready,
    signUp, signIn, signOut,
    getUser, getSession,
    onAuthChange,
    renderNav, attachNav,
  };
})(window);
