import { useEffect, useState } from "react";
import "./App.css";

import ProductDetails from "./components/ProductDetails";
import Checkout from "./components/Checkout";
import AIStylist from "./components/AIStylist";
import Auth from "./components/Auth";
import MyOrders from "./components/MyOrders";
import AdminProducts from "./components/AdminProducts";
import AdminOrders from "./components/AdminOrders";
import Profile from "./components/Profile";

import {
  onAuthStateChanged,
  signOut,
  reload,
} from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "./firebase";


function getFallbackProductImage(product = {}) {
  const value = `${product.name || ""} ${product.category || ""}`.toLowerCase();

  if (value.includes("trouser") || value.includes("bottom")) return "/images/trousers.jpg";
  if (value.includes("hoodie")) return "/images/hoodie.jpg";
  if (value.includes("t-shirt") || value.includes("tshirt") || value.includes("tee")) return "/images/tshirt.jpg";
  if (value.includes("shirt")) return "/images/shirt.jpg";

  return "/images/tshirt.jpg";
}

function resolveProductImage(product = {}) {
  const raw = String(product.image || product.imageUrl || "").trim();

  if (!raw) return getFallbackProductImage(product);

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:")
  ) {
    return raw;
  }

  if (raw.startsWith("/")) return raw;
  if (raw.startsWith("images/")) return `/${raw}`;

  return `/images/${raw.replace(/^.*[\\/]/, "")}`;
}

function handleProductImageError(event, product = {}) {
  const fallback = getFallbackProductImage(product);

  if (event.currentTarget.src.endsWith(fallback)) return;

  event.currentTarget.src = fallback;
}


function App() {
  // =====================================================
  // GUEST DATA
  // =====================================================

  function getGuestCart() {
    try {
      const value = localStorage.getItem("lume-cart");

      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error("Guest cart error:", error);

      return [];
    }
  }

  function getGuestWishlist() {
    try {
      const value = localStorage.getItem("lume-wishlist");

      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error("Guest wishlist error:", error);

      return [];
    }
  }

  // =====================================================
  // CART / WISHLIST
  // =====================================================

  const [cart, setCart] = useState(() => getGuestCart());

  const [wishlist, setWishlist] = useState(() =>
    getGuestWishlist()
  );

  // =====================================================
  // PAGE STATE
  // =====================================================

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [showCheckout, setShowCheckout] =
    useState(false);

  const [showOrders, setShowOrders] =
    useState(false);

  const [showProfile, setShowProfile] =
    useState(false);

  const [showAdminProducts, setShowAdminProducts] =
    useState(false);

  const [showAdminOrders, setShowAdminOrders] =
    useState(false);

  const [showShop, setShowShop] =
    useState(false);

  const [showWishlistPage, setShowWishlistPage] =
    useState(false);

  // =====================================================
  // MOBILE / UI
  // =====================================================

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [newsletterEmail, setNewsletterEmail] =
    useState("");

  const [newsletterMessage, setNewsletterMessage] =
    useState("");

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [recentSearches, setRecentSearches] =
    useState(() => {
      try {
        const saved = localStorage.getItem("lume-recent-searches");
        return saved ? JSON.parse(saved) : [];
      } catch (error) {
        console.error("Recent search error:", error);
        return [];
      }
    });

  const [activeCategory, setActiveCategory] =
    useState("All");

  const [sortOption, setSortOption] =
    useState("Newest");

  const [filterOpen, setFilterOpen] =
    useState(false);

  const [stockFilter, setStockFilter] =
    useState("All");

  const [priceFilter, setPriceFilter] =
    useState("All");

  const [sizeFilter, setSizeFilter] =
    useState("All");

  const [ratingFilter, setRatingFilter] =
    useState("All");

  const [bagDrawerOpen, setBagDrawerOpen] =
    useState(false);

  const [quickViewProduct, setQuickViewProduct] =
    useState(null);

  const [quickViewSize, setQuickViewSize] =
    useState("");

  const [quickViewQuantity, setQuickViewQuantity] =
    useState(1);

  const [accountMenuOpen, setAccountMenuOpen] =
    useState(false);

  useEffect(() => {
    if (!searchOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event) {
      if (event.key === "Escape") {
        closeSearchOverlay();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [searchOpen]);

  // =====================================================
  // AUTH
  // =====================================================

  const [user, setUser] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [showAuth, setShowAuth] =
    useState(false);

  const [checkingVerification, setCheckingVerification] =
    useState(false);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [userDataReady, setUserDataReady] =
    useState(false);

  const [syncingAccount, setSyncingAccount] =
    useState(false);

  // =====================================================
  // PRODUCTS
  // =====================================================

  const [products, setProducts] =
    useState([]);

  const [productsLoading, setProductsLoading] =
    useState(true);

  const [productsError, setProductsError] =
    useState("");

  // =====================================================
  // AUTH LISTENER
  // =====================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);

        setAuthLoading(false);

        setUserDataReady(false);

        setIsAdmin(false);

        if (currentUser) {
          setShowAuth(false);
        } else {
          setShowProfile(false);
          setShowOrders(false);
          setShowCheckout(false);
          setShowAdminProducts(false);
          setShowAdminOrders(false);
        }
      }
    );

    return unsubscribe;
  }, []);

  // =====================================================
  // LOAD USER DATA
  // =====================================================

  useEffect(() => {
    async function loadUserData() {
      if (!user) {
        setCart(getGuestCart());

        setWishlist(getGuestWishlist());

        setUserDataReady(true);

        setIsAdmin(false);

        return;
      }

      try {
        setSyncingAccount(true);

        const userRef = doc(
          db,
          "users",
          user.uid
        );

        const snapshot = await getDoc(userRef);

        const guestCart = getGuestCart();

        const guestWishlist =
          getGuestWishlist();

        if (snapshot.exists()) {
          const data = snapshot.data();

          setIsAdmin(
            data.role === "admin"
          );

          const remoteCart =
            Array.isArray(data.cart)
              ? data.cart
              : guestCart;

          const remoteWishlist =
            Array.isArray(data.wishlist)
              ? data.wishlist
              : guestWishlist;

          setCart(remoteCart);

          setWishlist(remoteWishlist);

          await setDoc(
            userRef,
            {
              uid: user.uid,

              email:
                user.email || "",

              emailVerified:
                user.emailVerified,

              cart:
                remoteCart,

              wishlist:
                remoteWishlist,

              updatedAt:
                serverTimestamp(),
            },
            {
              merge: true,
            }
          );
        } else {
          setCart(guestCart);

          setWishlist(guestWishlist);

          setIsAdmin(false);

          await setDoc(
            userRef,
            {
              uid:
                user.uid,

              email:
                user.email || "",

              emailVerified:
                user.emailVerified,

              cart:
                guestCart,

              wishlist:
                guestWishlist,

              createdAt:
                serverTimestamp(),

              updatedAt:
                serverTimestamp(),
            },
            {
              merge: true,
            }
          );
        }

        setUserDataReady(true);
      } catch (error) {
        console.error(
          "User data error:",
          error
        );

        setCart(getGuestCart());

        setWishlist(
          getGuestWishlist()
        );

        setIsAdmin(false);

        setUserDataReady(true);
      } finally {
        setSyncingAccount(false);
      }
    }

    if (!authLoading) {
      loadUserData();
    }
  }, [user, authLoading]);

  // =====================================================
  // SAVE GUEST CART
  // =====================================================

  useEffect(() => {
    if (user) {
      return;
    }

    try {
      localStorage.setItem(
        "lume-cart",
        JSON.stringify(cart)
      );
    } catch (error) {
      console.error(error);
    }
  }, [cart, user]);

  // =====================================================
  // SAVE GUEST WISHLIST
  // =====================================================

  useEffect(() => {
    if (user) {
      return;
    }

    try {
      localStorage.setItem(
        "lume-wishlist",
        JSON.stringify(wishlist)
      );
    } catch (error) {
      console.error(error);
    }
  }, [wishlist, user]);

  // =====================================================
  // FIRESTORE CART
  // =====================================================

  useEffect(() => {
    async function saveCart() {
      if (
        !user ||
        !userDataReady
      ) {
        return;
      }

      try {
        await setDoc(
          doc(
            db,
            "users",
            user.uid
          ),
          {
            cart,

            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );
      } catch (error) {
        console.error(
          "Cart sync error:",
          error
        );
      }
    }

    saveCart();
  }, [
    cart,
    user,
    userDataReady,
  ]);

  // =====================================================
  // FIRESTORE WISHLIST
  // =====================================================

  useEffect(() => {
    async function saveWishlist() {
      if (
        !user ||
        !userDataReady
      ) {
        return;
      }

      try {
        await setDoc(
          doc(
            db,
            "users",
            user.uid
          ),
          {
            wishlist,

            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );
      } catch (error) {
        console.error(
          "Wishlist sync error:",
          error
        );
      }
    }

    saveWishlist();
  }, [
    wishlist,
    user,
    userDataReady,
  ]);

  // =====================================================
  // PRODUCTS
  // =====================================================

  useEffect(() => {
    setProductsLoading(true);

    const ref = collection(
      db,
      "products"
    );

    const unsubscribe = onSnapshot(
      ref,

      (snapshot) => {
        const loaded =
          snapshot.docs
            .map(
              (document) => ({
                id:
                  document.id,

                ...document.data(),
              })
            )
            .filter(
              (product) =>
                product.active !==
                false
            );

        loaded.sort(
          (a, b) =>
            String(a.id).localeCompare(
              String(b.id),
              undefined,
              {
                numeric: true,
              }
            )
        );

        setProducts(loaded);

        setProductsLoading(false);

        setProductsError("");
      },

      (error) => {
        console.error(
          "Products error:",
          error
        );

        setProductsError(
          "Could not load products."
        );

        setProductsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // =====================================================
  // PRODUCT FILTERING
  // =====================================================

  let filteredProducts =
    products.filter(
      (product) => {
        const categoryMatch =
          activeCategory ===
            "All" ||
          product.category ===
            activeCategory;

        const value =
          searchTerm
            .trim()
            .toLowerCase();

        const searchMatch =
          String(
            product.name ||
              ""
          )
            .toLowerCase()
            .includes(value) ||
          String(
            product.category ||
              ""
          )
            .toLowerCase()
            .includes(value);

        return (
          categoryMatch &&
          searchMatch
        );
      }
    );

  if (stockFilter === "In Stock") {
    filteredProducts = filteredProducts.filter(
      (product) => Number(product.stock || 0) > 0
    );
  }

  if (stockFilter === "Out of Stock") {
    filteredProducts = filteredProducts.filter(
      (product) => Number(product.stock || 0) <= 0
    );
  }

  if (priceFilter === "Under 1000") {
    filteredProducts = filteredProducts.filter(
      (product) => Number(product.price || 0) < 1000
    );
  }

  if (priceFilter === "1000-2000") {
    filteredProducts = filteredProducts.filter((product) => {
      const price = Number(product.price || 0);
      return price >= 1000 && price <= 2000;
    });
  }

  if (priceFilter === "Above 2000") {
    filteredProducts = filteredProducts.filter(
      (product) => Number(product.price || 0) > 2000
    );
  }

  if (sizeFilter !== "All") {
    filteredProducts = filteredProducts.filter((product) => {
      const sizes = Array.isArray(product.sizes) ? product.sizes : [];
      return sizes.map(String).includes(String(sizeFilter));
    });
  }

  if (ratingFilter === "4.5+") {
    filteredProducts = filteredProducts.filter(
      (product) => Number(product.rating || 0) >= 4.5
    );
  }

  if (ratingFilter === "4.0+") {
    filteredProducts = filteredProducts.filter(
      (product) => Number(product.rating || 0) >= 4
    );
  }

  if (
    sortOption ===
    "Price Low"
  ) {
    filteredProducts = [
      ...filteredProducts,
    ].sort(
      (a, b) =>
        Number(a.price) -
        Number(b.price)
    );
  }

  if (
    sortOption ===
    "Price High"
  ) {
    filteredProducts = [
      ...filteredProducts,
    ].sort(
      (a, b) =>
        Number(b.price) -
        Number(a.price)
    );
  }

  if (
    sortOption ===
    "Rating"
  ) {
    filteredProducts = [
      ...filteredProducts,
    ].sort(
      (a, b) =>
        Number(
          b.rating || 0
        ) -
        Number(
          a.rating || 0
        )
    );
  }

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const liveSearchResults = normalizedSearchTerm
    ? products.filter((product) => {
        const haystack = [
          product.name,
          product.category,
          product.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedSearchTerm);
      })
    : [];

  // =====================================================
  // HELPERS
  // =====================================================

  function scrollTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openSearchOverlay() {
    setSearchOpen(true);
    setFilterOpen(false);
    setBagDrawerOpen(false);
    setQuickViewProduct(null);
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
  }

  function closeSearchOverlay(clearSearch = true) {
    setSearchOpen(false);

    if (clearSearch) {
      setSearchTerm("");
    }
  }

  function saveRecentSearch(value) {
    const cleanValue = String(value || "").trim();

    if (!cleanValue) {
      return;
    }

    setRecentSearches((current) => {
      const next = [
        cleanValue,
        ...current.filter(
          (item) => item.toLowerCase() !== cleanValue.toLowerCase()
        ),
      ].slice(0, 5);

      try {
        localStorage.setItem(
          "lume-recent-searches",
          JSON.stringify(next)
        );
      } catch (error) {
        console.error("Could not save recent searches:", error);
      }

      return next;
    });
  }

  function clearRecentSearches() {
    setRecentSearches([]);

    try {
      localStorage.removeItem("lume-recent-searches");
    } catch (error) {
      console.error("Could not clear recent searches:", error);
    }
  }

  function openSearchProduct(product) {
    saveRecentSearch(product.name);
    setSearchOpen(false);
    setSearchTerm("");
    openProduct(product);
  }

  function searchCategory(category) {
    saveRecentSearch(category);
    setSearchOpen(false);
    openShop(category);
  }

  function showAllSearchResults() {
    const value = searchTerm.trim();

    if (!value) {
      return;
    }

    saveRecentSearch(value);
    resetPages();
    setShowShop(true);
    setActiveCategory("All");
    setSearchOpen(false);
    scrollTop();
  }


  function resetPages() {
    setSelectedProduct(null);

    setShowCheckout(false);

    setShowOrders(false);

    setShowProfile(false);

    setShowAdminProducts(false);

    setShowAdminOrders(false);

    setShowWishlistPage(false);

    setMobileMenuOpen(false);

    setAccountMenuOpen(false);
  }

  function goHome() {
    resetPages();

    setShowShop(false);

    setSearchOpen(false);

    setSearchTerm("");

    setActiveCategory("All");

    scrollTop();
  }

  function openShop(
    category = "All"
  ) {
    resetPages();

    setShowShop(true);

    setActiveCategory(category);

    setSearchTerm("");

    setSearchOpen(false);

    scrollTop();
  }

  // =====================================================
  // PRODUCT
  // =====================================================

  function openProduct(
    product
  ) {
    resetPages();

    setShowShop(false);

    setSelectedProduct(
      product
    );

    scrollTop();
  }

  // =====================================================
  // CART
  // =====================================================

  function addToCart(
    product,
    quantity = 1,
    size = null
  ) {
    if (!size) {
      alert(
        "Please select a size first."
      );

      return false;
    }

    const stock =
      Number(
        product.stock ??
          0
      );

    const requested =
      Number(
        quantity || 1
      );

    if (stock <= 0) {
      alert(
        `${product.name} is out of stock.`
      );

      return false;
    }

    if (
      requested >
      stock
    ) {
      alert(
        `Only ${stock} items available.`
      );

      return false;
    }

    setCart(
      (current) => {
        const existing =
          current.find(
            (item) =>
              item.id ===
                product.id &&
              item.size ===
                size
          );

        if (existing) {
          return current;
        }

        return [
          ...current,
          {
            ...product,

            quantity:
              requested,

            size,
          },
        ];
      }
    );

    return true;
  }

  function handleAddToCart(
    product,
    quantity = 1,
    size = null
  ) {
    const exists =
      cart.some(
        (item) =>
          item.id ===
            product.id &&
          item.size ===
            size
      );

    if (
      size &&
      exists
    ) {
      alert(
        `${product.name} size ${size} is already in your bag.`
      );

      return true;
    }

    return addToCart(
      product,
      quantity,
      size
    );
  }

  function addFromAIStylist(
    product,
    quantity = 1,
    size = null
  ) {
    return handleAddToCart(
      product,
      quantity,
      size
    );
  }

  function buyNow(
    product,
    quantity = 1,
    size = null
  ) {
    const success =
      handleAddToCart(
        product,
        quantity,
        size
      );

    if (!success) {
      return;
    }

    setSelectedProduct(null);

    setShowShop(false);

    openCheckout();
  }

  function increaseQuantity(
    id,
    size
  ) {
    const product =
      products.find(
        (item) =>
          item.id === id
      );

    if (!product) {
      return;
    }

    const stock =
      Number(
        product.stock || 0
      );

    setCart(
      (current) =>
        current.map(
          (item) => {
            if (
              item.id !== id ||
              item.size !== size
            ) {
              return item;
            }

            if (
              item.quantity >=
              stock
            ) {
              alert(
                `Only ${stock} items available.`
              );

              return item;
            }

            return {
              ...item,

              quantity:
                item.quantity +
                1,
            };
          }
        )
    );
  }

  function decreaseQuantity(
    id,
    size
  ) {
    setCart(
      (current) =>
        current
          .map(
            (item) =>
              item.id === id &&
              item.size === size
                ? {
                    ...item,

                    quantity:
                      item.quantity -
                      1,
                  }
                : item
          )
          .filter(
            (item) =>
              item.quantity >
              0
          )
    );
  }

  function removeFromCart(
    id,
    size
  ) {
    setCart(
      (current) =>
        current.filter(
          (item) =>
            !(
              item.id ===
                id &&
              item.size ===
                size
            )
        )
    );
  }

  const cartItems =
    cart.reduce(
      (total, item) =>
        total +
        Number(
          item.quantity ||
            0
        ),
      0
    );

  const cartTotal =
    cart.reduce(
      (total, item) =>
        total +
        Number(
          item.price || 0
        ) *
          Number(
            item.quantity ||
              0
          ),
      0
    );

  // =====================================================
  // WISHLIST
  // =====================================================

  function toggleWishlist(
    product
  ) {
    setWishlist(
      (current) => {
        const exists =
          current.some(
            (item) =>
              item.id ===
              product.id
          );

        if (exists) {
          return current.filter(
            (item) =>
              item.id !==
              product.id
          );
        }

        return [
          ...current,
          product,
        ];
      }
    );
  }

  function isWishlisted(
    id
  ) {
    return wishlist.some(
      (item) =>
        item.id === id
    );
  }


  function openWishlistPage() {
    resetPages();
    setShowShop(false);
    setShowWishlistPage(true);
    setSearchOpen(false);
    setBagDrawerOpen(false);
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
    scrollTop();
  }

  function removeWishlistItem(id) {
    setWishlist((current) =>
      current.filter(
        (item) =>
          item.id !== id
      )
    );
  }

  function openBagDrawer() {
    setBagDrawerOpen(true);
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
  }

  function renderSearchOverlay() {
    if (!searchOpen) {
      return null;
    }

    const visibleResults = liveSearchResults.slice(0, 8);
    const popularCategories = [
      "Shirts",
      "T-Shirts",
      "Trousers",
      "Hoodies",
    ];

    return (
      <div className="lume-search-overlay">
        <div className="search-overlay-header">
          <button
            type="button"
            className="search-brand"
            onClick={() => {
              closeSearchOverlay();
              goHome();
            }}
          >
            LUMÉ
          </button>

          <button
            type="button"
            className="search-close"
            aria-label="Close search"
            onClick={() => closeSearchOverlay()}
          >
            ×
          </button>
        </div>

        <div className="search-overlay-main">
          <div className="search-input-wrap">
            <span className="search-input-icon">⌕</span>

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search LUMÉ"
              autoFocus
              aria-label="Search products"
            />

            {searchTerm && (
              <button
                type="button"
                className="search-clear-input"
                onClick={() => setSearchTerm("")}
              >
                CLEAR
              </button>
            )}
          </div>

          <div className="search-overlay-content">
            <aside className="search-discovery">
              {recentSearches.length > 0 && (
                <section className="search-discovery-section">
                  <div className="search-section-heading">
                    <span>RECENT SEARCHES</span>

                    <button
                      type="button"
                      onClick={clearRecentSearches}
                    >
                      CLEAR
                    </button>
                  </div>

                  <div className="recent-search-list">
                    {recentSearches.map((item) => (
                      <button
                        type="button"
                        key={item}
                        onClick={() => setSearchTerm(item)}
                      >
                        <span>↗</span>
                        {item}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="search-discovery-section">
                <div className="search-section-heading">
                  <span>POPULAR CATEGORIES</span>
                </div>

                <div className="search-category-list">
                  {popularCategories.map((category) => (
                    <button
                      type="button"
                      key={category}
                      onClick={() => searchCategory(category)}
                    >
                      {category}
                      <span>→</span>
                    </button>
                  ))}
                </div>
              </section>
            </aside>

            <section className="search-results-panel">
              {!normalizedSearchTerm ? (
                <div className="search-start-message">
                  <p>SEARCH THE COLLECTION</p>
                  <h2>Find your next LUMÉ piece.</h2>
                  <span>
                    Search by product name or category.
                  </span>
                </div>
              ) : visibleResults.length > 0 ? (
                <>
                  <div className="search-results-heading">
                    <div>
                      <span>SEARCH RESULTS</span>
                      <strong>
                        {liveSearchResults.length} MATCH
                        {liveSearchResults.length === 1 ? "" : "ES"}
                      </strong>
                    </div>

                    <span>“{searchTerm.trim()}”</span>
                  </div>

                  <div className="search-results-grid">
                    {visibleResults.map((product) => (
                      <button
                        type="button"
                        className="search-result-card"
                        key={product.id}
                        onClick={() => openSearchProduct(product)}
                      >
                        <div className="search-result-image">
                          <img
                            src={resolveProductImage(product)}
                            alt={product.name}
                            onError={(event) =>
                              handleProductImageError(event, product)
                            }
                          />

                          <span
                            className={
                              Number(product.stock || 0) > 0
                                ? "available"
                                : "sold-out"
                            }
                          >
                            {Number(product.stock || 0) > 0
                              ? "IN STOCK"
                              : "SOLD OUT"}
                          </span>
                        </div>

                        <div className="search-result-info">
                          <span>{product.category}</span>
                          <h3>{product.name}</h3>
                          <strong>
                            ₹{Number(product.price || 0).toLocaleString("en-IN")}
                          </strong>
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="search-view-all"
                    onClick={showAllSearchResults}
                  >
                    VIEW ALL {liveSearchResults.length} RESULTS →
                  </button>
                </>
              ) : (
                <div className="search-no-results">
                  <span>NO RESULTS</span>
                  <h2>Nothing matched “{searchTerm.trim()}”.</h2>
                  <p>
                    Try another product name or browse one of the categories.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    );
  }


  function openQuickView(product) {
    setQuickViewProduct(product);

    const sizes =
      Array.isArray(product.sizes)
        ? product.sizes
        : [];

    setQuickViewSize(
      sizes.length === 1
        ? sizes[0]
        : ""
    );

    setQuickViewQuantity(1);

    setBagDrawerOpen(false);
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
  }

  function closeQuickView() {
    setQuickViewProduct(null);
    setQuickViewSize("");
    setQuickViewQuantity(1);
  }

  function increaseQuickViewQuantity() {
    if (!quickViewProduct) {
      return;
    }

    const stock =
      Number(
        quickViewProduct.stock || 0
      );

    setQuickViewQuantity(
      (current) =>
        current < stock
          ? current + 1
          : current
    );
  }

  function decreaseQuickViewQuantity() {
    setQuickViewQuantity(
      (current) =>
        current > 1
          ? current - 1
          : 1
    );
  }

  function addQuickViewToBag() {
    if (!quickViewProduct) {
      return;
    }

    const success =
      handleAddToCart(
        quickViewProduct,
        quickViewQuantity,
        quickViewSize
      );

    if (success) {
      closeQuickView();
      openBagDrawer();
    }
  }

  function buyQuickViewNow() {
    if (!quickViewProduct) {
      return;
    }

    const product =
      quickViewProduct;

    const quantity =
      quickViewQuantity;

    const size =
      quickViewSize;

    closeQuickView();

    buyNow(
      product,
      quantity,
      size
    );
  }

  function closeBagDrawer() {
    setBagDrawerOpen(false);
  }

  function goToCheckoutFromBag() {
    setBagDrawerOpen(false);
    openCheckout();
  }

  // =====================================================
  // CHECKOUT
  // =====================================================

  function openCheckout() {
    if (
      cart.length === 0
    ) {
      alert(
        "Your shopping bag is empty."
      );

      return;
    }

    if (!user) {
      alert(
        "Please sign in before checkout."
      );

      setShowAuth(true);

      return;
    }

    if (
      !user.emailVerified
    ) {
      alert(
        "Please verify your email before checkout."
      );

      setAccountMenuOpen(true);

      return;
    }

    resetPages();

    setShowShop(false);

    setShowCheckout(true);

    scrollTop();
  }

  async function handleOrderPlaced(
    order
  ) {
    console.log(
      "Order placed:",
      order
    );

    setCart([]);

    localStorage.setItem(
      "lume-cart",
      "[]"
    );

    if (
      auth.currentUser
    ) {
      try {
        await setDoc(
          doc(
            db,
            "users",
            auth.currentUser.uid
          ),
          {
            cart: [],

            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          }
        );
      } catch (error) {
        console.error(error);
      }
    }
  }

  // =====================================================
  // ACCOUNT
  // =====================================================

  function getUserName() {
    if (!user) {
      return "";
    }

    if (
      user.displayName
    ) {
      return user.displayName;
    }

    return (
      user.email?.split(
        "@"
      )[0] ||
      "Customer"
    );
  }

  function openAccount() {
    if (
      authLoading
    ) {
      return;
    }

    if (!user) {
      setShowAuth(true);

      return;
    }

    setAccountMenuOpen(
      (value) =>
        !value
    );
  }

  async function checkEmailVerification() {
    if (
      !auth.currentUser
    ) {
      return;
    }

    try {
      setCheckingVerification(
        true
      );

      await reload(
        auth.currentUser
      );

      const refreshed =
        auth.currentUser;

      setUser(refreshed);

      await setDoc(
        doc(
          db,
          "users",
          refreshed.uid
        ),
        {
          emailVerified:
            refreshed.emailVerified,

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      alert(
        refreshed.emailVerified
          ? "Email verified successfully."
          : "Email is not verified yet."
      );
    } catch (error) {
      console.error(error);
    } finally {
      setCheckingVerification(
        false
      );
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);

      resetPages();

      setShowShop(false);

      alert(
        "You have been signed out."
      );
    } catch (error) {
      console.error(error);
    }
  }

  function renderBagDrawer() {
    if (!bagDrawerOpen) {
      return null;
    }

    return (
      <div
        className="lume-bag-overlay"
        onClick={closeBagDrawer}
      >
        <aside
          className="lume-bag-drawer"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="bag-drawer-header">
            <div>
              <p>YOUR BAG</p>
              <strong>{cartItems} ITEM{cartItems === 1 ? "" : "S"}</strong>
            </div>

            <button
              type="button"
              aria-label="Close bag"
              onClick={closeBagDrawer}
            >
              ×
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="bag-drawer-empty">
              <p>Your bag is empty.</p>
              <button
                type="button"
                onClick={() => {
                  closeBagDrawer();
                  openShop("All");
                }}
              >
                CONTINUE SHOPPING
              </button>
            </div>
          ) : (
            <>
              <div className="bag-drawer-items">
                {cart.map((item) => (
                  <article
                    className="bag-drawer-item"
                    key={`${item.id}-${item.size}`}
                  >
                    <button
                      type="button"
                      className="bag-item-image"
                      onClick={() => {
                        closeBagDrawer();
                        openProduct(item);
                      }}
                    >
                      <img
                        src={resolveProductImage(item)}
                        alt={item.name}
                        onError={(event) => handleProductImageError(event, item)}
                      />
                    </button>

                    <div className="bag-item-content">
                      <div className="bag-item-top">
                        <div>
                          <h3>{item.name}</h3>
                          <p>SIZE: {item.size}</p>
                        </div>

                        <button
                          type="button"
                          className="bag-remove"
                          onClick={() =>
                            removeFromCart(item.id, item.size)
                          }
                        >
                          ×
                        </button>
                      </div>

                      <div className="bag-item-price-row">
                        <strong>
                          ₹{Number(item.price || 0).toLocaleString("en-IN")}
                        </strong>

                        <span>
                          {Number(item.stock || 0) > 0
                            ? `${item.stock} in stock`
                            : "Sold out"}
                        </span>
                      </div>

                      <div className="bag-quantity">
                        <button
                          type="button"
                          aria-label={`Decrease ${item.name} quantity`}
                          onClick={() =>
                            decreaseQuantity(item.id, item.size)
                          }
                        >
                          −
                        </button>

                        <span>{item.quantity}</span>

                        <button
                          type="button"
                          aria-label={`Increase ${item.name} quantity`}
                          disabled={
                            Number(item.stock || 0) > 0 &&
                            Number(item.quantity || 1) >= Number(item.stock || 0)
                          }
                          onClick={() =>
                            increaseQuantity(item.id, item.size)
                          }
                        >
                          +
                        </button>
                      </div>

                      <div className="bag-line-total">
                        <span>ITEM TOTAL</span>
                        <strong>
                          ₹{(
                            Number(item.price || 0) *
                            Number(item.quantity || 1)
                          ).toLocaleString("en-IN")}
                        </strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="bag-drawer-footer">
                <div className="bag-subtotal">
                  <span>SUBTOTAL</span>
                  <strong>
                    ₹{Number(cartTotal || 0).toLocaleString("en-IN")}
                  </strong>
                </div>

                <p>
                  Free standard delivery. Final order details are verified at checkout.
                </p>

                <button
                  type="button"
                  className="bag-checkout-button"
                  onClick={goToCheckoutFromBag}
                >
                  CHECKOUT
                </button>

                <button
                  type="button"
                  className="bag-continue-button"
                  onClick={closeBagDrawer}
                >
                  CONTINUE SHOPPING
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    );
  }

  function renderQuickView() {
    if (!quickViewProduct) {
      return null;
    }

    const sizes =
      Array.isArray(quickViewProduct.sizes)
        ? quickViewProduct.sizes
        : [];

    const stock =
      Number(
        quickViewProduct.stock || 0
      );

    return (
      <div
        className="lume-quick-view-overlay"
        onClick={closeQuickView}
      >
        <section
          className="lume-quick-view"
          onClick={(event) =>
            event.stopPropagation()
          }
        >
          <button
            type="button"
            className="quick-view-close"
            aria-label="Close quick view"
            onClick={closeQuickView}
          >
            ×
          </button>

          <div className="quick-view-image">
            <img
              src={resolveProductImage(quickViewProduct)}
              alt={quickViewProduct.name}
              onError={(event) =>
                handleProductImageError(event, quickViewProduct)
              }
            />
          </div>

          <div className="quick-view-content">
            <p className="quick-view-eyebrow">
              {quickViewProduct.category || "LUMÉ"}
            </p>

            <h2>
              {quickViewProduct.name}
            </h2>

            <div className="quick-view-rating">
              <span>
                ★ {Number(
                  quickViewProduct.rating || 0
                ).toFixed(1)}
              </span>

              <span>
                {stock > 0
                  ? `${stock} IN STOCK`
                  : "SOLD OUT"}
              </span>
            </div>

            <div className="quick-view-price">
              ₹{Number(
                quickViewProduct.price || 0
              ).toLocaleString("en-IN")}
            </div>

            {quickViewProduct.description && (
              <p className="quick-view-description">
                {quickViewProduct.description}
              </p>
            )}

            <div className="quick-view-section">
              <div className="quick-view-section-title">
                <span>SELECT SIZE</span>
                {quickViewSize && (
                  <strong>
                    {quickViewSize}
                  </strong>
                )}
              </div>

              <div className="quick-view-sizes">
                {sizes.map((size) => (
                  <button
                    type="button"
                    key={size}
                    className={
                      quickViewSize === size
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setQuickViewSize(size)
                    }
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="quick-view-section">
              <span className="quick-view-label">
                QUANTITY
              </span>

              <div className="quick-view-quantity">
                <button
                  type="button"
                  onClick={decreaseQuickViewQuantity}
                >
                  −
                </button>

                <span>
                  {quickViewQuantity}
                </span>

                <button
                  type="button"
                  disabled={
                    stock <= 0 ||
                    quickViewQuantity >= stock
                  }
                  onClick={increaseQuickViewQuantity}
                >
                  +
                </button>
              </div>
            </div>

            <div className="quick-view-actions">
              <button
                type="button"
                className="quick-view-wishlist"
                onClick={() =>
                  toggleWishlist(
                    quickViewProduct
                  )
                }
                aria-label="Toggle wishlist"
              >
                {isWishlisted(
                  quickViewProduct.id
                )
                  ? "♥"
                  : "♡"}
              </button>

              <button
                type="button"
                className="quick-view-add"
                disabled={stock <= 0}
                onClick={addQuickViewToBag}
              >
                {stock <= 0
                  ? "SOLD OUT"
                  : "ADD TO BAG"}
              </button>
            </div>

            <button
              type="button"
              className="quick-view-buy"
              disabled={stock <= 0}
              onClick={buyQuickViewNow}
            >
              BUY NOW
            </button>

            <button
              type="button"
              className="quick-view-full"
              onClick={() => {
                const product =
                  quickViewProduct;

                closeQuickView();

                openProduct(product);
              }}
            >
              VIEW FULL DETAILS →
            </button>
          </div>
        </section>
      </div>
    );
  }

  // =====================================================
  // AUTH MODAL
  // =====================================================

  function renderAuth() {
    if (
      !showAuth
    ) {
      return null;
    }

    return (
      <Auth
        onClose={() =>
          setShowAuth(false)
        }
      />
    );
  }

  // =====================================================
  // INNER PAGE HEADER
  // =====================================================

  function renderInnerHeader(
    title = ""
  ) {
    return (
      <>
        <header className="lume-inner-header">

          <button
            type="button"
            className="inner-back"
            onClick={goHome}
            aria-label="Go back home"
          >
            ‹
          </button>

          <button
            type="button"
            className="inner-logo"
            onClick={goHome}
          >
            L U M É
          </button>

          <div className="inner-actions">

            {title && (
              <span className="inner-title">
                {title}
              </span>
            )}

            <button
              type="button"
              className="inner-wishlist"
              onClick={openWishlistPage}
              aria-label="Open wishlist"
            >
              ♡

              {wishlist.length > 0 && (
                <span>
                  {wishlist.length}
                </span>
              )}
            </button>

            <button
              type="button"
              className="inner-account"
              onClick={openAccount}
              aria-label={
                user
                  ? "Open account menu"
                  : "Sign in"
              }
            >
              <span className="inner-account-icon">
                {user ? "●" : "○"}
              </span>

              <span className="inner-account-label">
                {user ? "ACCOUNT" : "SIGN IN"}
              </span>
            </button>

            <button
              type="button"
              className="inner-bag"
              onClick={openBagDrawer}
              aria-label="Open bag"
            >
              ▢

              {cartItems > 0 && (
                <span>
                  {cartItems}
                </span>
              )}
            </button>

          </div>

        </header>

        {user && accountMenuOpen && (
          <div className="lume-floating-account inner-page-account-menu">

            <button
              type="button"
              className="floating-account-close"
              onClick={() =>
                setAccountMenuOpen(false)
              }
              aria-label="Close account menu"
            >
              ×
            </button>

            <p>ACCOUNT</p>

            <strong>
              {getUserName()}
            </strong>

            {user.email && (
              <span>
                {user.email}
              </span>
            )}

            {!user.emailVerified && (
              <button
                type="button"
                onClick={checkEmailVerification}
              >
                {checkingVerification
                  ? "CHECKING..."
                  : "VERIFY EMAIL"}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                resetPages();
                setAccountMenuOpen(false);
                setShowProfile(true);
                scrollTop();
              }}
            >
              MY PROFILE
            </button>

            <button
              type="button"
              onClick={() => {
                resetPages();
                setAccountMenuOpen(false);
                setShowOrders(true);
                scrollTop();
              }}
            >
              MY ORDERS
            </button>

            <button
              type="button"
              onClick={openWishlistPage}
            >
              WISHLIST ({wishlist.length})
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    resetPages();
                    setAccountMenuOpen(false);
                    setShowAdminProducts(true);
                    scrollTop();
                  }}
                >
                  ADMIN PRODUCTS
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetPages();
                    setAccountMenuOpen(false);
                    setShowAdminOrders(true);
                    scrollTop();
                  }}
                >
                  ADMIN ORDERS
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleLogout}
            >
              SIGN OUT
            </button>

          </div>
        )}
      </>
    );
  }

  function renderFooter() {
    function handleNewsletterSubmit(event) {
      event.preventDefault();

      const email = newsletterEmail.trim();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setNewsletterMessage("Enter a valid email address.");
        return;
      }

      setNewsletterMessage("Welcome to LUMÉ.");
      setNewsletterEmail("");
    }

    const footerShopLinks = [
      ["NEW ARRIVALS", "All"],
      ["SHIRTS", "Shirts"],
      ["T-SHIRTS", "T-Shirts"],
      ["BOTTOMS", "Trousers"],
      ["HOODIES", "Hoodies"],
    ];

    return (
      <footer className="lume-site-footer">
        <section className="lume-newsletter">
          <div className="newsletter-copy">
            <p>LUMÉ NOTES</p>
            <h2>Wear your story.</h2>
            <span>
              New drops, styling notes and collection updates — delivered
              occasionally.
            </span>
          </div>

          <form
            className="newsletter-form"
            onSubmit={handleNewsletterSubmit}
          >
            <label htmlFor="lume-newsletter-email">EMAIL ADDRESS</label>

            <div>
              <input
                id="lume-newsletter-email"
                type="email"
                value={newsletterEmail}
                onChange={(event) => {
                  setNewsletterEmail(event.target.value);
                  setNewsletterMessage("");
                }}
                placeholder="you@example.com"
                autoComplete="email"
              />

              <button type="submit">JOIN →</button>
            </div>

            {newsletterMessage && (
              <span className="newsletter-message">
                {newsletterMessage}
              </span>
            )}
          </form>
        </section>

        <section className="lume-footer-links">
          <div className="footer-brand-column">
            <button
              type="button"
              className="footer-logo"
              onClick={goHome}
            >
              LUMÉ
            </button>

            <p>WEAR YOUR STORY</p>

            <span>
              Minimal clothing for everyday expression.
            </span>
          </div>

          <div className="footer-link-column">
            <h3>SHOP</h3>

            {footerShopLinks.map(([label, category]) => (
              <button
                type="button"
                key={label}
                onClick={() => openShop(category)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="footer-link-column">
            <h3>HELP</h3>

            <button type="button" onClick={openAccount}>
              MY ACCOUNT
            </button>

            <button type="button" onClick={() => setShowOrders(true)}>
              MY ORDERS
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/shipping.html";
              }}
            >
              SHIPPING
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/returns.html";
              }}
            >
              RETURNS
            </button>

            <a href="mailto:support@lume.store">CONTACT</a>
          </div>

          <div className="footer-link-column">
            <h3>COMPANY</h3>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/about.html";
              }}
            >
              ABOUT LUMÉ
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/privacy.html";
              }}
            >
              PRIVACY
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/terms.html";
              }}
            >
              TERMS
            </button>
          </div>

          <div className="footer-link-column footer-social-column">
            <h3>FOLLOW</h3>
            <span>INSTAGRAM</span>
            <span>PINTEREST</span>
            <span>YOUTUBE</span>
          </div>
        </section>

        <section className="lume-footer-bottom">
          <span>© 2026 LUMÉ. ALL RIGHTS RESERVED.</span>
          <span>INDIA · INR ₹</span>
          <button
            type="button"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
          >
            BACK TO TOP ↑
          </button>
        </section>
      </footer>
    );
  }

  // =====================================================
  // PROFILE PAGE
  // =====================================================

  if (
    showProfile
  ) {
    return (
      <div className="store">

        {renderInnerHeader()}

        <Profile
          onBack={
            goHome
          }
        />

        {renderAuth()}

        {renderQuickView()}

        {renderBagDrawer()}

      </div>
    );
  }

  // =====================================================
  // ADMIN PRODUCTS
  // =====================================================

  if (
    showAdminProducts &&
    isAdmin
  ) {
    return (
      <div className="store">

        {renderInnerHeader()}

        <AdminProducts
          onBack={
            goHome
          }
        />

        {renderAuth()}

        {renderBagDrawer()}

      </div>
    );
  }

  // =====================================================
  // ADMIN ORDERS
  // =====================================================

  if (
    showAdminOrders &&
    isAdmin
  ) {
    return (
      <div className="store">

        {renderInnerHeader()}

        <AdminOrders
          onBack={
            goHome
          }
        />

        {renderAuth()}

        {renderBagDrawer()}

      </div>
    );
  }

  // =====================================================
  // MY ORDERS
  // =====================================================

  if (
    showOrders
  ) {
    return (
      <div className="store">

        {renderInnerHeader()}

        <MyOrders
          onBack={
            goHome
          }
        />

        {renderAuth()}

        {renderBagDrawer()}

      </div>
    );
  }

  function openBagDrawer() {
    setBagDrawerOpen(true);
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
  }

  function renderSearchOverlay() {
    if (!searchOpen) {
      return null;
    }

    const visibleResults = liveSearchResults.slice(0, 8);
    const popularCategories = [
      "Shirts",
      "T-Shirts",
      "Trousers",
      "Hoodies",
    ];

    return (
      <div className="lume-search-overlay">
        <div className="search-overlay-header">
          <button
            type="button"
            className="search-brand"
            onClick={() => {
              closeSearchOverlay();
              goHome();
            }}
          >
            LUMÉ
          </button>

          <button
            type="button"
            className="search-close"
            aria-label="Close search"
            onClick={() => closeSearchOverlay()}
          >
            ×
          </button>
        </div>

        <div className="search-overlay-main">
          <div className="search-input-wrap">
            <span className="search-input-icon">⌕</span>

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search LUMÉ"
              autoFocus
              aria-label="Search products"
            />

            {searchTerm && (
              <button
                type="button"
                className="search-clear-input"
                onClick={() => setSearchTerm("")}
              >
                CLEAR
              </button>
            )}
          </div>

          <div className="search-overlay-content">
            <aside className="search-discovery">
              {recentSearches.length > 0 && (
                <section className="search-discovery-section">
                  <div className="search-section-heading">
                    <span>RECENT SEARCHES</span>

                    <button
                      type="button"
                      onClick={clearRecentSearches}
                    >
                      CLEAR
                    </button>
                  </div>

                  <div className="recent-search-list">
                    {recentSearches.map((item) => (
                      <button
                        type="button"
                        key={item}
                        onClick={() => setSearchTerm(item)}
                      >
                        <span>↗</span>
                        {item}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="search-discovery-section">
                <div className="search-section-heading">
                  <span>POPULAR CATEGORIES</span>
                </div>

                <div className="search-category-list">
                  {popularCategories.map((category) => (
                    <button
                      type="button"
                      key={category}
                      onClick={() => searchCategory(category)}
                    >
                      {category}
                      <span>→</span>
                    </button>
                  ))}
                </div>
              </section>
            </aside>

            <section className="search-results-panel">
              {!normalizedSearchTerm ? (
                <div className="search-start-message">
                  <p>SEARCH THE COLLECTION</p>
                  <h2>Find your next LUMÉ piece.</h2>
                  <span>
                    Search by product name or category.
                  </span>
                </div>
              ) : visibleResults.length > 0 ? (
                <>
                  <div className="search-results-heading">
                    <div>
                      <span>SEARCH RESULTS</span>
                      <strong>
                        {liveSearchResults.length} MATCH
                        {liveSearchResults.length === 1 ? "" : "ES"}
                      </strong>
                    </div>

                    <span>“{searchTerm.trim()}”</span>
                  </div>

                  <div className="search-results-grid">
                    {visibleResults.map((product) => (
                      <button
                        type="button"
                        className="search-result-card"
                        key={product.id}
                        onClick={() => openSearchProduct(product)}
                      >
                        <div className="search-result-image">
                          <img
                            src={resolveProductImage(product)}
                            alt={product.name}
                            onError={(event) =>
                              handleProductImageError(event, product)
                            }
                          />

                          <span
                            className={
                              Number(product.stock || 0) > 0
                                ? "available"
                                : "sold-out"
                            }
                          >
                            {Number(product.stock || 0) > 0
                              ? "IN STOCK"
                              : "SOLD OUT"}
                          </span>
                        </div>

                        <div className="search-result-info">
                          <span>{product.category}</span>
                          <h3>{product.name}</h3>
                          <strong>
                            ₹{Number(product.price || 0).toLocaleString("en-IN")}
                          </strong>
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="search-view-all"
                    onClick={showAllSearchResults}
                  >
                    VIEW ALL {liveSearchResults.length} RESULTS →
                  </button>
                </>
              ) : (
                <div className="search-no-results">
                  <span>NO RESULTS</span>
                  <h2>Nothing matched “{searchTerm.trim()}”.</h2>
                  <p>
                    Try another product name or browse one of the categories.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    );
  }


  function openQuickView(product) {
    setQuickViewProduct(product);

    const sizes =
      Array.isArray(product.sizes)
        ? product.sizes
        : [];

    setQuickViewSize(
      sizes.length === 1
        ? sizes[0]
        : ""
    );

    setQuickViewQuantity(1);

    setBagDrawerOpen(false);
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
  }

  function closeQuickView() {
    setQuickViewProduct(null);
    setQuickViewSize("");
    setQuickViewQuantity(1);
  }

  function increaseQuickViewQuantity() {
    if (!quickViewProduct) {
      return;
    }

    const stock =
      Number(
        quickViewProduct.stock || 0
      );

    setQuickViewQuantity(
      (current) =>
        current < stock
          ? current + 1
          : current
    );
  }

  function decreaseQuickViewQuantity() {
    setQuickViewQuantity(
      (current) =>
        current > 1
          ? current - 1
          : 1
    );
  }

  function addQuickViewToBag() {
    if (!quickViewProduct) {
      return;
    }

    const success =
      handleAddToCart(
        quickViewProduct,
        quickViewQuantity,
        quickViewSize
      );

    if (success) {
      closeQuickView();
      openBagDrawer();
    }
  }

  function buyQuickViewNow() {
    if (!quickViewProduct) {
      return;
    }

    const product =
      quickViewProduct;

    const quantity =
      quickViewQuantity;

    const size =
      quickViewSize;

    closeQuickView();

    buyNow(
      product,
      quantity,
      size
    );
  }

  function closeBagDrawer() {
    setBagDrawerOpen(false);
  }

  function goToCheckoutFromBag() {
    setBagDrawerOpen(false);
    openCheckout();
  }

  // =====================================================
  // WISHLIST PAGE
  // =====================================================

  if (
    showWishlistPage
  ) {
    return (
      <div className="store lume-wishlist-page">
        {renderInnerHeader("WISHLIST")}

        <main className="wishlist-page">
          <section className="wishlist-hero">
            <div>
              <p>SAVED PIECES</p>
              <h1>Your wishlist.</h1>
              <span>
                Keep the pieces you love in one place.
              </span>
            </div>

            <strong>
              {wishlist.length} ITEM
              {wishlist.length === 1 ? "" : "S"}
            </strong>
          </section>

          {wishlist.length === 0 ? (
            <section className="wishlist-empty">
              <span>♡</span>
              <h2>Nothing saved yet.</h2>
              <p>
                Tap the heart on a product to save it here for later.
              </p>

              <button
                type="button"
                onClick={() => openShop("All")}
              >
                EXPLORE THE COLLECTION →
              </button>
            </section>
          ) : (
            <section className="wishlist-grid">
              {wishlist.map((item) => {
                const liveProduct =
                  products.find(
                    (product) =>
                      product.id === item.id
                  ) || item;

                const stock =
                  Number(
                    liveProduct.stock || 0
                  );

                return (
                  <article
                    className="wishlist-card"
                    key={liveProduct.id}
                  >
                    <button
                      type="button"
                      className="wishlist-image-button"
                      onClick={() =>
                        openProduct(
                          liveProduct
                        )
                      }
                    >
                      <div className="wishlist-image">
                        <img
                          src={resolveProductImage(
                            liveProduct
                          )}
                          alt={
                            liveProduct.name
                          }
                          onError={(event) =>
                            handleProductImageError(
                              event,
                              liveProduct
                            )
                          }
                        />

                        <span
                          className={
                            stock > 0
                              ? "available"
                              : "sold-out"
                          }
                        >
                          {stock > 0
                            ? "IN STOCK"
                            : "SOLD OUT"}
                        </span>
                      </div>
                    </button>

                    <div className="wishlist-card-info">
                      <div>
                        <span>
                          {liveProduct.category}
                        </span>

                        <h2>
                          {liveProduct.name}
                        </h2>

                        <p>
                          ★{" "}
                          {Number(
                            liveProduct.rating ||
                              0
                          ).toFixed(1)}
                        </p>
                      </div>

                      <strong>
                        ₹
                        {Number(
                          liveProduct.price ||
                            0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </div>

                    <div className="wishlist-card-actions">
                      <button
                        type="button"
                        className="wishlist-options"
                        onClick={() =>
                          openProduct(
                            liveProduct
                          )
                        }
                      >
                        {stock > 0
                          ? "CHOOSE OPTIONS"
                          : "VIEW PRODUCT"}
                      </button>

                      <button
                        type="button"
                        className="wishlist-remove"
                        onClick={() =>
                          removeWishlistItem(
                            liveProduct.id
                          )
                        }
                        aria-label={`Remove ${liveProduct.name} from wishlist`}
                      >
                        REMOVE
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {wishlist.length > 0 && (
            <section className="wishlist-bottom">
              <p>
                Ready to discover more?
              </p>

              <button
                type="button"
                onClick={() =>
                  openShop("All")
                }
              >
                CONTINUE SHOPPING →
              </button>
            </section>
          )}
        </main>

        {renderAuth()}
        {renderBagDrawer()}
      </div>
    );
  }

  // =====================================================
  // CHECKOUT
  // =====================================================

  if (
    showCheckout
  ) {
    return (
      <div className="store">

        {renderInnerHeader(
          "BAG"
        )}

        <Checkout
          cart={
            cart
          }
          cartTotal={
            cartTotal
          }
          onBack={
            goHome
          }
          onOrderPlaced={
            handleOrderPlaced
          }
        />

        {renderAuth()}

        {renderBagDrawer()}

      </div>
    );
  }

  // =====================================================
  // PRODUCT DETAILS
  // =====================================================

  if (
    selectedProduct
  ) {
    return (
      <div className="store lume-product-page">

        {renderInnerHeader()}

        <ProductDetails
          product={
            selectedProduct
          }

          onBack={() => {
            setSelectedProduct(
              null
            );

            setShowShop(true);
          }}

          onAddToCart={
            handleAddToCart
          }

          onBuyNow={
            buyNow
          }

          onGoToBag={
            openBagDrawer
          }
          relatedProducts={
            products
              .filter(
                (item) =>
                  item.id !== selectedProduct.id
              )
              .slice(0, 4)
          }
          onOpenProduct={
            openProduct
          }
        />

        {renderAuth()}

        {renderBagDrawer()}

      </div>
    );
  }

  // =====================================================
  // SHOP PAGE
  // =====================================================

  if (
    showShop
  ) {
    return (
      <div className="store lume-shop-page">

        {renderInnerHeader()}

        {renderAuth()}

        {renderQuickView()}

        {renderBagDrawer()}

        {/* SHOP CONTROLS */}

        <section className="shop-controls">

          <button
            type="button"
            className={filterOpen ? "filter-trigger active" : "filter-trigger"}
            onClick={() => setFilterOpen((value) => !value)}
          >
            ☰
            <span>FILTER</span>
          </button>

          <div className="shop-sort">

            <span>
              ↕
            </span>

            <select
              value={
                sortOption
              }
              onChange={(
                event
              ) =>
                setSortOption(
                  event.target.value
                )
              }
            >
              <option>
                Newest
              </option>

              <option>
                Price Low
              </option>

              <option>
                Price High
              </option>

              <option>
                Rating
              </option>

            </select>

          </div>

          <div className="shop-view-line">
            <span />
          </div>

        </section>

        {filterOpen && (
          <div
            className="lume-filter-overlay"
            onClick={() => setFilterOpen(false)}
          >
            <aside
              className="lume-filter-drawer"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="filter-drawer-header">
                <div>
                  <p>FILTERS</p>
                  <strong>{filteredProducts.length} PRODUCTS</strong>
                </div>

                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setFilterOpen(false)}
                >
                  ×
                </button>
              </div>

              <div className="filter-drawer-body">
                <div className="filter-group">
                  <span>CATEGORY</span>
                  <div className="filter-options">
                    {["All", "Shirts", "T-Shirts", "Trousers", "Hoodies"].map(
                      (value) => (
                        <button
                          type="button"
                          key={value}
                          className={activeCategory === value ? "active" : ""}
                          onClick={() => setActiveCategory(value)}
                        >
                          {value}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="filter-group">
                  <span>SIZE</span>
                  <div className="filter-options">
                    {["All", "S", "M", "L", "XL", "28", "30", "32", "34", "36"].map(
                      (value) => (
                        <button
                          type="button"
                          key={value}
                          className={sizeFilter === value ? "active" : ""}
                          onClick={() => setSizeFilter(value)}
                        >
                          {value}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="filter-group">
                  <span>PRICE</span>
                  <div className="filter-options">
                    {["All", "Under 1000", "1000-2000", "Above 2000"].map(
                      (value) => (
                        <button
                          type="button"
                          key={value}
                          className={priceFilter === value ? "active" : ""}
                          onClick={() => setPriceFilter(value)}
                        >
                          {value === "Under 1000"
                            ? "Under ₹1,000"
                            : value === "1000-2000"
                              ? "₹1,000 – ₹2,000"
                              : value === "Above 2000"
                                ? "Above ₹2,000"
                                : "All"}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="filter-group">
                  <span>AVAILABILITY</span>
                  <div className="filter-options">
                    {["All", "In Stock", "Out of Stock"].map((value) => (
                      <button
                        type="button"
                        key={value}
                        className={stockFilter === value ? "active" : ""}
                        onClick={() => setStockFilter(value)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="filter-group">
                  <span>RATING</span>
                  <div className="filter-options">
                    {["All", "4.5+", "4.0+"].map((value) => (
                      <button
                        type="button"
                        key={value}
                        className={ratingFilter === value ? "active" : ""}
                        onClick={() => setRatingFilter(value)}
                      >
                        {value === "All" ? "All ratings" : `${value} ★`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="filter-drawer-footer">
                <button
                  type="button"
                  className="filter-clear"
                  onClick={() => {
                    setActiveCategory("All");
                    setSizeFilter("All");
                    setPriceFilter("All");
                    setStockFilter("All");
                    setRatingFilter("All");
                  }}
                >
                  CLEAR ALL
                </button>

                <button
                  type="button"
                  className="filter-apply"
                  onClick={() => setFilterOpen(false)}
                >
                  SHOW {filteredProducts.length} RESULTS
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* CATEGORY SCROLLER */}

        <section className="shop-category-tabs">

          {[
            "All",
            "Shirts",
            "T-Shirts",
            "Trousers",
            "Hoodies",
          ].map(
            (category) => (
              <button
                key={
                  category
                }
                type="button"
                className={
                  activeCategory ===
                  category
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveCategory(
                    category
                  )
                }
              >
                {
                  category
                }
              </button>
            )
          )}

        </section>

        {/* PREMIUM SEARCH */}

        {renderSearchOverlay()}

        {/* PRODUCTS */}

        <section className="lume-product-grid">

          {productsLoading && (
            <div className="shop-message">
              Loading products...
            </div>
          )}

          {!productsLoading &&
            productsError && (
            <div className="shop-message">
              {
                productsError
              }
            </div>
          )}

          {!productsLoading &&
            !productsError &&
            filteredProducts.map(
              (product) => {

                const price =
                  Number(
                    product.price ||
                      0
                  );

                const originalPrice =
                  Number(
                    product.originalPrice ||
                      product.compareAtPrice ||
                      0
                  );

                const discount =
                  originalPrice >
                  price
                    ? Math.round(
                        ((originalPrice -
                          price) /
                          originalPrice) *
                          100
                      )
                    : 0;

                return (

                  <article
                    className="lume-product-card"
                    key={
                      product.id
                    }
                    onClick={() =>
                      openProduct(
                        product
                      )
                    }
                  >

                    <div className="lume-product-image">
                  <button
                    type="button"
                    className="quick-view-card-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openQuickView(product);
                    }}
                  >
                    QUICK VIEW
                  </button>
                  <span
                    className={`stock-badge ${
                      Number(product.stock || 0) <= 0 ? "sold-out" : ""
                    }`}
                  >
                    {Number(product.stock || 0) <= 0
                      ? "SOLD OUT"
                      : Number(product.stock || 0) <= 5
                        ? `ONLY ${product.stock} LEFT`
                        : "IN STOCK"}
                  </span>

                      <img
                        src={resolveProductImage(product)}
                        alt={product.name}
                        onError={(event) =>
                          handleProductImageError(event, product)
                        }
                      />

                      {product.badge && (
                        <span className="exclusive-badge">
                          {
                            product.badge
                          }
                        </span>
                      )}

                    </div>

                    <div className="lume-product-card-info">

                      <div className="lume-product-heading">

                        <h3>
                          {
                            product.name
                          }
                        </h3>

                        <button
                          type="button"
                          onClick={(
                            event
                          ) => {
                            event.stopPropagation();

                            toggleWishlist(
                              product
                            );
                          }}
                        >
                          {isWishlisted(
                            product.id
                          )
                            ? "♥"
                            : "♡"}
                        </button>

                      </div>

                      <div className="lume-product-pricing">

                        {originalPrice >
                          price && (
                          <del>
                            ₹
                            {originalPrice.toLocaleString(
                              "en-IN"
                            )}
                          </del>
                        )}

                        <strong>
                          ₹
                          {price.toLocaleString(
                            "en-IN"
                          )}
                        </strong>

                        {discount >
                          0 && (
                          <span>
                            {discount}% OFF
                          </span>
                        )}

                      </div>

                    </div>

                  </article>

                );
              }
            )}

        </section>

        {renderFooter()}

      {/* MOBILE BOTTOM NAV */}

        <MobileBottomNav />

      </div>
    );
  }

  // =====================================================
  // MOBILE BOTTOM NAV COMPONENT
  // =====================================================

  function MobileBottomNav() {
    return (
      <nav className="lume-mobile-bottom-nav">

        <button
          type="button"
          onClick={
            goHome
          }
        >
          <span>
            ⌂
          </span>

          <small>
            HOME
          </small>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!showShop) {
              resetPages();
              setShowShop(true);
              setActiveCategory("All");
            }

            openSearchOverlay();
          }}
        >
          <span>
            ⌕
          </span>

          <small>
            SEARCH
          </small>
        </button>

        <button
          type="button"
          className="bottom-menu-text"
          onClick={() =>
            setMobileMenuOpen(
              true
            )
          }
        >
          MENU
        </button>

        <button
          type="button"
          onClick={() => {
            if (
              showShop
            ) {
              goHome();

              setTimeout(() => {
                document
                  .getElementById(
                    "ai-stylist-home"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                  });
              }, 150);
            } else {
              document
                .getElementById(
                  "ai-stylist-home"
                )
                ?.scrollIntoView({
                  behavior:
                    "smooth",
                });
            }
          }}
        >
          <span>
            ✨
          </span>

          <small>
            AI
          </small>
        </button>

        <button
          type="button"
          className="bottom-bag"
          onClick={
            openBagDrawer
          }
        >
          <span>
            ▢
          </span>

          {cartItems >
            0 && (
            <b>
              {
                cartItems
              }
            </b>
          )}

          <small>
            BAG
          </small>
        </button>

      </nav>
    );
  }

  // =====================================================
  // CAMPAIGNS
  // =====================================================

  const campaigns = [
    {
      desktopImage: "/images/fresh-desktop.jpg",
      mobileImage: "/images/fresh-mobile.jpg",
      title: "Fresh Arrivals",
      category: "All",
      className: "campaign-fresh",
    },
    {
      desktopImage: "/images/shirt-desktop.jpg",
      mobileImage: "/images/shirt-mobile.jpg",
      title: "Shirts",
      category: "Shirts",
      className: "campaign-shirts",
    },
    {
      desktopImage: "/images/tshirt-desktop.jpg",
      mobileImage: "/images/tshirt-mobile.jpg",
      title: "T-Shirts",
      category: "T-Shirts",
      className: "campaign-tshirts",
    },
    {
      desktopImage: "/images/bottoms-desktop.jpg",
      mobileImage: "/images/bottoms-mobile.jpg",
      title: "Bottoms",
      category: "Trousers",
      className: "campaign-bottoms",
    },
    {
      desktopImage: "/images/hoodie-desktop.jpg",
      mobileImage: "/images/hoodie-mobile.jpg",
      title: "Hoodies",
      category: "Hoodies",
      className: "campaign-hoodies",
    },
    {
      desktopImage: "/images/women-desktop.jpg",
      mobileImage: "/images/women-mobile.jpg",
      title: "Women's Wear",
      category: "All",
      className: "campaign-women",
    },
  ];

  // =====================================================
  // HOME
  // =====================================================

  return (
    <div className="store lume-editorial-home">

      {renderAuth()}

        {renderBagDrawer()}

      {(authLoading ||
        syncingAccount) && (
        <div className="auth-loading">
          {authLoading
            ? "Checking account..."
            : "Syncing your LUMÉ account..."}
        </div>
      )}

      {/* ===============================================
          OVERLAY HEADER
      =============================================== */}

      <header className="lume-overlay-header">

        <div className="desktop-brand-lockup">
          <button
            type="button"
            className="overlay-logo desktop-overlay-logo"
            onClick={goHome}
            aria-label="LUMÉ home"
          >
            LUMÉ
          </button>

          <span className="desktop-brand-tagline">
            WEAR YOUR STORY
          </span>
        </div>

        <nav className="overlay-category-nav">

          <button
            onClick={() =>
              openShop(
                "Shirts"
              )
            }
          >
            SHIRTS
          </button>

          <button
            onClick={() =>
              openShop(
                "T-Shirts"
              )
            }
          >
            T-SHIRTS
          </button>

          <button
            onClick={() =>
              openShop(
                "Trousers"
              )
            }
          >
            BOTTOMS
          </button>

          <button
            onClick={() =>
              openShop(
                "Hoodies"
              )
            }
          >
            HOODIES
          </button>

          <button
            onClick={() =>
              openShop(
                "All"
              )
            }
          >
            WOMEN
          </button>

          <button
            onClick={() =>
              openShop(
                "All"
              )
            }
          >
            SHOP ALL
          </button>

        </nav>

      </header>

      {/* ===============================================
          CAMPAIGN SECTIONS
      =============================================== */}

      <main className="campaign-stack">

        {campaigns.map(
          (
            campaign,
            index
          ) => (

            <section
              className={`lume-campaign ${campaign.className}`}
              key={
                campaign.title +
                index
              }
              role="button"
              tabIndex={0}
              aria-label={`Shop ${campaign.title}`}
              onClick={() =>
                openShop(
                  campaign.category
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  event.preventDefault();

                  openShop(
                    campaign.category
                  );
                }
              }}
            >

              <picture className="campaign-picture">
                <source
                  media="(max-width: 700px)"
                  srcSet={campaign.mobileImage}
                />

                <source
                  media="(min-width: 701px)"
                  srcSet={campaign.desktopImage}
                />

                <img
                  src={campaign.desktopImage}
                  alt={campaign.title}
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                />
              </picture>

            </section>

          )
        )}

      </main>

      {/* ===============================================
          AI STYLIST
      =============================================== */}

      <section
        className="home-ai-block"
        id="ai-stylist-home"
      >

        <div className="home-ai-heading">

          <p>
            LUMÉ AI
          </p>

          <h2>
            YOUR PERSONAL
            <br />
            STYLIST
          </h2>

          <span>
            Tell us your style,
            occasion or budget and
            discover pieces selected
            for you.
          </span>

        </div>

        <AIStylist
          products={
            products
          }

          onViewProduct={
            openProduct
          }

          onAddToCart={
            addFromAIStylist
          }
        />

      </section>

      {/* ===============================================
          COMPLETE FOOTER
      =============================================== */}

      {renderFooter()}

      {/* ===============================================
          ACCOUNT FLOATING MENU
      =============================================== */}

      {user &&
        accountMenuOpen && (

        <div className="lume-floating-account">

          <button
            className="floating-account-close"
            onClick={() =>
              setAccountMenuOpen(
                false
              )
            }
          >
            ×
          </button>

          <p>
            ACCOUNT
          </p>

          <strong>
            {
              getUserName()
            }
          </strong>

          {user.email && (
            <span>
              {
                user.email
              }
            </span>
          )}

          {!user.emailVerified && (

            <button
              type="button"
              onClick={
                checkEmailVerification
              }
            >
              {checkingVerification
                ? "CHECKING..."
                : "VERIFY EMAIL"}
            </button>

          )}

          <button
            onClick={() => {
              resetPages();
              setAccountMenuOpen(false);
              setShowProfile(true);
              scrollTop();
            }}
          >
            MY PROFILE
          </button>

          <button
            onClick={() => {
              resetPages();
              setAccountMenuOpen(false);
              setShowOrders(true);
              scrollTop();
            }}
          >
            MY ORDERS
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => {
                  resetPages();

                  setShowAdminProducts(
                    true
                  );
                }}
              >
                ADMIN PRODUCTS
              </button>

              <button
                onClick={() => {
                  resetPages();

                  setShowAdminOrders(
                    true
                  );
                }}
              >
                ADMIN ORDERS
              </button>
            </>
          )}

          <button
            onClick={
              handleLogout
            }
          >
            SIGN OUT
          </button>

        </div>

      )}

      {/* ===============================================
          MOBILE MENU DRAWER
      =============================================== */}

      {mobileMenuOpen && (

        <div className="lume-mobile-menu-overlay">

          <div className="lume-mobile-menu">

            <div className="mobile-menu-top">

              <strong>
                L U M É
              </strong>

              <button
                type="button"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
              >
                ×
              </button>

            </div>

            <button
              onClick={() =>
                openShop(
                  "Shirts"
                )
              }
            >
              SHIRTS

              <span>
                →
              </span>
            </button>

            <button
              onClick={() =>
                openShop(
                  "T-Shirts"
                )
              }
            >
              T-SHIRTS

              <span>
                →
              </span>
            </button>

            <button
              onClick={() =>
                openShop(
                  "Trousers"
                )
              }
            >
              BOTTOMS

              <span>
                →
              </span>
            </button>

            <button
              onClick={() =>
                openShop(
                  "Hoodies"
                )
              }
            >
              HOODIES

              <span>
                →
              </span>
            </button>

            <button
              onClick={() =>
                openShop(
                  "All"
                )
              }
            >
              SHOP ALL

              <span>
                →
              </span>
            </button>

            <div className="mobile-menu-secondary">

              <button
                onClick={() => {
                  setMobileMenuOpen(
                    false
                  );

                  openAccount();
                }}
              >
                ACCOUNT
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openWishlistPage();
                }}
              >
                WISHLIST (
                {wishlist.length}
                )
              </button>

              <button
                onClick={
                  openBagDrawer
                }
              >
                BAG (
                {
                  cartItems
                }
                )
              </button>

            </div>

          </div>

        </div>

      )}

      {/* ===============================================
          MOBILE BOTTOM NAV
      =============================================== */}

      <MobileBottomNav />

    </div>
  );
}

export default App;