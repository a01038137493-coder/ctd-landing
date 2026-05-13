// Products data layer — shared between shop.html and admin.html
// Source of truth order: localStorage (admin edits) > products.json (published) > defaultProducts

(function (global) {
  const STORAGE_KEY = 'ctd_products_v1';
  const PUBLISHED_URL = '/products.json';

  const defaultProducts = [
    {
      id: 'inspire',
      name: 'INSPIRE (수능영어 독해 메뉴얼)',
      image: 'image/product03.jpg',
      price: 2000,
      priceWas: null,
      badge: null, // 'SALE' | 'SOLDOUT' | null
      order: 1,
    },
    {
      id: 'membership',
      name: '[Membership] Connect the dots 멤버쉽',
      image: 'image/book.png',
      price: 15900,
      priceWas: null,
      badge: null,
      order: 2,
    },
    {
      id: 'main-textbook',
      name: '[본교재] Connect the dots 시즌별 단행본',
      image: 'image/product02.jpg',
      price: 8900,
      priceWas: 15000,
      badge: 'SALE',
      order: 3,
    },
    {
      id: 'trigger-2027',
      name: '[컨텐츠] 구문/어휘 독학서 TRIGGER 2027',
      image: 'image/product01.jpg',
      price: 25000,
      priceWas: null,
      badge: null,
      order: 4,
    },
    {
      id: 'ip',
      name: '[컨텐츠] 문장해석과제 IP (Interpreting Practice) [해설영상 포함]',
      image: 'image/product04.jpg',
      price: 12000,
      priceWas: 20000,
      badge: 'SALE',
      order: 5,
    },
    {
      id: 'finale',
      name: '[온라인 수업] 2027 사관학교 수능영어 FINALE',
      image: 'image/feat02.png',
      price: 150000,
      priceWas: 400000,
      badge: 'SALE',
      order: 6,
    },
    {
      id: 'academy',
      name: '[학원 납품용] Connect the dots (평가원 기출분석) 주간지 교재 납품',
      image: '',
      price: 10000,
      priceWas: null,
      badge: 'SOLDOUT',
      order: 7,
    },
  ];

  function loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function saveLocal(products) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }

  function clearLocal() {
    localStorage.removeItem(STORAGE_KEY);
  }

  async function fetchPublished() {
    try {
      const res = await fetch(PUBLISHED_URL, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data) ? data : null;
    } catch {
      return null;
    }
  }

  // Returns the products to render. Order: localStorage > published JSON > defaults.
  async function loadProducts() {
    const local = loadLocal();
    if (local && local.length) return local;
    const published = await fetchPublished();
    if (published && published.length) return published;
    return defaultProducts.slice();
  }

  function formatPrice(n) {
    return Number(n).toLocaleString('ko-KR') + '원';
  }

  function genId() {
    return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  global.CTDProducts = {
    STORAGE_KEY,
    defaultProducts,
    loadProducts,
    loadLocal,
    saveLocal,
    clearLocal,
    fetchPublished,
    formatPrice,
    genId,
  };
})(window);
