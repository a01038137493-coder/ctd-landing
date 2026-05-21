// Products data layer
//
// Source of truth:
//   - If SUPABASE_CONFIG.url + anonKey are set → Supabase 'products' table
//   - Else → localStorage (single-device demo mode)
//
// Both modes expose the same async API (loadProducts, saveProduct, deleteProduct, etc.)
// so admin.html and shop.html don't care which backend is active.

(function (global) {
  const STORAGE_KEY = 'ctd_products_v1';
  const PUBLISHED_URL = '/products.json';

  // ── Defaults ─────────────────────────────────────────────────────────────
  const defaultProducts = [
    { id: 'inspire',       name: 'INSPIRE (수능영어 독해 메뉴얼)',                          image: 'image/product03.jpg', price: 2000,   priceWas: null,   badge: null,      order: 1 },
    { id: 'membership',    name: '[Membership] Connect the dots 멤버쉽',                    image: 'image/book.png',      price: 15900,  priceWas: null,   badge: null,      order: 2 },
    { id: 'main-textbook', name: '[본교재] Connect the dots 시즌별 단행본',                 image: 'image/product02.jpg', price: 8900,   priceWas: 15000,  badge: 'SALE',    order: 3 },
    { id: 'trigger-2027',  name: '[컨텐츠] 구문/어휘 독학서 TRIGGER 2027',                  image: 'image/product01.jpg', price: 25000,  priceWas: null,   badge: null,      order: 4 },
    { id: 'ip',            name: '[컨텐츠] 문장해석과제 IP (Interpreting Practice) [해설영상 포함]', image: 'image/product04.jpg', price: 12000, priceWas: 20000, badge: 'SALE', order: 5 },
    { id: 'finale',        name: '[온라인 수업] 2027 사관학교 수능영어 FINALE',             image: 'image/feat02.png',    price: 150000, priceWas: 400000, badge: 'SALE',    order: 6 },
    { id: 'academy',       name: '[학원 납품용] Connect the dots (평가원 기출분석) 주간지 교재 납품', image: '', price: 10000, priceWas: null, badge: 'SOLDOUT', order: 7 },
  ];

  // ── Supabase mode detection + lazy client ────────────────────────────────
  function hasSupabase() {
    const cfg = global.SUPABASE_CONFIG;
    return !!(cfg && cfg.url && cfg.anonKey && global.supabase);
  }
  let _client = null;
  function client() {
    if (_client) return _client;
    const cfg = global.SUPABASE_CONFIG;
    _client = global.supabase.createClient(cfg.url, cfg.anonKey);
    return _client;
  }

  // ── Row mapping (snake_case DB ↔ camelCase JS) ──────────────────────────
  function fromRow(row) {
    return {
      id: row.id,
      name: row.name,
      image: row.image || '',
      price: row.price ?? 0,
      priceWas: row.price_was ?? null,
      badge: row.badge ?? null,
      order: row.order ?? 0,
      description: row.description || '',
    };
  }
  function toRow(p) {
    return {
      id: p.id,
      name: p.name,
      image: p.image || null,
      price: Number(p.price) || 0,
      price_was: p.priceWas != null && p.priceWas !== '' ? Number(p.priceWas) : null,
      badge: p.badge || null,
      order: Number(p.order) || 0,
      description: p.description || null,
    };
  }

  // ── localStorage helpers (fallback mode) ────────────────────────────────
  function loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
  }
  function saveLocal(products) { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); }
  function clearLocal() { localStorage.removeItem(STORAGE_KEY); }

  async function fetchPublished() {
    try {
      const res = await fetch(PUBLISHED_URL, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data) ? data : null;
    } catch { return null; }
  }

  // ── Public API ───────────────────────────────────────────────────────────
  async function getProductById(id) {
    if (hasSupabase()) {
      const { data, error } = await client().from('products').select('*').eq('id', id).single();
      if (error) { console.error('[Supabase] getProductById:', error); return null; }
      return data ? fromRow(data) : null;
    }
    const all = await loadProducts();
    return all.find(p => p.id === id) || null;
  }

  async function createOrder(order) {
    // order = { customer_name, customer_phone, customer_email, customer_address, memo, items, total }
    if (!hasSupabase()) {
      // localStorage fallback so the flow doesn't break in demo mode
      const orders = JSON.parse(localStorage.getItem('ctd_orders_v1') || '[]');
      const rec = { ...order, id: 'o_' + Date.now().toString(36), created_at: new Date().toISOString(), status: 'pending' };
      orders.push(rec);
      localStorage.setItem('ctd_orders_v1', JSON.stringify(orders));
      return rec;
    }
    // Generate UUID client-side so we don't need SELECT permission to read it back.
    // anon role only has INSERT on orders; reading the inserted row would require SELECT.
    const id = (crypto.randomUUID && crypto.randomUUID()) ||
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
    const row = { id, ...order };
    const { error } = await client().from('orders').insert(row);
    if (error) throw error;
    const result = { ...row, status: 'pending', created_at: new Date().toISOString() };

    // Telegram 알림
    try {
      const tg = window.TELEGRAM_CONFIG;
      if (tg && tg.token && tg.chatId) {
        const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
        const itemList = (order.items || []).map(i => `  • ${i.name} × ${i.qty}`).join('\n');
        const lines = [
          '🛒 *주문 접수*',
          '',
          `👤 이름: ${order.customer_name}`,
          `📞 연락처: ${order.customer_phone}`,
          order.customer_email ? `📧 이메일: ${order.customer_email}` : '',
          `📦 상품:\n${itemList}`,
          `💰 총액: ${Number(order.total).toLocaleString('ko-KR')}원`,
          order.customer_address ? `🏠 주소: ${order.customer_address}` : '',
          order.memo ? `📝 메모: ${order.memo}` : '',
          '',
          `⏰ ${now}`,
        ].filter(Boolean).join('\n');
        fetch(`https://api.telegram.org/bot${tg.token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: tg.chatId, text: lines, parse_mode: 'Markdown' }),
        }).catch(() => {});
      }
    } catch (_) {}

    return result;
  }

  async function loadProducts() {
    if (hasSupabase()) {
      const { data, error } = await client().from('products').select('*').order('order', { ascending: true });
      if (error) {
        console.error('[Supabase] loadProducts:', error);
        return defaultProducts.slice();
      }
      return (data || []).map(fromRow);
    }
    const local = loadLocal();
    if (local && local.length) return local;
    const published = await fetchPublished();
    if (published && published.length) return published;
    return defaultProducts.slice();
  }

  async function saveProduct(product) {
    if (hasSupabase()) {
      const row = toRow(product);
      if (!row.id) delete row.id; // let Postgres generate uuid
      const { data, error } = await client().from('products').upsert(row).select().single();
      if (error) throw error;
      return fromRow(data);
    }
    const local = loadLocal() || [];
    const idx = local.findIndex(p => p.id === product.id);
    if (idx >= 0) local[idx] = { ...local[idx], ...product };
    else local.push({ ...product, id: product.id || genId() });
    saveLocal(local);
    return product;
  }

  async function deleteProduct(id) {
    if (hasSupabase()) {
      const { error } = await client().from('products').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const local = loadLocal() || [];
    saveLocal(local.filter(p => p.id !== id));
  }

  async function updateOrders(items) {
    // items: [{ id, order }]
    if (hasSupabase()) {
      const updates = items.map(it => client().from('products').update({ order: it.order }).eq('id', it.id));
      const results = await Promise.all(updates);
      const err = results.find(r => r.error);
      if (err) throw err.error;
      return;
    }
    const local = loadLocal() || [];
    const map = new Map(items.map(it => [it.id, it.order]));
    saveLocal(local.map(p => (map.has(p.id) ? { ...p, order: map.get(p.id) } : p)));
  }

  async function uploadImage(file) {
    function toBase64() {
      return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
    }
    if (!hasSupabase()) return toBase64();
    const cfg = global.SUPABASE_CONFIG;
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await client().storage.from(cfg.bucket).upload(path, file, {
      cacheControl: '3600', upsert: false, contentType: file.type || undefined,
    });
    if (error) {
      console.warn('[Storage] 업로드 실패, base64로 저장:', error.message);
      return toBase64();
    }
    const { data } = client().storage.from(cfg.bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  // ── Auth (Supabase only) ─────────────────────────────────────────────────
  async function signIn(email, password) {
    if (!hasSupabase()) throw new Error('Supabase가 설정되지 않았습니다.');
    const { data, error } = await client().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }
  async function signOut() {
    if (!hasSupabase()) return;
    await client().auth.signOut();
  }
  async function getSession() {
    if (!hasSupabase()) return null;
    const { data } = await client().auth.getSession();
    return data.session;
  }
  function onAuthChange(cb) {
    if (!hasSupabase()) return () => {};
    const { data } = client().auth.onAuthStateChange((_evt, session) => cb(session));
    return () => data.subscription.unsubscribe();
  }

  // ── Realtime subscribe (Supabase only) ──────────────────────────────────
  function subscribeChanges(cb) {
    if (!hasSupabase()) return () => {};
    const ch = client()
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => cb())
      .subscribe();
    return () => client().removeChannel(ch);
  }

  // ── Utils ────────────────────────────────────────────────────────────────
  function formatPrice(n) { return Number(n).toLocaleString('ko-KR') + '원'; }
  function genId() { return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  global.CTDProducts = {
    STORAGE_KEY,
    defaultProducts,
    hasSupabase,
    client, // shared singleton — used by auth.js
    loadProducts,
    getProductById,
    createOrder,
    saveProduct,
    deleteProduct,
    updateOrders,
    uploadImage,
    signIn,
    signOut,
    getSession,
    onAuthChange,
    subscribeChanges,
    formatPrice,
    genId,
    // legacy localStorage helpers (still used by admin import/export)
    loadLocal,
    saveLocal,
    clearLocal,
  };
})(window);
