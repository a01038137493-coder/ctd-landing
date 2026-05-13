// Cart utilities — localStorage backed, cross-page synced
(function (global) {
  const CART_KEY = 'ctd_cart_v1';

  function load() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  function save(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent('cart:change', { detail: items }));
  }

  function addItem(product, qty = 1) {
    const items = load();
    const idx = items.findIndex(it => it.id === product.id);
    if (idx >= 0) items[idx].qty += qty;
    else items.push({
      id: product.id,
      name: product.name,
      image: product.image || '',
      price: Number(product.price) || 0,
      qty: Math.max(1, qty),
    });
    save(items);
  }
  function setQty(id, qty) {
    const items = load();
    const idx = items.findIndex(it => it.id === id);
    if (idx < 0) return;
    if (qty <= 0) items.splice(idx, 1);
    else items[idx].qty = qty;
    save(items);
  }
  function removeItem(id) {
    save(load().filter(it => it.id !== id));
  }
  function clear() { save([]); }
  function count() { return load().reduce((n, it) => n + (it.qty || 0), 0); }
  function total() { return load().reduce((s, it) => s + it.price * it.qty, 0); }

  function attachNavCount() {
    const update = () => {
      const c = count();
      document.querySelectorAll('.nav-cart').forEach(el => {
        let badge = el.querySelector('.nav-cart-count');
        if (c > 0) {
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'nav-cart-count';
            badge.style.cssText = 'margin-left:6px;display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#fff;color:#FF7A00;font-size:11px;font-weight:900;line-height:1;';
            el.appendChild(badge);
          }
          badge.textContent = c;
        } else if (badge) badge.remove();
      });
    };
    update();
    document.addEventListener('cart:change', update);
    window.addEventListener('storage', (e) => { if (e.key === CART_KEY) update(); });
  }

  global.CTDCart = { CART_KEY, load, save, addItem, setQty, removeItem, clear, count, total, attachNavCount };
})(window);
