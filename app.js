/* ============================================================
   QR Digital Menu — app.js
   Everything here reads from config.json. No build step needed.
   ============================================================ */

const state = {
  config: null,
  table: null,
  activeFilter: 'all',   // all | veg | nonveg
  cart: {},              // { dishId: qty }
};

const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <rect width="200" height="200" fill="#12213f"/>
      <text x="50%" y="50%" fill="#a9b3cc" font-family="sans-serif" font-size="14"
        text-anchor="middle" dominant-baseline="middle">No image</text>
    </svg>`);

init();

async function init() {
  try {
    const res = await fetch('config.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('config.json not found');
    state.config = await res.json();
  } catch (err) {
    renderFatalError();
    console.error(err);
    return;
  }

  state.table = detectTable();

  renderHeader();
  renderFestivalBanner();
  renderCategoryNav();
  renderMenu();
  bindGlobalEvents();
  updateCartBar();
}

/* ---------------- Table detection ---------------- */

function detectTable() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('table') || params.get('t');
  return raw && raw.trim() ? raw.trim() : null;
}

/* ---------------- Rendering: header ---------------- */

function renderHeader() {
  const { cafeDetails } = state.config;

  const logo = document.getElementById('cafeLogo');
  logo.src = cafeDetails.logoUrl || PLACEHOLDER_IMG;
  logo.alt = cafeDetails.name || 'Cafe logo';
  logo.onerror = () => { logo.src = PLACEHOLDER_IMG; };

  document.getElementById('cafeName').textContent = cafeDetails.name || 'Digital Menu';
  document.getElementById('cafeTagline').textContent = cafeDetails.tagline || '';
  document.getElementById('cafeHours').textContent = cafeDetails.hours || '';

  document.getElementById('tableValue').textContent = state.table || 'Takeaway';
  document.title = cafeDetails.name ? `${cafeDetails.name} — Menu` : 'Digital Menu';

  if (cafeDetails.themeColor) {
    document.documentElement.style.setProperty('--navy-900', cafeDetails.themeColor);
  }
  if (cafeDetails.accentColor) {
    document.documentElement.style.setProperty('--gold', cafeDetails.accentColor);
  }
}

/* ---------------- Rendering: festival banner ---------------- */

function renderFestivalBanner() {
  const offer = state.config.festivalOffer;
  const el = document.getElementById('festivalBanner');
  if (!offer || !offer.isActive) {
    el.hidden = true;
    return;
  }
  document.getElementById('festivalBadge').textContent = offer.badge || 'OFFER';
  document.getElementById('festivalHeadline').textContent = offer.headline || '';
  document.getElementById('festivalSubtext').textContent = offer.subtext || '';
  el.hidden = false;
}

/* ---------------- Rendering: category nav ---------------- */

function renderCategoryNav() {
  const nav = document.getElementById('categoryNav');
  const categories = state.config.categories && state.config.categories.length
    ? state.config.categories
    : ['All', ...uniqueCategoriesFromMenu()];

  nav.innerHTML = '';
  categories.forEach((cat, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cat-pill' + (i === 0 ? ' active' : '');
    btn.textContent = cat;
    btn.dataset.category = cat;
    btn.addEventListener('click', () => {
      setActiveCategoryPill(cat);
      const target = document.getElementById(sectionId(cat));
      if (target) {
        const offset = target.getBoundingClientRect().top + window.scrollY - 112;
        window.scrollTo({ top: offset, behavior: 'smooth' });
      }
    });
    nav.appendChild(btn);
  });
}

function uniqueCategoriesFromMenu() {
  const set = new Set((state.config.menu || []).map(d => d.category));
  return Array.from(set);
}

function setActiveCategoryPill(cat) {
  document.querySelectorAll('.cat-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.category === cat);
  });
}

function sectionId(cat) {
  return 'section-' + cat.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/* ---------------- Rendering: menu ---------------- */

function renderMenu() {
  const container = document.getElementById('menuSections');
  const emptyState = document.getElementById('emptyState');
  container.innerHTML = '';

  const menu = state.config.menu || [];
  const filtered = menu.filter(matchesFilter);

  if (!filtered.length) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  const categories = state.config.categories
    ? state.config.categories.filter(c => c !== 'All')
    : uniqueCategoriesFromMenu();

  categories.forEach(cat => {
    const items = filtered.filter(d => d.category === cat);
    if (!items.length) return;

    const section = document.createElement('section');
    section.className = 'menu-section';
    section.id = sectionId(cat);

    const title = document.createElement('h2');
    title.className = 'menu-section-title';
    title.textContent = cat;
    section.appendChild(title);

    items.forEach(dish => section.appendChild(renderDishRow(dish)));
    container.appendChild(section);
  });
}

function matchesFilter(dish) {
  if (state.activeFilter === 'veg') return dish.isVeg;
  if (state.activeFilter === 'nonveg') return !dish.isVeg;
  return true;
}

function renderDishRow(dish) {
  const row = document.createElement('div');
  row.className = 'dish-row';

  const img = document.createElement('img');
  img.className = 'dish-thumb';
  img.loading = 'lazy';
  img.src = dish.imageUrl || PLACEHOLDER_IMG;
  img.alt = dish.name;
  img.onerror = () => { img.src = PLACEHOLDER_IMG; };
  row.appendChild(img);

  const info = document.createElement('div');
  info.className = 'dish-info';

  const nameRow = document.createElement('div');
  nameRow.className = 'dish-name-row';
  nameRow.innerHTML = `<span class="dot ${dish.isVeg ? 'dot-veg' : 'dot-nonveg'}"></span>`;
  const nameEl = document.createElement('p');
  nameEl.className = 'dish-name';
  nameEl.textContent = dish.name;
  nameRow.appendChild(nameEl);
  info.appendChild(nameRow);

  if (dish.description) {
    const desc = document.createElement('p');
    desc.className = 'dish-desc';
    desc.textContent = dish.description;
    info.appendChild(desc);
  }

  const bottom = document.createElement('div');
  bottom.className = 'dish-bottom';

  const price = document.createElement('span');
  price.className = 'dish-price';
  price.textContent = formatCurrency(dish.price);
  bottom.appendChild(price);

  if (dish.isAvailable === false) {
    const unavailable = document.createElement('span');
    unavailable.className = 'dish-unavailable';
    unavailable.textContent = 'Out of stock';
    bottom.appendChild(unavailable);
  } else {
    bottom.appendChild(renderCartControl(dish));
  }

  info.appendChild(bottom);
  row.appendChild(info);
  return row;
}

function renderCartControl(dish) {
  const qty = state.cart[dish.id] || 0;
  const wrap = document.createElement('div');

  if (qty === 0) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'add-btn';
    btn.textContent = 'Add';
    btn.addEventListener('click', () => changeQty(dish.id, 1));
    wrap.appendChild(btn);
    return wrap;
  }

  const stepper = document.createElement('div');
  stepper.className = 'qty-stepper';

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.textContent = '−';
  minus.setAttribute('aria-label', `Remove one ${dish.name}`);
  minus.addEventListener('click', () => changeQty(dish.id, -1));

  const qtyLabel = document.createElement('span');
  qtyLabel.textContent = qty;

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.textContent = '+';
  plus.setAttribute('aria-label', `Add one more ${dish.name}`);
  plus.addEventListener('click', () => changeQty(dish.id, 1));

  stepper.appendChild(minus);
  stepper.appendChild(qtyLabel);
  stepper.appendChild(plus);
  wrap.appendChild(stepper);
  return wrap;
}

function changeQty(dishId, delta) {
  const current = state.cart[dishId] || 0;
  const next = Math.max(0, current + delta);
  if (next === 0) {
    delete state.cart[dishId];
  } else {
    state.cart[dishId] = next;
  }
  renderMenu();
  updateCartBar();
  if (document.getElementById('cartDrawer').hidden === false) {
    renderCartDrawer();
  }
}

function formatCurrency(amount) {
  const symbol = (state.config.cafeDetails && state.config.cafeDetails.currencySymbol) || '₹';
  return symbol + Number(amount).toLocaleString('en-IN');
}

/* ---------------- Cart bar + drawer ---------------- */

function cartEntries() {
  const menuById = {};
  (state.config.menu || []).forEach(d => { menuById[d.id] = d; });
  return Object.entries(state.cart)
    .map(([id, qty]) => ({ dish: menuById[id], qty }))
    .filter(e => e.dish);
}

function cartTotal() {
  return cartEntries().reduce((sum, e) => sum + e.dish.price * e.qty, 0);
}

function cartCount() {
  return cartEntries().reduce((sum, e) => sum + e.qty, 0);
}

function updateCartBar() {
  const bar = document.getElementById('cartBar');
  const count = cartCount();
  if (count === 0) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  document.getElementById('cartBarCount').textContent = count;
  document.getElementById('cartBarTotal').textContent = formatCurrency(cartTotal());
}

function renderCartDrawer() {
  const list = document.getElementById('cartItems');
  list.innerHTML = '';
  const entries = cartEntries();

  entries.forEach(({ dish, qty }) => {
    const row = document.createElement('div');
    row.className = 'cart-item';

    const stepper = document.createElement('div');
    stepper.className = 'qty-stepper';
    stepper.innerHTML = `
      <button type="button" aria-label="Remove one ${dish.name}">−</button>
      <span>${qty}</span>
      <button type="button" aria-label="Add one more ${dish.name}">+</button>
    `;
    const [minusBtn, , plusBtn] = stepper.children;
    minusBtn.addEventListener('click', () => changeQty(dish.id, -1));
    plusBtn.addEventListener('click', () => changeQty(dish.id, 1));

    const name = document.createElement('span');
    name.className = 'cart-item-name';
    name.textContent = dish.name;

    const price = document.createElement('span');
    price.className = 'cart-item-price';
    price.textContent = formatCurrency(dish.price * qty);

    row.appendChild(stepper);
    row.appendChild(name);
    row.appendChild(price);
    list.appendChild(row);
  });

  document.getElementById('cartSubtotal').textContent = formatCurrency(cartTotal());
}

function openCartDrawer() {
  if (cartCount() === 0) return;
  renderCartDrawer();
  document.getElementById('cartOverlay').hidden = false;
  document.getElementById('cartDrawer').hidden = false;
}

function closeCartDrawer() {
  document.getElementById('cartOverlay').hidden = true;
  document.getElementById('cartDrawer').hidden = true;
}

/* ---------------- Checkout ---------------- */

function bindGlobalEvents() {
  document.querySelectorAll('.veg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeFilter = btn.dataset.filter;
      document.querySelectorAll('.veg-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderMenu();
    });
  });

  document.getElementById('cartBar').addEventListener('click', openCartDrawer);
  document.getElementById('closeCart').addEventListener('click', closeCartDrawer);
  document.getElementById('cartOverlay').addEventListener('click', closeCartDrawer);

  const phoneInput = document.getElementById('custPhone');
  phoneInput.addEventListener('input', () => {
    phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
  });

  document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);
}

async function handleCheckout(e) {
  e.preventDefault();

  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const phoneError = document.getElementById('phoneError');
  const submitBtn = document.getElementById('placeOrderBtn');

  if (!/^\d{10}$/.test(phone)) {
    phoneError.hidden = false;
    return;
  }
  phoneError.hidden = true;

  const entries = cartEntries();
  if (!entries.length) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Placing order…';

  const total = cartTotal();
  const payload = {
    timestamp: new Date().toISOString(),
    name,
    phone,
    table: state.table || 'Takeaway / Counter',
    items: entries.map(e => `${e.dish.name} x${e.qty}`).join(', '),
    itemsBreakdown: entries.map(e => ({
      name: e.dish.name,
      qty: e.qty,
      price: e.dish.price,
      lineTotal: e.dish.price * e.qty,
    })),
    total,
  };

  // Fire-and-forget log to Google Sheets via Apps Script webhook.
  const webhookUrl = state.config.cafeDetails && state.config.cafeDetails.sheetWebhookUrl;
  if (webhookUrl) {
    try {
      // No custom headers here on purpose: combined with mode:'no-cors',
      // an explicit Content-Type can cause some browsers to silently drop
      // the request. Apps Script reads the raw body text either way.
      fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('Webhook log failed (order still proceeds):', err);
    }
  }

  const waNumber = (state.config.cafeDetails && state.config.cafeDetails.whatsappPhone) || '';
  const message = buildWhatsAppMessage(payload, entries);
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

  // Give the fire-and-forget fetch a brief head start before navigating away.
  setTimeout(() => {
    window.location.href = waUrl;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm & place order on WhatsApp';
  }, 150);
}

function buildWhatsAppMessage(payload, entries) {
  const lines = [];
  lines.push(`*New Order — ${state.config.cafeDetails.name || ''}*`);
  lines.push(`Table: ${payload.table}`);
  lines.push(`Name: ${payload.name}`);
  lines.push(`Phone: ${payload.phone}`);
  lines.push('');
  lines.push('*Items*');
  entries.forEach(e => {
    lines.push(`- ${e.dish.name} x${e.qty} — ${formatCurrency(e.dish.price * e.qty)}`);
  });
  lines.push('');
  lines.push(`*Total: ${formatCurrency(payload.total)}*`);
  return lines.join('\n');
}

/* ---------------- Errors ---------------- */

function renderFatalError() {
  document.getElementById('app').innerHTML = `
    <div style="padding:40px 20px;text-align:center;color:#a9b3cc;">
      <p style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;color:#f4efe4;font-size:16px;margin-bottom:8px;">
        Menu unavailable
      </p>
      <p style="font-size:13.5px;">Couldn't load config.json. Check that the file exists next to index.html.</p>
    </div>
  `;
}
