// Каталог, переклади й кошик зберігаються у простих JSON-файлах/localStorage.
const PRODUCTS_FILE = "data/products.json";
const TRANSLATIONS_FILE = "data/translations.json";
const CART_KEY = "grimbart-cart";

let shopData;
let translations;
let language = "uk";

function makeElement(tagName, className = "", text = "") {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== "") element.textContent = text;
  return element;
}

function t(key) {
  return translations[language][key] || translations.uk[key] || key;
}

// Мова інтерфейсу перемикається з JSON, а назви й описи товарів — з каталогу.
function applyTranslations() {
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
    element.alt = t(element.dataset.i18nAlt);
  });
}

function productText(product) {
  const translated = language === "uk"
    ? {
        name: product.name,
        category: product.category,
        description: product.description,
        imageAlt: product.imageAlt,
        details: product.translationsUk.details,
        variants: product.translationsUk.variants
      }
    : product.translations[language];
  return { ...product, ...translated };
}

function formatPrice(amount) {
  const number = new Intl.NumberFormat(language).format(amount);
  return `${number} ${t("currency")}`;
}

// Play the WAV assigned to a coupon. A simple synthesized fallback remains for older coupons.
function playCouponSound(coupon) {
  if (coupon.soundFile) {
    const audio = new Audio(coupon.soundFile);
    audio.volume = 0.7;
    audio.play().catch(() => {});
    return;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const settings = {
    brass: [660, 880, 0.08],
    steam: [180, 95, 0.16],
    forge: [110, 55, 0.22]
  };
  const [from, to, duration] = settings[coupon.sound] || settings.forge;
  oscillator.type = coupon.sound === "steam" ? "triangle" : "square";
  oscillator.frequency.setValueAtTime(from, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(to, context.currentTime + duration);
  gain.gain.setValueAtTime(0.045, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.querySelector("#cart-count");
  if (!badge) return;
  const count = getCart().reduce((total, item) => total + item.quantity, 0);
  badge.textContent = String(count);
  badge.hidden = count === 0;
  badge.setAttribute("aria-label", `${t("cart")}: ${count}`);
}

// Спільна навігація містить лише іконку теми, перемикач мов і лічильник кошика.
function addSharedNavigation() {
  const currentPage = document.body.dataset.page;
  const header = document.querySelector("#site-header");
  const footer = document.querySelector("#site-footer");

  header.innerHTML = `
    <nav class="navbar navbar-expand-md site-navbar" data-i18n-aria-label="mainNavigation">
      <div class="container">
        <a class="navbar-brand" href="index.html">
          <span class="brand-mark" aria-hidden="true">G</span>
          <span>Grimbart <span class="brand-light">Schmiede</span></span>
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse"
          data-bs-target="#main-navigation" aria-controls="main-navigation"
          aria-expanded="false" data-i18n-aria-label="openMenu">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="main-navigation">
          <ul class="navbar-nav ms-auto">
            <li class="nav-item"><a class="nav-link ${currentPage === "home" ? "active" : ""}" href="index.html" data-i18n="home"></a></li>
            <li class="nav-item"><a class="nav-link ${currentPage === "catalog" ? "active" : ""}" href="catalog.html" data-i18n="catalog"></a></li>
            <li class="nav-item"><a class="nav-link cart-nav-link ${currentPage === "cart" ? "active" : ""}" href="cart.html">
              <span data-i18n="cart"></span> <span class="cart-count" id="cart-count" hidden></span>
            </a></li>
            <li class="nav-item language-item">
              <label class="visually-hidden" for="language-select" data-i18n="languageSelect"></label>
              <select id="language-select" class="form-select form-select-sm language-select" data-i18n-aria-label="languageSelect">
                <option value="uk">Українська</option><option value="en">English</option><option value="de">Deutsch</option>
              </select>
            </li>
            <li class="nav-item theme-item">
              <button class="theme-toggle" id="theme-toggle" type="button" aria-label="Change theme" title="Change theme"></button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `;

  footer.innerHTML = `
    <footer class="site-footer">
      <div class="container d-flex flex-wrap justify-content-between align-items-center gap-2">
        <a class="footer-brand" href="index.html">Grimbart Schmiede</a>
        <p class="mb-0" data-i18n="footer"></p>
      </div>
    </footer>
  `;

  const languageSelect = document.querySelector("#language-select");
  languageSelect.value = language;
  languageSelect.addEventListener("change", () => {
    localStorage.setItem("grimbart-language", languageSelect.value);
    window.location.reload();
  });
  updateCartBadge();
}

function setupTheme() {
  const button = document.querySelector("#theme-toggle");
  const setTheme = (theme) => {
    document.documentElement.setAttribute("data-bs-theme", theme);
    button.textContent = theme === "dark" ? "☼" : "☾";
    button.setAttribute("aria-label", t("themeLabel"));
    button.title = t("themeLabel");
    button.setAttribute("aria-pressed", String(theme === "dark"));
  };

  setTheme(localStorage.getItem("grimbart-theme") === "dark" ? "dark" : "light");
  button.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.bsTheme === "dark" ? "light" : "dark";
    localStorage.setItem("grimbart-theme", nextTheme);
    setTheme(nextTheme);
  });
}

async function loadData() {
  const cacheVersion = "20261119";
  const [productsResponse, translationsResponse] = await Promise.all([
    fetch(`${PRODUCTS_FILE}?v=${cacheVersion}`),
    fetch(`${TRANSLATIONS_FILE}?v=${cacheVersion}`)
  ]);
  if (!productsResponse.ok || !translationsResponse.ok) {
    throw new Error("Could not load product or translation JSON.");
  }

  shopData = await productsResponse.json();
  translations = await translationsResponse.json();
  if (!Array.isArray(shopData.products) || !translations.uk || !translations.en || !translations.de) {
    throw new Error("Product or translation JSON has an invalid format.");
  }
}

function makeProductCard(sourceProduct) {
  const product = productText(sourceProduct);
  const column = makeElement("div", "col-12 col-sm-6 col-xl-4");
  const card = makeElement("article", "product-card h-100");
  const imageLink = makeElement("a", "product-image-link");
  const image = makeElement("img", "product-card-image");
  image.src = product.image;
  image.alt = product.imageAlt;
  image.loading = "lazy";
  imageLink.href = `product.html?id=${encodeURIComponent(product.id)}`;
  imageLink.append(image);

  const body = makeElement("div", "product-card-body");
  const category = makeElement("p", "product-category", product.category);
  const heading = makeElement("h2", "product-title");
  const title = makeElement("a", "text-decoration-none", product.name);
  const description = makeElement("p", "product-description", product.description);
  const price = makeElement("p", "product-price", formatPrice(product.price));
  const details = makeElement("a", "btn btn-outline-primary product-link", t("details"));
  title.href = details.href = imageLink.href;
  heading.append(title);
  body.append(category, heading, description, price, details);
  card.append(imageLink, body);
  column.append(card);
  return column;
}

function showProducts(container, products) {
  container.replaceChildren(...products.map(makeProductCard));
}

function showFeaturedProducts() {
  const products = [...shopData.products]
    .sort((first, second) => second.popular - first.popular)
    .slice(0, 3);
  showProducts(document.querySelector("#featured-products"), products);
}

function fillCategoryFilter(select) {
  const categories = [...new Set(shopData.products.map((product) => productText(product).category))];
  for (const [index, category] of categories.entries()) {
    const option = makeElement("option", "", category);
    option.value = shopData.products
      .map((product) => productText(product))
      .filter((product) => product.category === category)
      .map((product) => product.id)
      .join(",");
    option.dataset.categoryIndex = String(index);
    select.append(option);
  }
}

function setupCatalog() {
  const categoryFilter = document.querySelector("#category-filter");
  const priceFilter = document.querySelector("#price-filter");
  const sortFilter = document.querySelector("#sort-filter");
  const productList = document.querySelector("#product-list");
  const resultCount = document.querySelector("#result-count");
  fillCategoryFilter(categoryFilter);

  function updateCatalog() {
    const categoryProductIds = categoryFilter.value ? categoryFilter.value.split(",") : [];
    const maximumPrice = priceFilter.value === "" ? null : Number(priceFilter.value);
    let visible = shopData.products.filter((product) => {
      const matchesCategory = !categoryProductIds.length || categoryProductIds.includes(product.id);
      return matchesCategory && (maximumPrice === null || product.price <= maximumPrice);
    });

    if (sortFilter.value === "price-asc") visible.sort((a, b) => a.price - b.price);
    else if (sortFilter.value === "price-desc") visible.sort((a, b) => b.price - a.price);
    else if (sortFilter.value === "name") {
      visible.sort((a, b) => productText(a).name.localeCompare(productText(b).name, language));
    } else visible.sort((a, b) => b.popular - a.popular);

    showProducts(productList, visible);
    resultCount.textContent = `${t("found")}: ${visible.length}`;
    if (visible.length === 0) {
      productList.append(makeElement("p", "col-12 text-secondary", t("noResults")));
    }
  }

  categoryFilter.addEventListener("change", updateCatalog);
  priceFilter.addEventListener("input", updateCatalog);
  sortFilter.addEventListener("change", updateCatalog);
  document.querySelector("#reset-filters").addEventListener("click", () => {
    categoryFilter.value = "";
    priceFilter.value = "";
    sortFilter.value = "popular";
    updateCatalog();
  });
  updateCatalog();
}

function getVariant(product, id) {
  return productText(product).variants.find((variant) => variant.id === id);
}

function linePrice(product, item) {
  const variant = getVariant(product, item.variantId);
  return (product.price + variant.adjustment + (item.warranty ? product.warrantyPrice : 0)) * item.quantity;
}

function updateProductPrice(product, variantSelect, quantityInput, warrantyInput, output) {
  const variant = getVariant(product, variantSelect.value);
  const amount = product.price + variant.adjustment +
    (warrantyInput.checked ? product.warrantyPrice : 0);
  output.textContent = formatPrice(amount * Number(quantityInput.value || 1));
}

function showProductDetail() {
  const product = shopData.products.find((item) =>
    item.id === new URLSearchParams(window.location.search).get("id")
  );
  const container = document.querySelector("#product-detail");
  if (!product) {
    container.replaceChildren(makeElement("div", "alert alert-warning", t("productNotFound")));
    return;
  }

  const localized = productText(product);
  document.title = `${localized.name} — Grimbart Schmiede`;
  document.querySelector("#product-breadcrumb").textContent = localized.name;

  const article = makeElement("article", "row g-4 product-detail-layout");
  // The gallery uses every available product image and keeps the main view easy to change.
  const imageColumn = makeElement("div", "col-12 col-lg-5 product-gallery");
  const image = makeElement("img", "product-detail-image");
  const photos = product.images && product.images.length ? product.images : [product.image];
  image.src = photos[0];
  image.alt = localized.imageAlt;
  imageColumn.append(image);
  if (photos.length > 1) {
    const thumbnails = makeElement("div", "product-gallery-thumbnails");
    photos.forEach((photo, index) => {
      const button = makeElement("button", `product-gallery-thumb${index === 0 ? " is-active" : ""}`);
      button.type = "button";
      const thumb = makeElement("img");
      thumb.src = photo;
      thumb.alt = `${localized.imageAlt} ${index + 1}`;
      button.append(thumb);
      button.addEventListener("click", () => {
        image.src = photo;
        thumbnails.querySelectorAll(".product-gallery-thumb").forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");
      });
      thumbnails.append(button);
    });
    imageColumn.append(thumbnails);
  }

  const content = makeElement("div", "col-12 col-lg-7 product-detail-card");
  content.append(
    makeElement("p", "product-category", localized.category),
    makeElement("h1", "mb-3", localized.name),
    makeElement("p", "lead product-description", localized.description),
    makeElement("p", "product-long-description", localized.details)
  );

  const form = makeElement("div", "product-options");
  const variantLabel = makeElement("label", "form-label", t("variant"));
  const variantSelect = makeElement("select", "form-select");
  variantSelect.setAttribute("aria-label", t("variant"));
  for (const variant of localized.variants) {
    const option = makeElement("option", "", `${variant.label} (${formatPrice(product.price + variant.adjustment)})`);
    option.value = variant.id;
    variantSelect.append(option);
  }
  const quantityLabel = makeElement("label", "form-label", t("quantity"));
  const quantity = makeElement("input", "form-control quantity-input");
  quantity.type = "number";
  quantity.min = "1";
  quantity.max = "20";
  quantity.value = "1";
  quantityLabel.append(quantity);

  const warrantyLabel = makeElement("label", "warranty-option");
  const warranty = makeElement("input");
  warranty.type = "checkbox";
  const warrantyText = makeElement("span", "", `${t("extendedWarranty")} (+${formatPrice(product.warrantyPrice)}) · ${t("warrantyInfo")}`);
  warrantyLabel.append(warranty, warrantyText);
  const price = makeElement("p", "product-price product-detail-price");
  const addButton = makeElement("button", "btn btn-primary", t("addToCart"));
  addButton.type = "button";
  const notice = makeElement("p", "cart-notice");

  form.append(variantLabel, variantSelect, quantityLabel, warrantyLabel, price, addButton, notice);
  content.append(form);
  article.append(imageColumn, content);
  container.replaceChildren(article);
  updateProductPrice(product, variantSelect, quantity, warranty, price);

  [variantSelect, quantity, warranty].forEach((input) =>
    input.addEventListener("change", () =>
      updateProductPrice(product, variantSelect, quantity, warranty, price)
    )
  );
  addButton.addEventListener("click", () => {
    const cart = getCart();
    const variantId = variantSelect.value;
    const existing = cart.find((item) =>
      item.productId === product.id && item.variantId === variantId && item.warranty === warranty.checked
    );
    if (existing) existing.quantity += Number(quantity.value);
    else cart.push({
      productId: product.id,
      variantId,
      quantity: Number(quantity.value),
      warranty: warranty.checked
    });
    saveCart(cart);
    notice.textContent = t("addedToCart");
  });
}

function cartTotals(cart) {
  // Skip stale cart entries left after the catalog is changed; this keeps old saved carts safe.
  const subtotal = cart.reduce((total, item) => {
    const product = shopData.products.find((entry) => entry.id === item.productId);
    if (!product) return total;
    return total + linePrice(product, item);
  }, 0);
  const code = localStorage.getItem("grimbart-coupon") || "";
  const coupon = shopData.coupons[code.toUpperCase()];
  const discount = coupon ? Math.round(subtotal * coupon.percent / 100) : 0;
  return { subtotal, discount, total: subtotal - discount, code, coupon };
}

function addField(form, key, type, required = true, placeholder = "") {
  const wrapper = makeElement("div", "col-12");
  const label = makeElement("label", "form-label", t(key));
  const input = type === "textarea"
    ? makeElement("textarea", "form-control")
    : makeElement("input", "form-control");
  input.name = key;
  input.required = required;
  input.placeholder = placeholder;
  if (type !== "textarea") input.type = type;
  label.htmlFor = `checkout-${key}`;
  input.id = label.htmlFor;
  wrapper.append(label, input);
  form.append(wrapper);
  return input;
}

function renderCart() {
  const root = document.querySelector("#cart-content");
  const cart = getCart().filter((item) =>
    shopData.products.some((product) => product.id === item.productId)
  );
  if (cart.length !== getCart().length) saveCart(cart);
  root.replaceChildren(makeElement("h1", "page-title", t("cartTitle")));
  if (cart.length === 0) {
    root.append(makeElement("p", "empty-cart", t("emptyCart")));
    const link = makeElement("a", "btn btn-primary", t("continueShopping"));
    link.href = "catalog.html";
    root.append(link);
    return;
  }

  const layout = makeElement("div", "row g-4 cart-layout");
  const linesColumn = makeElement("section", "col-12 col-lg-7 cart-lines");
  const summaryColumn = makeElement("section", "col-12 col-lg-5");
  cart.forEach((item, index) => {
    const product = shopData.products.find((entry) => entry.id === item.productId);
    if (!product) return; // Ignore an item removed from an older catalog version.
    const localized = productText(product);
    const row = makeElement("article", "cart-item");
    const image = makeElement("img", "cart-item-image");
    image.src = product.image;
    image.alt = localized.imageAlt;
    const details = makeElement("div", "cart-item-details");
    details.append(
      makeElement("h2", "h5", localized.name),
      makeElement("p", "text-secondary", `${t("variantLabel")}: ${getVariant(product, item.variantId).label}`)
    );
    if (item.warranty) details.append(makeElement("p", "text-secondary", t("warrantyLabel")));
    const quantity = makeElement("input", "form-control cart-quantity");
    quantity.type = "number";
    quantity.min = "1";
    quantity.max = "20";
    quantity.value = String(item.quantity);
    quantity.setAttribute("aria-label", t("quantity"));
    const remove = makeElement("button", "btn btn-link cart-remove", t("remove"));
    remove.type = "button";
    const amount = makeElement("p", "product-price cart-line-price", formatPrice(linePrice(product, item)));
    details.append(quantity, remove, amount);
    row.append(image, details);
    linesColumn.append(row);
    quantity.addEventListener("change", () => {
      item.quantity = Math.min(20, Math.max(1, Number(quantity.value) || 1));
      quantity.value = String(item.quantity);
      saveCart(cart);
      amount.textContent = formatPrice(linePrice(product, item));
      updateTotals();
    });
    remove.addEventListener("click", () => {
      cart.splice(index, 1);
      saveCart(cart);
      renderCart();
    });
  });

  const summary = makeElement("div", "cart-summary");
  const couponForm = makeElement("form", "coupon-form");
  const couponLabel = makeElement("label", "form-label", t("coupon"));
  const couponRow = makeElement("div", "input-group");
  const couponInput = makeElement("input", "form-control");
  couponInput.name = "coupon";
  couponInput.placeholder = t("couponPlaceholder");
  couponInput.value = localStorage.getItem("grimbart-coupon") || "";
  couponLabel.htmlFor = "coupon-code";
  couponInput.id = couponLabel.htmlFor;
  const couponButton = makeElement("button", "btn btn-outline-primary", t("applyCoupon"));
  couponButton.type = "submit";
  couponRow.append(couponInput, couponButton);
  const couponMessage = makeElement("p", "coupon-message");
  couponForm.append(couponLabel, couponRow, couponMessage);

  const subtotal = makeElement("p", "cart-total-row");
  const discount = makeElement("p", "cart-total-row");
  const total = makeElement("p", "cart-total-row cart-grand-total");
  const summaryText = (label, amount) => `${label}: ${formatPrice(amount)}`;
  const updateTotals = () => {
    const values = cartTotals(cart);
    subtotal.textContent = summaryText(t("subtotal"), values.subtotal);
    discount.textContent = summaryText(t("discount"), values.discount);
    total.textContent = summaryText(t("total"), values.total);
    couponMessage.textContent = values.coupon ? t("couponApplied") : "";
    couponMessage.classList.toggle("is-error", Boolean(values.code && !values.coupon));
  };
  couponForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const code = couponInput.value.trim().toUpperCase();
    if (shopData.coupons[code]) {
      localStorage.setItem("grimbart-coupon", code);
      playCouponSound(shopData.coupons[code]); // Play the coupon's WAV or a small synthesized fallback.
    } else {
      localStorage.removeItem("grimbart-coupon");
    }
    updateTotals();
    if (code && !shopData.coupons[code]) couponMessage.textContent = t("couponInvalid");
  });
  updateTotals();

  const checkout = makeElement("form", "row g-3 checkout-form");
  checkout.append(makeElement("h2", "h3", t("checkout")));
  const nameInput = addField(checkout, "fullName", "text");
  nameInput.autocomplete = "name";
  const emailInput = addField(checkout, "email", "email");
  emailInput.autocomplete = "email";
  const phoneInput = addField(checkout, "phone", "tel");
  phoneInput.autocomplete = "tel";
  const addressInput = addField(checkout, "address", "text");
  addressInput.autocomplete = "street-address";
  addField(checkout, "comment", "textarea", false, t("commentPlaceholder")).rows = 3;
  checkout.append(makeElement("p", "form-text col-12", t("privacyNotice")));
  const submit = makeElement("button", "btn btn-primary col-12", t("submitOrder"));
  submit.type = "submit";
  const status = makeElement("p", "order-status col-12");
  checkout.append(submit, status);
  checkout.addEventListener("submit", (event) => {
    event.preventDefault();
    sendOrder(checkout, status, submit, cart);
  });

  summary.append(couponForm, subtotal, discount, total, checkout);
  summaryColumn.append(summary);
  layout.append(linesColumn, summaryColumn);
  root.append(layout);
}

// Apps Script receives a regular form post in a hidden iframe, avoiding cross-origin fetch restrictions.
function sendOrder(form, status, button, cart) {
  const endpoint = window.GRIMBART_ORDER_ENDPOINT;
  if (!endpoint) {
    status.textContent = t("endpointMissing");
    status.classList.add("is-error");
    return;
  }

  const values = new FormData(form);
  const totals = cartTotals(cart);
  const order = {
    customer: {
      name: values.get("fullName"),
      email: values.get("email"),
      phone: values.get("phone"),
      address: values.get("address"),
      comment: values.get("comment")
    },
    coupon: totals.code,
    subtotal: totals.subtotal,
    discount: totals.discount,
    total: totals.total,
    items: cart.map((item) => {
      const product = shopData.products.find((entry) => entry.id === item.productId);
      return {
        name: productText(product).name,
        variant: getVariant(product, item.variantId).label,
        quantity: item.quantity,
        warranty: item.warranty
      };
    })
  };

  const frame = document.querySelector("#order-response-frame");
  const postForm = document.createElement("form");
  postForm.method = "POST";
  postForm.action = endpoint;
  postForm.target = frame.name;
  const payload = document.createElement("input");
  payload.type = "hidden";
  payload.name = "payload";
  payload.value = JSON.stringify(order);
  postForm.append(payload);
  document.body.append(postForm);

  const onMessage = (event) => {
    if (event.source !== frame.contentWindow || event.data?.type !== "grimbart-order") return;
    window.removeEventListener("message", onMessage);
    window.clearTimeout(timeout);
    if (event.data.success) {
      localStorage.removeItem(CART_KEY);
      localStorage.removeItem("grimbart-coupon");
      status.textContent = t("orderSent");
      status.classList.remove("is-error");
      button.disabled = true;
      updateCartBadge();
    } else {
      status.textContent = t("orderError");
      status.classList.add("is-error");
    }
    postForm.remove();
  };
  const timeout = window.setTimeout(() => {
    window.removeEventListener("message", onMessage);
    status.textContent = t("orderError");
    status.classList.add("is-error");
    button.disabled = false;
    postForm.remove();
  }, 20000);

  window.addEventListener("message", onMessage);
  button.disabled = true;
  status.textContent = t("sending");
  status.classList.remove("is-error");
  postForm.submit();
}

async function startSite() {
  language = localStorage.getItem("grimbart-language") || "uk";
  if (!["uk", "en", "de"].includes(language)) language = "uk";
  try {
    await loadData();
    addSharedNavigation();
    setupTheme();
    applyTranslations();

    const page = document.body.dataset.page;
    if (page === "home") document.title = t("homePageTitle");
    else if (page === "catalog") document.title = t("catalogPageTitle");
    else if (page === "cart") document.title = t("cartPageTitle");
    else if (page === "product") document.title = t("productPageTitle");
    if (page === "home") showFeaturedProducts();
    else if (page === "catalog") setupCatalog();
    else if (page === "product") showProductDetail();
    else if (page === "cart") renderCart();
  } catch (error) {
    console.error("Could not initialize the shop.", error);
    const main = document.querySelector("main");
    main.prepend(makeElement("div", "alert alert-danger", "Could not load the shop data."));
  }
}

startSite();
