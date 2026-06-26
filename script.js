/* ═══════════════════════════════════════════════════════════════
   PocketDesk — script.js
   Handles: cart, product rendering, UI interactions, reviews
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────────────────────
   CONFIG — change the path if you rename products.json
───────────────────────────────────────────────────────────────── */
const PRODUCTS_URL = 'products.json';

/* ─────────────────────────────────────────────────────────────
   GLOBAL STATE
───────────────────────────────────────────────────────────────── */
let products = [];

const cart = {
  items: JSON.parse(localStorage.getItem('pd_cart') || '[]'),

  save() {
    localStorage.setItem('pd_cart', JSON.stringify(this.items));
    this.render();
    updateCartBadge();
  },

  add(productId, color) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const key = `${productId}::${color}`;
    const existing = this.items.find(i => i.key === key);
    if (existing) {
      existing.qty++;
    } else {
      this.items.push({
        key, productId, color,
        name: product.name,
        price: product.price,
        image: product.image,
        slug: product.slug
      });
    }
    this.save();
    toast(`✓ Added to cart`, 'success');
    openCart();
  },

  remove(key) {
    this.items = this.items.filter(i => i.key !== key);
    this.save();
  },

  setQty(key, qty) {
    if (qty < 1) { this.remove(key); return; }
    const item = this.items.find(i => i.key === key);
    if (item) { item.qty = qty; this.save(); }
  },

  total() {
    return this.items.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  },

  count() {
    return this.items.reduce((s, i) => s + (i.qty || 1), 0);
  },

  render() {
    const body = qs('#cartBody');
    if (!body) return;

    if (this.items.length === 0) {
      body.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty__icon">🛍️</div>
          <h3>Your cart is empty</h3>
          <p>Add something great to get started.</p>
          <a href="products.html" class="btn btn--accent" onclick="closeCart()">Shop Now</a>
        </div>`;
    } else {
      body.innerHTML = this.items.map(item => `
        <div class="cart-item" data-key="${item.key}">
          <img src="${item.image}" alt="${item.name}" class="cart-item__img"
               onerror="this.src='https://placehold.co/72x72/f5f5f7/86868b?text=?'">
          <div class="cart-item__info">
            <div class="cart-item__name">${item.name}</div>
            <div class="cart-item__variant">${item.color}</div>
            <div class="cart-item__controls">
              <button class="qty-btn" onclick="cart.setQty('${item.key}', ${(item.qty||1)-1})">−</button>
              <span class="qty-num">${item.qty || 1}</span>
              <button class="qty-btn" onclick="cart.setQty('${item.key}', ${(item.qty||1)+1})">+</button>
              <span class="cart-item__price">$${(item.price * (item.qty||1)).toFixed(2)}</span>
            </div>
            <span class="cart-item__remove" onclick="cart.remove('${item.key}')">Remove</span>
          </div>
        </div>`).join('');
    }

    const foot = qs('#cartFooter');
    if (foot) {
      foot.style.display = this.items.length ? 'block' : 'none';
      const subtotalEl = qs('#cartSubtotal');
      if (subtotalEl) subtotalEl.textContent = `$${this.total().toFixed(2)}`;
    }
  }
};

/* ─────────────────────────────────────────────────────────────
   UTILITY
───────────────────────────────────────────────────────────────── */
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function fmtPrice(n) { return `$${Number(n).toFixed(2)}`; }

function starsHtml(rating) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function updateCartBadge() {
  const count = cart.count();
  qsa('.cart-badge').forEach(el => {
    el.textContent = count;
    el.classList.toggle('visible', count > 0);
  });
}

function toast(msg, type = 'default') {
  const container = qs('.toast-container') || (() => {
    const c = document.createElement('div');
    c.className = 'toast-container';
    document.body.appendChild(c);
    return c;
  })();

  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 300);
  }, 2800);
}

/* ─────────────────────────────────────────────────────────────
   NAVIGATION
───────────────────────────────────────────────────────────────── */
function initNav() {
  // Hamburger
  const ham = qs('.nav__hamburger');
  const mob = qs('.nav__mobile');
  if (ham && mob) {
    ham.addEventListener('click', () => {
      const isOpen = ham.classList.toggle('open');
      mob.classList.toggle('open', isOpen);
    });
    // Close on link click
    mob.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => {
        ham.classList.remove('open');
        mob.classList.remove('open');
      })
    );
  }

  // Active link
  const path = location.pathname.split('/').pop() || 'index.html';
  qsa('.nav__links a, .nav__mobile a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  // Back-to-top
  const btt = qs('.back-to-top');
  if (btt) {
    window.addEventListener('scroll', () => {
      btt.classList.toggle('visible', scrollY > 400);
    }, { passive: true });
    btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
}

/* ─────────────────────────────────────────────────────────────
   CART DRAWER
───────────────────────────────────────────────────────────────── */
function openCart() {
  qs('.cart-drawer')?.classList.add('open');
  qs('.cart-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
  cart.render();
}
function closeCart() {
  qs('.cart-drawer')?.classList.remove('open');
  qs('.cart-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

function initCart() {
  qsa('.nav__cart-btn').forEach(btn =>
    btn.addEventListener('click', openCart)
  );
  qs('.cart-close')?.addEventListener('click', closeCart);
  qs('.cart-overlay')?.addEventListener('click', closeCart);
  updateCartBadge();
  cart.render();
}

/* ─────────────────────────────────────────────────────────────
   LOAD PRODUCTS  (called by each page)
───────────────────────────────────────────────────────────────── */
async function loadProducts() {
  if (products.length) return products;         // cached
  try {
    const res = await fetch(PRODUCTS_URL);
    if (!res.ok) throw new Error('Failed to load products.json');
    products = await res.json();
    return products;
  } catch (err) {
    console.error('[PocketDesk]', err);
    return [];
  }
}

/* ─────────────────────────────────────────────────────────────
   PRODUCT CARD HTML
───────────────────────────────────────────────────────────────── */
function productCardHtml(p) {
  const badgeClass = {
    'New':         'new',
    'Sale':        'sale',
    'Best Seller': '',
    'Limited':     ''
  }[p.badge] || '';

  return `
    <a class="product-card" href="products.html?id=${p.slug}"
       aria-label="${p.name}">
      ${p.badge ? `<span class="product-card__badge ${badgeClass ? `product-card__badge--${badgeClass}` : ''}">${p.badge}</span>` : ''}
      <div class="product-card__img-wrap">
        <img class="product-card__img" src="${p.image}" alt="${p.name}"
             loading="lazy"
             onerror="this.src='https://placehold.co/600x500/f5f5f7/86868b?text=${encodeURIComponent(p.name)}'">
      </div>
      <div class="product-card__body">
        <div class="product-card__cat">${p.category}</div>
        <div class="product-card__name">${p.name}</div>
        <div class="product-card__tagline">${p.tagline}</div>
        <div class="product-card__foot">
          <div class="product-card__price">
            <span class="product-card__price-now">${fmtPrice(p.price)}</span>
            ${p.originalPrice ? `<span class="product-card__price-was">${fmtPrice(p.originalPrice)}</span>` : ''}
          </div>
          <div class="product-card__rating">
            <span class="stars">${starsHtml(p.rating)}</span>
            <span>(${p.reviewCount})</span>
          </div>
        </div>
      </div>
    </a>`;
}

/* ─────────────────────────────────────────────────────────────
   HOME PAGE
───────────────────────────────────────────────────────────────── */
async function initHomePage() {
  const grid = qs('#featuredGrid');
  if (!grid) return;

  grid.innerHTML = '<p style="color:var(--gray); padding:2rem;">Loading products…</p>';

  const ps = await loadProducts();
  const featured = ps.filter(p => p.featured);

  if (!featured.length) {
    grid.innerHTML = '<p style="color:var(--gray)">No featured products found.</p>';
    return;
  }

  grid.innerHTML = featured.map(productCardHtml).join('');

  // Hero CTA: wire to first featured product
  const heroShopBtn = qs('#heroShopBtn');
  if (heroShopBtn && featured[0]) {
    heroShopBtn.href = `products.html?id=${featured[0].slug}`;
  }
}

/* ─────────────────────────────────────────────────────────────
   PRODUCTS LIST PAGE
───────────────────────────────────────────────────────────────── */
async function initProductsListPage() {
  const grid = qs('#allProductsGrid');
  if (!grid) return;

  grid.innerHTML = '<p style="color:var(--gray); padding:2rem; grid-column:1/-1">Loading…</p>';

  const ps = await loadProducts();
  if (!ps.length) {
    grid.innerHTML = '<p style="grid-column:1/-1; color:var(--gray)">No products found.</p>';
    return;
  }
  grid.innerHTML = ps.map(productCardHtml).join('');
}

/* ─────────────────────────────────────────────────────────────
   PRODUCT DETAIL PAGE
───────────────────────────────────────────────────────────────── */
async function initProductDetailPage() {
  const params = new URLSearchParams(location.search);
  const slug   = params.get('id');
  if (!slug) { redirectToShop(); return; }

  const ps = await loadProducts();
  const p  = ps.find(prod => prod.slug === slug || prod.id === slug);
  if (!p) { redirectToShop(); return; }

  // SEO
  document.title = `${p.name} — PocketDesk`;
  qs('meta[name="description"]')?.setAttribute('content', p.description.slice(0, 160));

  // Breadcrumb
  const bc = qs('#breadcrumb');
  if (bc) bc.innerHTML = `
    <a href="index.html">Home</a>
    <span>›</span>
    <a href="products.html">Shop</a>
    <span>›</span>
    ${p.name}`;

  // Page title elements
  setInnerText('#pdCategory', p.category);
  setInnerText('#pdTitle', p.name);
  setInnerText('#pdTagline', p.tagline);
  setInnerText('#pdDescription', p.description);
  setInnerText('#pdPriceNow', fmtPrice(p.price));
  setInnerText('#pdRatingNum', p.rating.toFixed(1));
  setInnerText('#pdReviewCount', `${p.reviewCount} reviews`);

  const wasEl = qs('#pdPriceWas');
  if (wasEl) {
    if (p.originalPrice) {
      wasEl.textContent = fmtPrice(p.originalPrice);
      wasEl.style.display = '';
      const saveEl = qs('#pdPriceSave');
      if (saveEl) {
        const pct = Math.round((1 - p.price / p.originalPrice) * 100);
        saveEl.textContent = `Save ${pct}%`;
        saveEl.style.display = '';
      }
    } else {
      wasEl.style.display = 'none';
      const saveEl = qs('#pdPriceSave');
      if (saveEl) saveEl.style.display = 'none';
    }
  }

  // Stars
  qs('#pdStars')?.setAttribute('data-rating', p.rating);
  setInnerText('#pdStars', starsHtml(p.rating));

  // Gallery
  const mainImg = qs('#galleryMain');
  const thumbsEl = qs('#galleryThumbs');
  const allImages = p.images?.length ? p.images : [p.image];
  if (mainImg) mainImg.src = allImages[0];

  if (thumbsEl && allImages.length > 1) {
    thumbsEl.innerHTML = allImages.map((src, i) => `
      <div class="gallery__thumb ${i === 0 ? 'active' : ''}"
           onclick="switchGalleryImage(this, '${src}')">
        <img src="${src}" alt="View ${i + 1}"
             onerror="this.src='https://placehold.co/120x120/f5f5f7/86868b?text=${i+1}'">
      </div>`).join('');
  }

  // Colors
  const colorPicker = qs('#colorPicker');
  if (colorPicker && p.colors?.length) {
    colorPicker.innerHTML = `
      <div class="color-picker__label">Color — <span id="selectedColor">${p.colors[0]}</span></div>
      <div class="color-picker__options">
        ${p.colors.map((c, i) => `
          <div class="color-chip ${i === 0 ? 'active' : ''}"
               onclick="selectColor(this, '${c}')">${c}</div>`).join('')}
      </div>`;
  }

  // Features list
  const featList = qs('#pdFeatureList');
  if (featList && p.features?.length) {
    featList.innerHTML = p.features.map(f => `<li>${f}</li>`).join('');
  }

  // Specs table
  const specsTable = qs('#pdSpecsTable');
  if (specsTable && p.specs) {
    specsTable.innerHTML = Object.entries(p.specs).map(([k, v]) =>
      `<tr><td>${k}</td><td>${v}</td></tr>`
    ).join('');
  }

  // In the box
  const inboxList = qs('#pdInBox');
  if (inboxList && p.inBox?.length) {
    inboxList.innerHTML = p.inBox.map(item => `<li>${item}</li>`).join('');
  }

  // Stock state
  const addBtn = qs('#addToCartBtn');
  if (addBtn) {
    if (!p.inStock) {
      addBtn.textContent = 'Out of Stock';
      addBtn.disabled = true;
      addBtn.classList.replace('btn--accent', 'btn--outline');
    } else {
      addBtn.addEventListener('click', () => {
        const color = qs('#selectedColor')?.textContent || (p.colors?.[0] || 'Default');
        cart.add(p.id, color);
      });
    }
  }

  // Reviews
  renderReviews(p);

  // Related products
  const related = ps.filter(x => x.id !== p.id && x.category === p.category).slice(0, 3);
  const relGrid = qs('#relatedGrid');
  if (relGrid) {
    relGrid.innerHTML = related.length
      ? related.map(productCardHtml).join('')
      : '<p style="color:var(--gray); grid-column:1/-1">No related products yet.</p>';
  }
}

function switchGalleryImage(thumb, src) {
  const main = qs('#galleryMain');
  if (main) {
    main.style.opacity = '0';
    setTimeout(() => {
      main.src = src;
      main.style.opacity = '1';
    }, 150);
  }
  qsa('.gallery__thumb').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
}
window.switchGalleryImage = switchGalleryImage;

function selectColor(el, color) {
  qsa('.color-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const label = qs('#selectedColor');
  if (label) label.textContent = color;
}
window.selectColor = selectColor;

function setInnerText(sel, text) {
  const el = qs(sel);
  if (el) el.textContent = text;
}

function redirectToShop() {
  location.href = 'products.html';
}

/* ─────────────────────────────────────────────────────────────
   REVIEWS
───────────────────────────────────────────────────────────────── */
function renderReviews(p) {
  const reviewsSection = qs('#reviewsSection');
  if (!reviewsSection) return;

  // Summary
  const summaryEl = qs('#reviewSummary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="reviews-summary__score">${p.rating.toFixed(1)}</div>
      <div>
        <div class="reviews-summary__stars">${starsHtml(p.rating)}</div>
        <div class="reviews-summary__count">${p.reviewCount} reviews</div>
      </div>`;
  }

  // Cards — seeded from products.json + any localStorage reviews
  const storedKey = `pd_reviews_${p.id}`;
  const userReviews = JSON.parse(localStorage.getItem(storedKey) || '[]');
  const allReviews = [...(p.reviews || []), ...userReviews];

  const grid = qs('#reviewsGrid');
  if (grid) {
    grid.innerHTML = allReviews.map(r => `
      <div class="review-card">
        <div class="review-card__header">
          <div>
            <div class="review-card__author">${r.author}</div>
            <div class="review-card__location">${r.location || ''}</div>
          </div>
          <div style="text-align:right">
            <div class="review-card__stars">${starsHtml(r.rating)}</div>
            <div class="review-card__date">${r.date || ''}</div>
          </div>
        </div>
        <div class="review-card__title">${r.title}</div>
        <div class="review-card__body">${r.body}</div>
      </div>`).join('');
  }

  // Review form
  initReviewForm(p);
}

function initReviewForm(p) {
  const form = qs('#reviewForm');
  if (!form) return;

  // Star picker
  const starInput = qs('#starInput');
  let selectedRating = 0;
  if (starInput) {
    starInput.innerHTML = [1,2,3,4,5].map(n =>
      `<span data-val="${n}" title="${n} star">★</span>`
    ).join('');
    starInput.querySelectorAll('span').forEach(star => {
      star.addEventListener('click', () => {
        selectedRating = Number(star.dataset.val);
        updateStarInput(starInput, selectedRating);
      });
      star.addEventListener('mouseenter', () => {
        updateStarInput(starInput, Number(star.dataset.val));
      });
    });
    starInput.addEventListener('mouseleave', () =>
      updateStarInput(starInput, selectedRating)
    );
  }

  qs('#reviewSubmit')?.addEventListener('click', () => {
    const name   = (qs('#reviewName')?.value || '').trim();
    const title  = (qs('#reviewTitle')?.value || '').trim();
    const body   = (qs('#reviewBody')?.value || '').trim();

    if (!name || !title || !body || selectedRating === 0) {
      toast('Please fill in all fields and select a star rating.', 'error');
      return;
    }

    const review = {
      author:   name,
      location: '',
      rating:   selectedRating,
      date:     new Date().toISOString().slice(0, 10),
      title, body
    };

    const key = `pd_reviews_${p.id}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.unshift(review);
    localStorage.setItem(key, JSON.stringify(existing));

    toast('✓ Review submitted!', 'success');
    renderReviews(p);

    // Clear form
    ['#reviewName','#reviewTitle','#reviewBody'].forEach(sel => {
      const el = qs(sel);
      if (el) el.value = '';
    });
    selectedRating = 0;
    updateStarInput(starInput, 0);
  });
}

function updateStarInput(el, val) {
  if (!el) return;
  el.querySelectorAll('span').forEach(s => {
    s.classList.toggle('lit', Number(s.dataset.val) <= val);
  });
}

/* ─────────────────────────────────────────────────────────────
   TABS
───────────────────────────────────────────────────────────────── */
function initTabs() {
  qsa('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.dataset.panel;
      qsa('.tab-btn').forEach(b => b.classList.remove('active'));
      qsa('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      qs(`#panel-${panel}`)?.classList.add('active');
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   FAQ ACCORDION
───────────────────────────────────────────────────────────────── */
function initFaq() {
  qsa('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-question');
    btn?.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Close all
      qsa('.faq-item').forEach(i => i.classList.remove('open'));
      // Open clicked if wasn't open
      if (!isOpen) item.classList.add('open');
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   NEWSLETTER FORM
───────────────────────────────────────────────────────────────── */
function initNewsletter() {
  qsa('.newsletter__form').forEach(form => {
    const btn = form.querySelector('button');
    btn?.addEventListener('click', () => {
      const input = form.querySelector('.newsletter__input');
      const email = (input?.value || '').trim();
      if (!email || !email.includes('@')) {
        toast('Please enter a valid email address.', 'error');
        return;
      }
      toast('🎉 You\'re subscribed! Welcome to PocketDesk.', 'success');
      if (input) input.value = '';
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   CONTACT FORM
───────────────────────────────────────────────────────────────── */
function initContactForm() {
  const btn = qs('#contactSubmit');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const name    = (qs('#contactName')?.value || '').trim();
    const email   = (qs('#contactEmail')?.value || '').trim();
    const message = (qs('#contactMessage')?.value || '').trim();
    if (!name || !email || !message) {
      toast('Please fill in all fields.', 'error');
      return;
    }
    toast('✓ Message sent! We\'ll reply within 24 hours.', 'success');
    ['#contactName','#contactEmail','#contactSubject','#contactMessage']
      .forEach(sel => { const el = qs(sel); if (el) el.value = ''; });
  });
}

/* ─────────────────────────────────────────────────────────────
   CHECKOUT (placeholder — wire to Stripe or similar)
───────────────────────────────────────────────────────────────── */
window.checkout = function() {
  if (cart.items.length === 0) {
    toast('Your cart is empty.', 'error');
    return;
  }
  toast('Checkout coming soon — connect Stripe or your preferred provider!', 'default');
  /*
    TO INTEGRATE STRIPE:
    1. npm install @stripe/stripe-js  (or use CDN)
    2. const stripe = Stripe('your_publishable_key');
    3. Call your backend to create a CheckoutSession
    4. stripe.redirectToCheckout({ sessionId })
  */
};

/* ─────────────────────────────────────────────────────────────
   ROUTER — detect page and run the right initialiser
───────────────────────────────────────────────────────────────── */
function route() {
  const path = location.pathname.split('/').pop();

  initNav();
  initCart();
  initTabs();
  initFaq();
  initNewsletter();
  initContactForm();

  if (path === '' || path === 'index.html') {
    initHomePage();
  }
  if (path === 'products.html') {
    // If URL has ?id=slug → detail view, otherwise list
    const hasId = new URLSearchParams(location.search).has('id');
    if (hasId) {
      initProductDetailPage();
    } else {
      initProductsListPage();
    }
  }
}

document.addEventListener('DOMContentLoaded', route);
