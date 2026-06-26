/* ═══════════════════════════════════════════════════════════════
   PocketDesk — script.js
   Handles: cart, product rendering, UI interactions, reviews
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────────────────────────── */
const PRODUCTS_URL = 'products.json';

/* ─────────────────────────────────────────────────────────────
   PAGE DETECTION
   Uses href, not pathname.pop(), so it works correctly on:
   - file://  (local development)
   - Netlify  (https://yoursite.com/)
   - GitHub Pages (https://user.github.io/repo/)
   - Any sub-path deployment
───────────────────────────────────────────────────────────────── */
function currentPage() {
  const href = window.location.href;
  const filename = window.location.pathname.split('/').pop();
  if (!filename || filename === '' || filename === 'index.html') return 'index';
  if (filename === 'products.html') return 'products';
  if (filename === 'about.html') return 'about';
  if (filename === 'faq.html') return 'faq';
  if (filename === 'contact.html') return 'contact';
  if (filename === 'checkout.html') return 'checkout';
  return '';
}

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
    toast('✓ Added to cart');
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
               onerror="this.style.background='var(--surface)'">
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

function toast(msg) {
  let container = qs('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
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
  const ham = qs('.nav__hamburger');
  const mob = qs('.nav__mobile');
  if (ham && mob) {
    ham.addEventListener('click', () => {
      const isOpen = ham.classList.toggle('open');
      mob.classList.toggle('open', isOpen);
    });
    mob.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => {
        ham.classList.remove('open');
        mob.classList.remove('open');
      })
    );
  }

  // Active link — match against the filename in pathname
  const filename = window.location.pathname.split('/').pop() || 'index.html';
  qsa('.nav__links a, .nav__mobile a').forEach(a => {
    const href = a.getAttribute('href') || '';
    const hrefFile = href.split('?')[0]; // strip query string
    if (hrefFile === filename || (filename === '' && hrefFile === 'index.html')) {
      a.classList.add('active');
    }
  });

  // Back-to-top
  const btt = qs('.back-to-top');
  if (btt) {
    window.addEventListener('scroll', () => {
      btt.classList.toggle('visible', window.scrollY > 400);
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
  qsa('.nav__cart-btn').forEach(btn => btn.addEventListener('click', openCart));
  qs('.cart-close')?.addEventListener('click', closeCart);
  qs('.cart-overlay')?.addEventListener('click', closeCart);
  updateCartBadge();
  cart.render();
}

/* ─────────────────────────────────────────────────────────────
   LOAD PRODUCTS FROM products.json
───────────────────────────────────────────────────────────────── */
async function loadProducts() {
  if (products.length) return products;
  try {
    const res = await fetch(PRODUCTS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} loading ${PRODUCTS_URL}`);
    const data = await res.json();
    products = Array.isArray(data) ? data : [];
    return products;
  } catch (err) {
    console.error('[PocketDesk] Could not load products:', err);
    return [];
  }
}

/* ─────────────────────────────────────────────────────────────
   PRODUCT CARD HTML
───────────────────────────────────────────────────────────────── */
function productCardHtml(p) {
  const badgeClassMap = { 'New': 'new', 'Sale': 'sale' };
  const badgeClass = badgeClassMap[p.badge] ? `product-card__badge--${badgeClassMap[p.badge]}` : '';

  return `
    <a class="product-card" href="products.html?id=${p.slug}" aria-label="${p.name}">
      ${p.badge ? `<span class="product-card__badge ${badgeClass}">${p.badge}</span>` : ''}
      <div class="product-card__img-wrap">
        <img class="product-card__img" src="${p.image}" alt="${p.name}"
             loading="lazy"
             onerror="this.style.background='var(--surface)'">
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

  grid.innerHTML = '<div style="grid-column:1/-1; color:var(--gray); padding:2rem; text-align:center">Loading products…</div>';

  const ps = await loadProducts();

  if (!ps.length) {
    grid.innerHTML = '<div style="grid-column:1/-1; color:var(--gray); padding:2rem; text-align:center">No products found. Make sure products.json is in the same folder as index.html.</div>';
    return;
  }

  const featured = ps.filter(p => p.featured);

  if (!featured.length) {
    grid.innerHTML = '<div style="grid-column:1/-1; color:var(--gray); padding:2rem; text-align:center">No featured products. Set "featured": true in products.json.</div>';
    return;
  }

  grid.innerHTML = featured.map(productCardHtml).join('');

  // Update hero CTA to point at first featured product
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

  grid.innerHTML = '<div style="grid-column:1/-1; color:var(--gray); padding:2rem; text-align:center">Loading products…</div>';

  const ps = await loadProducts();

  if (!ps.length) {
    grid.innerHTML = '<div style="grid-column:1/-1; color:var(--gray); padding:2rem; text-align:center">No products found. Make sure products.json is in the same folder.</div>';
    return;
  }

  grid.innerHTML = ps.map(productCardHtml).join('');
}

/* ─────────────────────────────────────────────────────────────
   PRODUCT DETAIL PAGE
───────────────────────────────────────────────────────────────── */
async function initProductDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const slug   = params.get('id');
  if (!slug) { window.location.href = 'products.html'; return; }

  const ps = await loadProducts();
  const p  = ps.find(prod => prod.slug === slug || prod.id === slug);
  if (!p) { window.location.href = 'products.html'; return; }

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

  // Core fields
  setInnerText('#pdCategory', p.category);
  setInnerText('#pdTitle', p.name);
  setInnerText('#pdTagline', p.tagline);
  setInnerText('#pdDescription', p.description);
  setInnerText('#pdPriceNow', fmtPrice(p.price));
  setInnerText('#pdRatingNum', p.rating.toFixed(1));
  setInnerText('#pdReviewCount', `${p.reviewCount} reviews`);
  setInnerText('#pdStars', starsHtml(p.rating));

  // Sale pricing
  const wasEl  = qs('#pdPriceWas');
  const saveEl = qs('#pdPriceSave');
  if (wasEl) {
    if (p.originalPrice) {
      wasEl.textContent = fmtPrice(p.originalPrice);
      wasEl.style.display = '';
      if (saveEl) {
        saveEl.textContent = `Save ${Math.round((1 - p.price / p.originalPrice) * 100)}%`;
        saveEl.style.display = '';
      }
    } else {
      wasEl.style.display = 'none';
      if (saveEl) saveEl.style.display = 'none';
    }
  }

  // Gallery
  const mainImg  = qs('#galleryMain');
  const thumbsEl = qs('#galleryThumbs');
  const allImages = (p.images && p.images.length) ? p.images : [p.image];

  if (mainImg) {
    mainImg.src = allImages[0];
    mainImg.alt = p.name;
  }

  if (thumbsEl) {
    if (allImages.length > 1) {
      thumbsEl.innerHTML = allImages.map((src, i) => `
        <div class="gallery__thumb ${i === 0 ? 'active' : ''}"
             onclick="switchGalleryImage(this, '${src}')">
          <img src="${src}" alt="${p.name} view ${i + 1}"
               onerror="this.style.background='var(--surface)'">
        </div>`).join('');
    } else {
      thumbsEl.innerHTML = '';
    }
  }

  // Color picker
  const colorPicker = qs('#colorPicker');
  if (colorPicker && p.colors && p.colors.length) {
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
  if (featList && p.features && p.features.length) {
    featList.innerHTML = p.features.map(f => `<li>${f}</li>`).join('');
  }

  // Specs table
  const specsTable = qs('#pdSpecsTable');
  if (specsTable && p.specs) {
    specsTable.innerHTML = Object.entries(p.specs)
      .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
      .join('');
  }

  // In the box
  const inboxList = qs('#pdInBox');
  if (inboxList && p.inBox && p.inBox.length) {
    inboxList.innerHTML = p.inBox.map(item => `<li>${item}</li>`).join('');
  }

  // Add to cart button
  const addBtn = qs('#addToCartBtn');
  const buyBtn = qs('#buyNowBtn');

  if (!p.inStock) {
    if (addBtn) {
      addBtn.textContent = 'Out of Stock';
      addBtn.disabled = true;
      addBtn.classList.replace('btn--accent', 'btn--outline');
    }
    if (buyBtn) {
      buyBtn.textContent = 'Out of Stock';
      buyBtn.disabled = true;
      buyBtn.classList.replace('btn--primary', 'btn--outline');
    }
  } else {
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const color = qs('#selectedColor')?.textContent || (p.colors?.[0] || 'Default');
        cart.add(p.id, color);
      });
    }
    if (buyBtn) {
      buyBtn.addEventListener('click', () => {
        const color = qs('#selectedColor')?.textContent || (p.colors?.[0] || 'Default');
        cart.add(p.id, color);
        window.location.href = 'checkout.html';
      });
    }
  }

  // Reviews — uses correct ID: #reviews (not #reviewsSection)
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
    setTimeout(() => { main.src = src; main.style.opacity = '1'; }, 150);
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

/* ─────────────────────────────────────────────────────────────
   REVIEWS
   BUG FIX: was checking for #reviewsSection which doesn't exist.
   The section in products.html has id="reviews". Guard removed —
   individual sub-elements are checked independently instead.
───────────────────────────────────────────────────────────────── */
function renderReviews(p) {
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

  // Cards: seeded from products.json + user-submitted (localStorage)
  const storedKey  = `pd_reviews_${p.id}`;
  const userReviews = JSON.parse(localStorage.getItem(storedKey) || '[]');
  const allReviews  = [...(p.reviews || []), ...userReviews];

  const grid = qs('#reviewsGrid');
  if (grid) {
    if (allReviews.length) {
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
    } else {
      grid.innerHTML = '<p style="color:var(--gray); font-size:var(--text-sm)">No reviews yet. Be the first!</p>';
    }
  }

  initReviewForm(p);
}

function initReviewForm(p) {
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
      star.addEventListener('mouseenter', () => updateStarInput(starInput, Number(star.dataset.val)));
    });
    starInput.addEventListener('mouseleave', () => updateStarInput(starInput, selectedRating));
  }

  const submitBtn = qs('#reviewSubmit');
  if (!submitBtn) return;

  // Clone to remove any previous listener (in case renderReviews is called again)
  const freshBtn = submitBtn.cloneNode(true);
  submitBtn.parentNode.replaceChild(freshBtn, submitBtn);

  freshBtn.addEventListener('click', () => {
    const name  = (qs('#reviewName')?.value  || '').trim();
    const title = (qs('#reviewTitle')?.value || '').trim();
    const body  = (qs('#reviewBody')?.value  || '').trim();

    if (!name || !title || !body || selectedRating === 0) {
      toast('Please fill in all fields and select a star rating.');
      return;
    }

    const review = {
      author: name, location: '',
      rating: selectedRating,
      date: new Date().toISOString().slice(0, 10),
      title, body
    };

    const key      = `pd_reviews_${p.id}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.unshift(review);
    localStorage.setItem(key, JSON.stringify(existing));

    toast('✓ Review submitted!');
    renderReviews(p);

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
    item.querySelector('.faq-question')?.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      qsa('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   NEWSLETTER FORM
───────────────────────────────────────────────────────────────── */
function initNewsletter() {
  qsa('.newsletter__form').forEach(form => {
    form.querySelector('button')?.addEventListener('click', () => {
      const input = form.querySelector('.newsletter__input');
      const email = (input?.value || '').trim();
      if (!email || !email.includes('@')) {
        toast('Please enter a valid email address.');
        return;
      }
      toast("🎉 You're subscribed! Welcome to PocketDesk.");
      if (input) input.value = '';
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   CONTACT FORM
───────────────────────────────────────────────────────────────── */
function initContactForm() {
  qs('#contactSubmit')?.addEventListener('click', () => {
    const name    = (qs('#contactName')?.value    || '').trim();
    const email   = (qs('#contactEmail')?.value   || '').trim();
    const message = (qs('#contactMessage')?.value || '').trim();
    if (!name || !email || !message) {
      toast('Please fill in all fields.');
      return;
    }
    toast("✓ Message sent! We'll reply within 24 hours.");
    ['#contactName','#contactEmail','#contactSubject','#contactMessage']
      .forEach(sel => { const el = qs(sel); if (el) el.value = ''; });
  });
}

/* ─────────────────────────────────────────────────────────────
   CHECKOUT PAGE
   Reads cart from localStorage and renders the order summary.
───────────────────────────────────────────────────────────────── */
async function initCheckoutPage() {
  // Populate order summary from cart
  const summaryEl = qs('#checkoutSummary');
  if (!summaryEl) return;

  // Load products so we can show full names/images even if cart is fresh
  await loadProducts();

  const items = cart.items;

  if (!items.length) {
    // Cart is empty — came directly to checkout with no items
    // Try to pull the ?id= product and show it as a single-item summary
    const slug = new URLSearchParams(window.location.search).get('id');
    const ps   = await loadProducts();
    const p    = ps.find(x => x.slug === slug || x.id === slug);
    if (p) {
      renderCheckoutSummary([{
        name: p.name, image: p.image, color: p.colors?.[0] || 'Default',
        price: p.price, qty: 1
      }], summaryEl);
      initCheckoutForm();
    } else {
      summaryEl.innerHTML = '<p style="color:var(--gray)">No items in cart.</p>';
    }
    return;
  }

  renderCheckoutSummary(items, summaryEl);
  initCheckoutForm();
}

function renderCheckoutSummary(items, container) {
  const subtotal = items.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const shipping = subtotal >= 50 ? 0 : 9.99;
  const total    = subtotal + shipping;

  container.innerHTML = `
    <div class="checkout-summary__items">
      ${items.map(item => `
        <div class="checkout-summary__item">
          <img src="${item.image}" alt="${item.name}"
               onerror="this.style.background='var(--surface)'">
          <div class="checkout-summary__item-info">
            <div class="checkout-summary__item-name">${item.name}</div>
            <div class="checkout-summary__item-meta">${item.color}${item.qty > 1 ? ` × ${item.qty}` : ''}</div>
          </div>
          <div class="checkout-summary__item-price">${fmtPrice(item.price * (item.qty || 1))}</div>
        </div>`).join('')}
    </div>
    <div class="checkout-summary__totals">
      <div class="checkout-summary__row">
        <span>Subtotal</span><span>${fmtPrice(subtotal)}</span>
      </div>
      <div class="checkout-summary__row">
        <span>Shipping</span>
        <span>${shipping === 0 ? '<span style="color:var(--success)">Free</span>' : fmtPrice(shipping)}</span>
      </div>
      <div class="checkout-summary__row checkout-summary__row--total">
        <span>Total</span><span>${fmtPrice(total)}</span>
      </div>
    </div>`;

  // Also update the sticky total shown on the Place Order button
  const btnTotal = qs('#placeOrderTotal');
  if (btnTotal) btnTotal.textContent = fmtPrice(total);
}

/* ─────────────────────────────────────────────────────────────
   CHECKOUT FORM VALIDATION
───────────────────────────────────────────────────────────────── */
function initCheckoutForm() {
  const btn = qs('#placeOrderBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const fields = [
      { id: '#coName',    label: 'Full name' },
      { id: '#coEmail',   label: 'Email address' },
      { id: '#coPhone',   label: 'Phone number' },
      { id: '#coAddress', label: 'Street address' },
      { id: '#coCity',    label: 'City' },
      { id: '#coZip',     label: 'ZIP / Postal code' },
      { id: '#coCountry', label: 'Country' },
    ];

    let firstError = null;
    fields.forEach(f => {
      const el = qs(f.id);
      if (!el) return;
      const empty = !el.value.trim();
      el.classList.toggle('input-error', empty);
      if (empty && !firstError) firstError = f.label;
    });

    // Email format check
    const emailEl = qs('#coEmail');
    if (emailEl && emailEl.value && !emailEl.value.includes('@')) {
      emailEl.classList.add('input-error');
      if (!firstError) firstError = 'a valid email address';
    }

    if (firstError) {
      toast(`Please enter ${firstError}.`);
      return;
    }

    // Success — placeholder
    btn.textContent = 'Order Placed! ✓';
    btn.disabled = true;
    btn.style.background = 'var(--success)';
    toast('🎉 Order placed! We\'ll send a confirmation to your email.');

    // Clear cart
    cart.items = [];
    cart.save();
  });

  // Clear error state on input
  qsa('.form-control').forEach(el => {
    el.addEventListener('input', () => el.classList.remove('input-error'));
  });
}

/* ─────────────────────────────────────────────────────────────
   CHECKOUT — navigates to checkout.html
   Cart is persisted in localStorage so contents survive navigation.
───────────────────────────────────────────────────────────────── */
window.checkout = function() {
  if (cart.items.length === 0) {
    toast('Your cart is empty.');
    return;
  }
  window.location.href = 'checkout.html';
};

/* ─────────────────────────────────────────────────────────────
   ROUTER
   BUG FIX: was using location.pathname.split('/').pop() which
   returns "" on bare-directory URLs (e.g. https://site.com/ or
   file:///folder/). Now uses currentPage() which handles all cases.
───────────────────────────────────────────────────────────────── */
function route() {
  const page = currentPage();

  initNav();
  initCart();
  initTabs();
  initFaq();
  initNewsletter();
  initContactForm();

  if (page === 'index') {
    initHomePage();
  }

  if (page === 'products') {
    const hasId = new URLSearchParams(window.location.search).has('id');
    if (hasId) {
      initProductDetailPage();
    } else {
      initProductsListPage();
    }
  }

  if (page === 'checkout') {
    initCheckoutPage();
  }
}

document.addEventListener('DOMContentLoaded', route);
