// Усі сторінки беруть товари з одного JSON-файлу.
// Щоб браузер міг прочитати файл через fetch, сайт треба запустити через вебсервер.
const PRODUCTS_FILE = "data/products.json";

// Ці дані заповнюються після завантаження JSON і використовуються різними сторінками.
let shopData;

// Допоміжна функція створює HTML-елемент і, якщо передано текст, додає його безпечно.
// textContent показує вміст як звичайний текст, а не виконує його як HTML-код.
function makeElement(tagName, className, text) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

// Навігація однакова на всіх сторінках, тому створюємо її тут лише в одному місці.
function addSharedNavigation() {
  const header = document.querySelector("#site-header");
  const footer = document.querySelector("#site-footer");
  const currentPage = document.body.dataset.page;
  const homeLinkClass = currentPage === "home" ? "nav-link active" : "nav-link";
  const catalogLinkClass = currentPage === "catalog" ? "nav-link active" : "nav-link";

  header.innerHTML = `
    <nav class="navbar navbar-expand-md bg-light border-bottom" aria-label="Головна навігація">
      <div class="container">
        <a class="navbar-brand" href="index.html">Grimbart Schmiede</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse"
          data-bs-target="#main-navigation" aria-controls="main-navigation"
          aria-expanded="false" aria-label="Відкрити меню">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="main-navigation">
          <ul class="navbar-nav ms-auto">
            <li class="nav-item">
              <a class="${homeLinkClass}" href="index.html" ${currentPage === "home" ? 'aria-current="page"' : ""}>Головна</a>
            </li>
            <li class="nav-item">
              <a class="${catalogLinkClass}" href="catalog.html" ${currentPage === "catalog" ? 'aria-current="page"' : ""}>Каталог</a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `;

  footer.innerHTML = `
    <footer class="container py-4 mt-4 border-top">
      <p class="mb-0 text-secondary">Grimbart Schmiede — вироби ручного кування.</p>
    </footer>
  `;
}

// Отримуємо JSON із сервера і перевіряємо найважливіші поля перед використанням.
async function loadShopData() {
  const response = await fetch(PRODUCTS_FILE);

  // Наприклад, 404 означає, що шлях до JSON неправильний.
  if (!response.ok) {
    throw new Error(`Не вдалося завантажити каталог: HTTP ${response.status}`);
  }

  const data = await response.json();

  // Якщо формат файлу неправильний, повідомляємо про це замість порожньої сторінки.
  if (
    !data.currency ||
    typeof data.currency.symbol !== "string" ||
    typeof data.currency.plural !== "string" ||
    !Array.isArray(data.products)
  ) {
    throw new Error("У data/products.json відсутні валюта або список виробів.");
  }

  // Перевіряємо поля для карток, сторінки опису та сортування популярних товарів.
  for (const product of data.products) {
    if (
      typeof product.id !== "string" ||
      typeof product.name !== "string" ||
      typeof product.category !== "string" ||
      typeof product.description !== "string" ||
      typeof product.price !== "number" ||
      typeof product.popular !== "number"
    ) {
      throw new Error("Перевірте товар у data/products.json: одне з його полів має неправильний формат.");
    }
  }

  return data;
}

// В усіх цінах показуємо срібні денарії, назва яких задана у JSON.
function formatPrice(price) {
  const readablePrice = price.toLocaleString("uk-UA");
  return `${readablePrice} ${shopData.currency.plural} (${shopData.currency.symbol})`;
}

// Створюємо картку, яка веде на окрему сторінку опису товару.
function makeProductCard(product) {
  const column = makeElement("div", "col-12 col-sm-6 col-xl-4");
  const card = makeElement("article", "card h-100");
  const cardBody = makeElement("div", "card-body d-flex flex-column");
  const category = makeElement("p", "small text-secondary mb-2", product.category);
  const heading = makeElement("h2", "h5");
  const titleLink = makeElement("a", "text-decoration-none", product.name);
  const description = makeElement("p", "card-text", product.description);
  const price = makeElement("p", "fw-semibold mt-auto mb-3", formatPrice(product.price));
  const detailsLink = makeElement("a", "btn btn-outline-primary align-self-start", "Детальніше");

  // ID у посиланні допомагає сторінці product.html знайти потрібний товар у JSON.
  const productUrl = `product.html?id=${encodeURIComponent(product.id)}`;
  titleLink.href = productUrl;
  detailsLink.href = productUrl;

  heading.append(titleLink);
  cardBody.append(category, heading, description, price, detailsLink);
  card.append(cardBody);
  column.append(card);

  return column;
}

// Додаємо картки у вибраний контейнер. Перед показом прибираємо текст-заглушку.
function showProducts(container, products) {
  container.replaceChildren();

  for (const product of products) {
    container.append(makeProductCard(product));
  }
}

// Головна показує кілька виробів із найбільшим значенням популярності.
function showFeaturedProducts() {
  const container = document.querySelector("#featured-products");
  const featuredProducts = [...shopData.products]
    .sort((first, second) => second.popular - first.popular)
    .slice(0, 3);

  showProducts(container, featuredProducts);
}

// Заповнюємо список категорій значеннями, які справді є у JSON.
function fillCategoryFilter(select) {
  const categories = [...new Set(shopData.products.map((product) => product.category))];

  for (const category of categories) {
    const option = makeElement("option", "", category);
    option.value = category;
    select.append(option);
  }
}

// Застосовуємо вибрану категорію, максимальну ціну та порядок сортування.
function getVisibleProducts(category, maximumPrice, sortOrder) {
  let visibleProducts = shopData.products.filter((product) => {
    const matchesCategory = !category || product.category === category;
    const matchesPrice = maximumPrice === null || product.price <= maximumPrice;
    return matchesCategory && matchesPrice;
  });

  if (sortOrder === "price-asc") {
    visibleProducts.sort((first, second) => first.price - second.price);
  } else if (sortOrder === "price-desc") {
    visibleProducts.sort((first, second) => second.price - first.price);
  } else if (sortOrder === "name") {
    visibleProducts.sort((first, second) => first.name.localeCompare(second.name, "uk"));
  } else {
    visibleProducts.sort((first, second) => second.popular - first.popular);
  }

  return visibleProducts;
}

// Під'єднуємо елементи керування каталогу і оновлюємо результати після кожної зміни.
function setupCatalog() {
  const categoryFilter = document.querySelector("#category-filter");
  const priceFilter = document.querySelector("#price-filter");
  const sortFilter = document.querySelector("#sort-filter");
  const resetButton = document.querySelector("#reset-filters");
  const productList = document.querySelector("#product-list");
  const resultCount = document.querySelector("#result-count");
  const currencySymbol = document.querySelector("#currency-symbol");
  const currencyDescription = document.querySelector("#currency-description");

  currencySymbol.textContent = shopData.currency.symbol;
  currencyDescription.textContent = `Ціни вказані у ${shopData.currency.plural}.`;
  fillCategoryFilter(categoryFilter);

  function updateCatalog() {
    // Порожнє поле означає, що верхньої межі ціни немає.
    const maximumPrice = priceFilter.value === "" ? null : Number(priceFilter.value);
    const visibleProducts = getVisibleProducts(
      categoryFilter.value,
      maximumPrice,
      sortFilter.value
    );

    showProducts(productList, visibleProducts);
    resultCount.textContent = `Знайдено виробів: ${visibleProducts.length}`;

    if (visibleProducts.length === 0) {
      productList.append(
        makeElement("p", "col-12 text-secondary", "За цими умовами виробів не знайдено.")
      );
    }
  }

  categoryFilter.addEventListener("change", updateCatalog);
  priceFilter.addEventListener("input", updateCatalog);
  sortFilter.addEventListener("change", updateCatalog);

  resetButton.addEventListener("click", () => {
    categoryFilter.value = "";
    priceFilter.value = "";
    sortFilter.value = "popular";
    updateCatalog();
  });

  updateCatalog();
}

// Знаходимо товар за параметром ?id=... і показуємо повний опис.
function showProductDetail() {
  const productId = new URLSearchParams(window.location.search).get("id");
  const product = shopData.products.find((item) => item.id === productId);
  const container = document.querySelector("#product-detail");

  if (!product) {
    container.replaceChildren(
      makeElement("div", "alert alert-warning", "Виріб не знайдено. Поверніться до каталогу.")
    );
    return;
  }

  document.title = `${product.name} — Grimbart Schmiede`;
  document.querySelector("#product-breadcrumb").textContent = product.name;

  const article = makeElement("article", "row g-4");
  const content = makeElement("div", "col-12 col-lg-8");
  const category = makeElement("p", "text-secondary mb-2", product.category);
  const heading = makeElement("h1", "mb-3", product.name);
  const description = makeElement("p", "lead", product.description);
  const price = makeElement("p", "h4 mb-4", formatPrice(product.price));
  const backLink = makeElement("a", "btn btn-primary", "Повернутися до каталогу");

  backLink.href = "catalog.html";
  content.append(category, heading, description, price, backLink);
  article.append(content);
  container.replaceChildren(article);
}

// Спершу додаємо меню, а тоді завантажуємо JSON і запускаємо логіку потрібної сторінки.
async function startSite() {
  addSharedNavigation();

  try {
    shopData = await loadShopData();

    if (document.body.dataset.page === "home") {
      showFeaturedProducts();
    } else if (document.body.dataset.page === "catalog") {
      setupCatalog();
    } else if (document.body.dataset.page === "product") {
      showProductDetail();
    }
  } catch (error) {
    // Помилка видима і на сторінці, і в консолі розробника, а не прихована.
    console.error("Не вдалося показати товари.", error);
    const message = makeElement(
      "div",
      "alert alert-danger",
      "Не вдалося завантажити товари. Перевірте файл data/products.json і відкрийте сайт через вебсервер."
    );
    const pageContent = document.querySelector("main");
    pageContent.prepend(message);
  }
}

startSite();