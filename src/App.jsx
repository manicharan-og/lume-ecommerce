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

import {
  auth,
  db,
} from "./firebase";

function App() {
  // =====================================================
  // GUEST CART
  // =====================================================

  function getGuestCart() {
    try {
      const savedCart =
        localStorage.getItem("lume-cart");

      return savedCart
        ? JSON.parse(savedCart)
        : [];
    } catch (error) {
      console.error(
        "Could not load guest cart:",
        error
      );

      return [];
    }
  }

  // =====================================================
  // GUEST WISHLIST
  // =====================================================

  function getGuestWishlist() {
    try {
      const savedWishlist =
        localStorage.getItem(
          "lume-wishlist"
        );

      return savedWishlist
        ? JSON.parse(savedWishlist)
        : [];
    } catch (error) {
      console.error(
        "Could not load guest wishlist:",
        error
      );

      return [];
    }
  }

  // =====================================================
  // CART
  // =====================================================

  const [
    cart,
    setCart,
  ] = useState(() =>
    getGuestCart()
  );

  // =====================================================
  // WISHLIST
  // =====================================================

  const [
    wishlist,
    setWishlist,
  ] = useState(() =>
    getGuestWishlist()
  );

  // =====================================================
  // WEBSITE STATE
  // =====================================================

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(null);

  const [
    showCheckout,
    setShowCheckout,
  ] = useState(false);

  const [
    showOrders,
    setShowOrders,
  ] = useState(false);

  const [
    showProfile,
    setShowProfile,
  ] = useState(false);

  const [
    showAdminProducts,
    setShowAdminProducts,
  ] = useState(false);

  const [
    showAdminOrders,
    setShowAdminOrders,
  ] = useState(false);

  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false);

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    activeCategory,
    setActiveCategory,
  ] = useState("All");

  // =====================================================
  // AUTH
  // =====================================================

  const [
    user,
    setUser,
  ] = useState(null);

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  const [
    showAuth,
    setShowAuth,
  ] = useState(false);

  const [
    accountMenuOpen,
    setAccountMenuOpen,
  ] = useState(false);

  const [
    checkingVerification,
    setCheckingVerification,
  ] = useState(false);

  const [
    isAdmin,
    setIsAdmin,
  ] = useState(false);

  // =====================================================
  // FIRESTORE USER SYNC
  // =====================================================

  const [
    userDataReady,
    setUserDataReady,
  ] = useState(false);

  const [
    syncingAccount,
    setSyncingAccount,
  ] = useState(false);

  // =====================================================
  // PRODUCTS
  // =====================================================

  const [
    products,
    setProducts,
  ] = useState([]);

  const [
    productsLoading,
    setProductsLoading,
  ] = useState(true);

  const [
    productsError,
    setProductsError,
  ] = useState("");

  // =====================================================
  // AUTH LISTENER
  // =====================================================

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
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
            setShowAdminProducts(false);
            setShowAdminOrders(false);
          }
        }
      );

    return unsubscribe;
  }, []);

  // =====================================================
  // LOAD USER CART / WISHLIST / ROLE
  // =====================================================

  useEffect(() => {
    async function loadUserData() {
      if (!user) {
        setIsAdmin(false);

        setCart(
          getGuestCart()
        );

        setWishlist(
          getGuestWishlist()
        );

        setUserDataReady(true);

        return;
      }

      try {
        setSyncingAccount(true);

        const userReference =
          doc(
            db,
            "users",
            user.uid
          );

        const userSnapshot =
          await getDoc(
            userReference
          );

        const guestCart =
          getGuestCart();

        const guestWishlist =
          getGuestWishlist();

        // EXISTING USER
        if (
          userSnapshot.exists()
        ) {
          const data =
            userSnapshot.data();

          // ADMIN CHECK
          setIsAdmin(
            data.role === "admin"
          );

          const remoteCart =
            Array.isArray(data.cart)
              ? data.cart
              : null;

          const remoteWishlist =
            Array.isArray(
              data.wishlist
            )
              ? data.wishlist
              : null;

          const cartToUse =
            remoteCart !== null
              ? remoteCart
              : guestCart;

          const wishlistToUse =
            remoteWishlist !== null
              ? remoteWishlist
              : guestWishlist;

          setCart(cartToUse);

          setWishlist(
            wishlistToUse
          );

          await setDoc(
            userReference,
            {
              uid:
                user.uid,

              email:
                user.email || "",

              emailVerified:
                user.emailVerified,

              cart:
                cartToUse,

              wishlist:
                wishlistToUse,

              updatedAt:
                serverTimestamp(),
            },
            {
              merge: true,
            }
          );
        }

        // NEW USER
        else {
          setIsAdmin(false);

          setCart(guestCart);

          setWishlist(
            guestWishlist
          );

          await setDoc(
            userReference,
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
          "Could not load Firestore user data:",
          error
        );

        setIsAdmin(false);

        setCart(
          getGuestCart()
        );

        setWishlist(
          getGuestWishlist()
        );

        setUserDataReady(true);
      } finally {
        setSyncingAccount(false);
      }
    }

    if (!authLoading) {
      loadUserData();
    }
  }, [
    user,
    authLoading,
  ]);

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
      console.error(
        "Could not save guest cart:",
        error
      );
    }
  }, [
    cart,
    user,
  ]);

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
        JSON.stringify(
          wishlist
        )
      );
    } catch (error) {
      console.error(
        "Could not save guest wishlist:",
        error
      );
    }
  }, [
    wishlist,
    user,
  ]);

  // =====================================================
  // SAVE FIRESTORE CART
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
          "Could not save cart to Firestore:",
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
  // SAVE FIRESTORE WISHLIST
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
          "Could not save wishlist:",
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
  // REAL-TIME PRODUCTS
  // =====================================================

  useEffect(() => {
    setProductsLoading(true);

    setProductsError("");

    const productsReference =
      collection(
        db,
        "products"
      );

    const unsubscribe =
      onSnapshot(
        productsReference,

        (snapshot) => {
          const loadedProducts =
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

          loadedProducts.sort(
            (a, b) =>
              String(
                a.id || ""
              ).localeCompare(
                String(
                  b.id || ""
                ),
                undefined,
                {
                  numeric: true,
                }
              )
          );

          setProducts(
            loadedProducts
          );

          setProductsLoading(
            false
          );
        },

        (error) => {
          console.error(
            "Could not load products:",
            error
          );

          setProductsError(
            "Could not load products."
          );

          setProductsLoading(
            false
          );
        }
      );

    return () =>
      unsubscribe();
  }, []);

  // =====================================================
  // FILTERED PRODUCTS
  // =====================================================

  const filteredProducts =
    products.filter(
      (product) => {
        const matchesCategory =
          activeCategory ===
            "All" ||
          product.category ===
            activeCategory;

        const search =
          searchTerm
            .toLowerCase()
            .trim();

        const matchesSearch =
          String(
            product.name || ""
          )
            .toLowerCase()
            .includes(search) ||

          String(
            product.category ||
              ""
          )
            .toLowerCase()
            .includes(search);

        return (
          matchesCategory &&
          matchesSearch
        );
      }
    );

  // =====================================================
  // SCROLL
  // =====================================================

  function scrollToSection(
    id,
    delay = 100
  ) {
    setTimeout(() => {
      const element =
        document.getElementById(
          id
        );

      if (element) {
        element.scrollIntoView({
          behavior:
            "smooth",

          block:
            "start",
        });
      }
    }, delay);
  }

  // =====================================================
  // HOME
  // =====================================================

  function goHome() {
    setSelectedProduct(null);

    setShowCheckout(false);

    setShowOrders(false);

    setShowProfile(false);

    setShowAdminProducts(
      false
    );

    setShowAdminOrders(
      false
    );

    setSearchOpen(false);

    setAccountMenuOpen(false);

    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }, 100);
  }

  // =====================================================
  // CART
  // =====================================================

  function openCart() {
    setSelectedProduct(null);

    setShowCheckout(false);

    setShowOrders(false);

    setShowProfile(false);

    setShowAdminProducts(
      false
    );

    setShowAdminOrders(
      false
    );

    setSearchOpen(false);

    setAccountMenuOpen(false);

    scrollToSection(
      "cart",
      150
    );
  }

  // =====================================================
  // ADD TO CART
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

    const availableStock =
      Number(
        product.stock ?? 0
      );

    const requestedQuantity =
      Number(
        quantity ?? 1
      );

    if (
      availableStock <= 0
    ) {
      alert(
        `${product.name} is currently out of stock.`
      );

      return false;
    }

    if (
      requestedQuantity >
      availableStock
    ) {
      alert(
        `Only ${availableStock} ${
          availableStock === 1
            ? "item is"
            : "items are"
        } available for ${product.name}.`
      );

      return false;
    }

    setCart(
      (currentCart) => {
        const existingProduct =
          currentCart.find(
            (item) =>
              item.id ===
                product.id &&
              item.size ===
                size
          );

        if (
          existingProduct
        ) {
          return currentCart;
        }

        return [
          ...currentCart,
          {
            ...product,
            size,
            quantity:
              requestedQuantity,
          },
        ];
      }
    );

    return true;
  }

  // =====================================================
  // PRODUCT DETAILS ADD TO CART
  // =====================================================

  function handleAddToCart(
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

    const alreadyInCart =
      cart.some(
        (item) =>
          item.id ===
            product.id &&
          item.size === size
      );

    if (alreadyInCart) {
      alert(
        product.name +
          " in size " +
          size +
          " is already in your bag."
      );

      return true;
    }

    return addToCart(
      product,
      quantity,
      size
    );
  }

  // =====================================================
  // AI STYLIST ADD TO CART
  // =====================================================

  function addFromAIStylist(
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

    const alreadyInCart =
      cart.some(
        (item) =>
          item.id ===
            product.id &&
          item.size === size
      );

    if (alreadyInCart) {
      alert(
        product.name +
          " in size " +
          size +
          " is already in your bag."
      );

      return true;
    }

    return addToCart(
      product,
      quantity,
      size
    );
  }

  // =====================================================
  // BUY NOW
  // =====================================================

  function buyNow(
    product,
    quantity = 1,
    size = null
  ) {
    if (!size) {
      alert(
        "Please select a size first."
      );

      return;
    }

    const availableStock =
      Number(
        product.stock ?? 0
      );

    const requestedQuantity =
      Number(
        quantity ?? 1
      );

    if (
      availableStock <= 0
    ) {
      alert(
        `${product.name} is currently out of stock.`
      );

      return;
    }

    if (
      requestedQuantity >
      availableStock
    ) {
      alert(
        `Only ${availableStock} ${
          availableStock === 1
            ? "item is"
            : "items are"
        } available for ${product.name}.`
      );

      return;
    }

    setCart(
      (currentCart) => {
        const existingProduct =
          currentCart.find(
            (item) =>
              item.id ===
                product.id &&
              item.size ===
                size
          );

        if (
          existingProduct
        ) {
          return currentCart;
        }

        return [
          ...currentCart,
          {
            ...product,
            size,
            quantity:
              requestedQuantity,
          },
        ];
      }
    );

    setSelectedProduct(null);

    setShowCheckout(false);

    setShowProfile(false);

    setShowAdminProducts(
      false
    );

    setShowAdminOrders(
      false
    );

    scrollToSection(
      "cart",
      150
    );
  }

  // =====================================================
  // INCREASE QUANTITY WITH STOCK LIMIT
  // =====================================================

  function increaseQuantity(
    id,
    size
  ) {
    const product =
      products.find(
        (item) =>
          item.id === id
      );

    const availableStock =
      Number(
        product?.stock ?? 0
      );

    const cartItem =
      cart.find(
        (item) =>
          item.id === id &&
          item.size === size
      );

    const currentQuantity =
      Number(
        cartItem?.quantity ?? 0
      );

    if (!product) {
      alert(
        "This product is no longer available."
      );

      return;
    }

    if (
      availableStock <= 0
    ) {
      alert(
        `${product.name} is out of stock.`
      );

      return;
    }

    if (
      currentQuantity >=
      availableStock
    ) {
      alert(
        `Only ${availableStock} ${
          availableStock === 1
            ? "item is"
            : "items are"
        } available for ${product.name}.`
      );

      return;
    }

    setCart(
      (currentCart) =>
        currentCart.map(
          (item) =>
            item.id === id &&
            item.size === size
              ? {
                  ...item,

                  quantity:
                    item.quantity +
                    1,
                }
              : item
        )
    );
  }

  // =====================================================
  // DECREASE QUANTITY
  // =====================================================

  function decreaseQuantity(
    id,
    size
  ) {
    setCart(
      (currentCart) =>
        currentCart
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
              item.quantity > 0
          )
    );
  }

  // =====================================================
  // REMOVE CART
  // =====================================================

  function removeFromCart(
    id,
    size
  ) {
    setCart(
      (currentCart) =>
        currentCart.filter(
          (item) =>
            !(
              item.id === id &&
              item.size === size
            )
        )
    );
  }

  // =====================================================
  // WISHLIST
  // =====================================================

  function toggleWishlist(
    product
  ) {
    setWishlist(
      (
        currentWishlist
      ) => {
        const exists =
          currentWishlist.some(
            (item) =>
              item.id ===
              product.id
          );

        if (exists) {
          return currentWishlist.filter(
            (item) =>
              item.id !==
              product.id
          );
        }

        return [
          ...currentWishlist,
          product,
        ];
      }
    );
  }

  function isWishlisted(
    productId
  ) {
    return wishlist.some(
      (item) =>
        item.id ===
        productId
    );
  }

  // =====================================================
  // CART TOTAL
  // =====================================================

  const cartTotal =
    cart.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.price || 0
        ) *
          Number(
            item.quantity || 0
          ),
      0
    );

  // =====================================================
  // CART COUNT
  // =====================================================

  const cartItems =
    cart.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.quantity || 0
        ),
      0
    );

  // =====================================================
  // OPEN PRODUCT
  // =====================================================

  function openProduct(
    product
  ) {
    setSelectedProduct(
      product
    );

    setShowCheckout(false);

    setShowOrders(false);

    setShowProfile(false);

    setShowAdminProducts(
      false
    );

    setShowAdminOrders(
      false
    );

    setSearchOpen(false);

    setAccountMenuOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =====================================================
  // CHECKOUT
  // =====================================================

  function openCheckout() {
    if (cart.length === 0) {
      alert(
        "Your shopping bag is empty."
      );

      return;
    }

    if (!user) {
      alert(
        "Please sign in before proceeding to checkout."
      );

      setShowAuth(true);

      setAccountMenuOpen(false);

      return;
    }

    if (
      !user.emailVerified
    ) {
      alert(
        "Please verify your email before proceeding to checkout."
      );

      setShowCheckout(false);

      setSearchOpen(false);

      setAccountMenuOpen(true);

      return;
    }

    setShowOrders(false);

    setShowProfile(false);

    setShowAdminProducts(
      false
    );

    setShowAdminOrders(
      false
    );

    setSelectedProduct(null);

    setShowCheckout(true);

    setSearchOpen(false);

    setAccountMenuOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =====================================================
  // ORDER COMPLETED
  // =====================================================

  async function handleOrderPlaced(
    order
  ) {
    console.log(
      "Order completed:",
      order
    );

    setCart([]);

    try {
      localStorage.setItem(
        "lume-cart",
        JSON.stringify([])
      );
    } catch (error) {
      console.error(
        "Could not clear local cart:",
        error
      );
    }

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

        console.log(
          "Cart cleared after order."
        );
      } catch (error) {
        console.error(
          "Could not clear Firestore cart after order:",
          error
        );
      }
    }
  }

  // =====================================================
  // CATEGORY
  // =====================================================

  function selectCategory(
    category
  ) {
    setActiveCategory(
      category
    );

    setSearchTerm("");

    scrollToSection(
      "products"
    );
  }

  // =====================================================
  // AI STYLIST
  // =====================================================

  function openAIStylist() {
    scrollToSection(
      "ai-chat-box",
      100
    );

    setTimeout(() => {
      const input =
        document.querySelector(
          ".ai-input-area input"
        );

      if (input) {
        input.focus();
      }
    }, 500);
  }

  // =====================================================
  // ACCOUNT
  // =====================================================

  function openAccount() {
    setSearchOpen(false);

    if (authLoading) {
      return;
    }

    if (!user) {
      setShowAuth(true);

      setAccountMenuOpen(
        false
      );

      return;
    }

    setAccountMenuOpen(
      (current) =>
        !current
    );
  }

  // =====================================================
  // CHECK EMAIL VERIFICATION
  // =====================================================

  async function checkEmailVerification() {
    if (
      !auth.currentUser
    ) {
      alert(
        "Please sign in first."
      );

      return;
    }

    try {
      setCheckingVerification(
        true
      );

      await reload(
        auth.currentUser
      );

      const refreshedUser =
        auth.currentUser;

      setUser(
        refreshedUser
      );

      await setDoc(
        doc(
          db,
          "users",
          refreshedUser.uid
        ),
        {
          email:
            refreshedUser.email ||
            "",

          emailVerified:
            refreshedUser.emailVerified,

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      if (
        refreshedUser.emailVerified
      ) {
        alert(
          "Email verified successfully! ✅"
        );
      } else {
        alert(
          "Your email is not verified yet. Open the verification email, click the link, then click CHECK VERIFICATION again."
        );
      }
    } catch (error) {
      console.error(
        "Verification error:",
        error
      );

      alert(
        "Could not check verification status."
      );
    } finally {
      setCheckingVerification(
        false
      );
    }
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  async function handleLogout() {
    try {
      await signOut(auth);

      setAccountMenuOpen(
        false
      );

      setShowAuth(false);

      setShowOrders(false);

      setShowProfile(false);

      setShowCheckout(false);

      setShowAdminProducts(
        false
      );

      setShowAdminOrders(
        false
      );

      setIsAdmin(false);

      alert(
        "You have been signed out."
      );
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      alert(
        "Could not sign out."
      );
    }
  }

  // =====================================================
  // USER NAME
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

    if (user.email) {
      return user.email.split(
        "@"
      )[0];
    }

    return "Customer";
  }

  // =====================================================
  // HEADER
  // =====================================================

  function renderHeader(
    showFullNavigation = false
  ) {
    return (
      <header className="navbar">

        <button
          type="button"
          className="brand"
          onClick={goHome}
        >
          LUMÉ
        </button>

        {showFullNavigation && (
          <nav>
            <a href="#home">
              Home
            </a>

            <a href="#categories">
              Categories
            </a>

            <a href="#products">
              Shop
            </a>

            <a href="#ai">
              AI Stylist
            </a>
          </nav>
        )}

        <div className="nav-icons">

          {showFullNavigation && (
            <>
              <button
                type="button"
                aria-label="Search"
                onClick={() => {
                  setSearchOpen(
                    (value) =>
                      !value
                  );

                  setAccountMenuOpen(
                    false
                  );
                }}
              >
                ⌕
              </button>

              <button
                type="button"
                aria-label="Wishlist"
                onClick={() => {
                  setAccountMenuOpen(
                    false
                  );

                  alert(
                    "Wishlist: " +
                      wishlist.length +
                      " item" +
                      (
                        wishlist.length ===
                        1
                          ? ""
                          : "s"
                      )
                  );
                }}
              >
                ♡

                {wishlist.length >
                  0 && (
                  <span className="cart-count">
                    {
                      wishlist.length
                    }
                  </span>
                )}
              </button>
            </>
          )}

          <div className="account-wrapper">

            <button
              type="button"
              className="account-button"
              onClick={
                openAccount
              }
              aria-label={
                user
                  ? "Open account"
                  : "Sign in"
              }
              disabled={
                authLoading
              }
            >
              👤
            </button>

            {user &&
              accountMenuOpen && (

                <div className="account-menu">

                  <p className="account-welcome">
                    Welcome
                  </p>

                  <strong>
                    {
                      getUserName()
                    }
                  </strong>

                  {user.email && (
                    <small>
                      {
                        user.email
                      }
                    </small>
                  )}

                  {isAdmin && (
                    <small>
                      ADMIN ACCOUNT
                    </small>
                  )}

                  {syncingAccount && (
                    <small className="account-syncing">
                      Syncing account...
                    </small>
                  )}

                  <div className="verification-status">

                    {user.emailVerified ? (

                      <p className="verified-email">
                        ✓ Email verified
                      </p>

                    ) : (

                      <>
                        <p className="unverified-email">
                          ⚠ Email not verified
                        </p>

                        <button
                          type="button"
                          className="check-verification-button"
                          onClick={
                            checkEmailVerification
                          }
                          disabled={
                            checkingVerification
                          }
                        >
                          {checkingVerification
                            ? "CHECKING..."
                            : "CHECK VERIFICATION"}
                        </button>
                      </>

                    )}

                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfile(
                        true
                      );

                      setShowOrders(
                        false
                      );

                      setShowAdminProducts(
                        false
                      );

                      setShowAdminOrders(
                        false
                      );

                      setSelectedProduct(
                        null
                      );

                      setShowCheckout(
                        false
                      );

                      setSearchOpen(
                        false
                      );

                      setAccountMenuOpen(
                        false
                      );

                      window.scrollTo({
                        top: 0,
                        behavior:
                          "smooth",
                      });
                    }}
                  >
                    MY PROFILE
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfile(
                        false
                      );

                      setShowOrders(
                        true
                      );

                      setShowAdminProducts(
                        false
                      );

                      setShowAdminOrders(
                        false
                      );

                      setSelectedProduct(
                        null
                      );

                      setShowCheckout(
                        false
                      );

                      setSearchOpen(
                        false
                      );

                      setAccountMenuOpen(
                        false
                      );

                      window.scrollTo({
                        top: 0,
                        behavior:
                          "smooth",
                      });
                    }}
                  >
                    MY ORDERS
                  </button>

                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAdminProducts(
                            true
                          );

                          setShowProfile(
                            false
                          );

                          setShowAdminOrders(
                            false
                          );

                          setShowOrders(
                            false
                          );

                          setSelectedProduct(
                            null
                          );

                          setShowCheckout(
                            false
                          );

                          setSearchOpen(
                            false
                          );

                          setAccountMenuOpen(
                            false
                          );

                          window.scrollTo({
                            top: 0,
                            behavior:
                              "smooth",
                          });
                        }}
                      >
                        ADMIN PRODUCTS
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAdminOrders(
                            true
                          );

                          setShowProfile(
                            false
                          );

                          setShowAdminProducts(
                            false
                          );

                          setShowOrders(
                            false
                          );

                          setSelectedProduct(
                            null
                          );

                          setShowCheckout(
                            false
                          );

                          setSearchOpen(
                            false
                          );

                          setAccountMenuOpen(
                            false
                          );

                          window.scrollTo({
                            top: 0,
                            behavior:
                              "smooth",
                          });
                        }}
                      >
                        ADMIN ORDERS
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={
                      handleLogout
                    }
                  >
                    SIGN OUT
                  </button>

                </div>
              )}

          </div>

          <button
            type="button"
            className="cart-button"
            onClick={openCart}
            aria-label="Shopping cart"
          >
            🛒

            {cartItems > 0 && (
              <span className="cart-count">
                {cartItems}
              </span>
            )}
          </button>

        </div>

      </header>
    );
  }

  // =====================================================
  // AUTH MODAL
  // =====================================================

  function renderAuth() {
    if (!showAuth) {
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
  // PROFILE PAGE
  // =====================================================

  if (showProfile) {
    return (
      <div className="store">

        {renderHeader(false)}

        <Profile
          onBack={() => {
            setShowProfile(false);

            setTimeout(() => {
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }, 100);
          }}
        />

        {renderAuth()}

      </div>
    );
  }

  // =====================================================
  // ADMIN PRODUCTS PAGE
  // =====================================================

  if (
    showAdminProducts &&
    isAdmin
  ) {
    return (
      <div className="store">

        {renderHeader(false)}

        <AdminProducts
          onBack={() => {
            setShowAdminProducts(
              false
            );

            setTimeout(() => {
              window.scrollTo({
                top: 0,
                behavior:
                  "smooth",
              });
            }, 100);
          }}
        />

        {renderAuth()}

      </div>
    );
  }

  // =====================================================
  // ADMIN ORDERS PAGE
  // =====================================================

  if (
    showAdminOrders &&
    isAdmin
  ) {
    return (
      <div className="store">

        {renderHeader(false)}

        <AdminOrders
          onBack={() => {
            setShowAdminOrders(
              false
            );

            setTimeout(() => {
              window.scrollTo({
                top: 0,
                behavior:
                  "smooth",
              });
            }, 100);
          }}
        />

        {renderAuth()}

      </div>
    );
  }

  // =====================================================
  // MY ORDERS PAGE
  // =====================================================

  if (showOrders) {
    return (
      <div className="store">

        {renderHeader(false)}

        <MyOrders
          onBack={() => {
            setShowOrders(false);

            setTimeout(() => {
              window.scrollTo({
                top: 0,
                behavior:
                  "smooth",
              });
            }, 100);
          }}
        />

        {renderAuth()}

      </div>
    );
  }

  // =====================================================
  // CHECKOUT PAGE
  // =====================================================

  if (showCheckout) {
    return (
      <div className="store">

        {renderHeader(false)}

        <Checkout
          cart={cart}
          cartTotal={
            cartTotal
          }
          onBack={() => {
            setShowCheckout(
              false
            );

            scrollToSection(
              "cart",
              150
            );
          }}
          onOrderPlaced={
            handleOrderPlaced
          }
        />

        {renderAuth()}

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
      <div className="store">

        {renderHeader(false)}

        <ProductDetails
          product={
            selectedProduct
          }
          onBack={() => {
            setSelectedProduct(
              null
            );

            scrollToSection(
              "products",
              150
            );
          }}
          onAddToCart={
            handleAddToCart
          }
          onBuyNow={
            buyNow
          }
          onGoToBag={
            openCart
          }
        />

        {renderAuth()}

      </div>
    );
  }

  // =====================================================
  // MAIN WEBSITE
  // =====================================================

  return (
    <div className="store">

      {renderHeader(true)}

      {(authLoading ||
        syncingAccount) && (

        <div className="auth-loading">
          {authLoading
            ? "Checking account..."
            : "Syncing your Lumé account..."}
        </div>

      )}

      {renderAuth()}

      {/* SEARCH */}

      {searchOpen && (
        <div className="search-container">

          <input
            id="search-box"
            type="text"
            placeholder="Search clothing..."
            value={
              searchTerm
            }
            onChange={(
              event
            ) =>
              setSearchTerm(
                event.target.value
              )
            }
            autoFocus
          />

          <button
            type="button"
            onClick={() => {
              setSearchTerm("");

              setSearchOpen(
                false
              );
            }}
            aria-label="Close search"
          >
            ✕
          </button>

        </div>
      )}

      {/* HERO */}

      <section
        className="hero-section"
        id="home"
      >

        <div className="hero-content">

          <p className="small-title">
            NEW COLLECTION 2026
          </p>

          <h1>
            Wear
            <br />
            your
            <br />

            <span>
              story.
            </span>
          </h1>

          <p className="hero-text">
            Discover timeless clothing
            designed for people who want
            to express their own style.
          </p>

          <button
            type="button"
            className="shop-button"
            onClick={() =>
              scrollToSection(
                "products"
              )
            }
          >
            SHOP NOW →
          </button>

        </div>

        <div className="hero-image">

          <img
            src="/images/hero.jpg"
            alt="Lumé fashion collection"
          />

        </div>

      </section>

      {/* CATEGORIES */}

      <section
        className="categories"
        id="categories"
      >

        <div className="section-heading">
          <p>
            EXPLORE
          </p>

          <h2>
            Shop by category
          </h2>
        </div>

        <div className="category-grid">

          <div
            className="category-card men"
            onClick={() =>
              selectCategory(
                "All"
              )
            }
          >
            <div>
              <p>
                01
              </p>

              <h3>
                Men
              </h3>

              <button
                type="button"
                onClick={(
                  event
                ) => {
                  event.stopPropagation();

                  selectCategory(
                    "All"
                  );
                }}
              >
                EXPLORE →
              </button>
            </div>
          </div>

          <div
            className="category-card women"
            onClick={() =>
              selectCategory(
                "All"
              )
            }
          >
            <div>
              <p>
                02
              </p>

              <h3>
                Women
              </h3>

              <button
                type="button"
                onClick={(
                  event
                ) => {
                  event.stopPropagation();

                  selectCategory(
                    "All"
                  );
                }}
              >
                EXPLORE →
              </button>
            </div>
          </div>

          <div
            className="category-card accessories"
            onClick={() =>
              selectCategory(
                "All"
              )
            }
          >
            <div>
              <p>
                03
              </p>

              <h3>
                Essentials
              </h3>

              <button
                type="button"
                onClick={(
                  event
                ) => {
                  event.stopPropagation();

                  selectCategory(
                    "All"
                  );
                }}
              >
                EXPLORE →
              </button>
            </div>
          </div>

        </div>

      </section>

      {/* PRODUCTS */}

      <section
        className="products"
        id="products"
      >

        <div className="section-heading">
          <p>
            JUST IN
          </p>

          <h2>
            New arrivals
          </h2>
        </div>

        <div className="product-filters">

          {[
            "All",
            "T-Shirts",
            "Shirts",
            "Trousers",
            "Hoodies",
          ].map(
            (category) => (

              <button
                type="button"
                key={
                  category
                }
                className={
                  activeCategory ===
                  category
                    ? "active-filter"
                    : ""
                }
                onClick={() =>
                  selectCategory(
                    category
                  )
                }
              >
                {category}
              </button>

            )
          )}

        </div>

        {productsLoading && (
          <div className="empty-cart">

            <h3>
              Loading products...
            </h3>

            <p>
              Please wait while we load the latest Lumé collection.
            </p>

          </div>
        )}

        {!productsLoading &&
          productsError && (

          <div className="empty-cart">

            <h3>
              Products unavailable
            </h3>

            <p>
              {productsError}
            </p>

          </div>

        )}

        {!productsLoading &&
          !productsError &&
          (
            filteredProducts.length ===
            0
              ? (

                <div className="empty-cart">

                  <h3>
                    No products found
                  </h3>

                  <p>
                    Try another search.
                  </p>

                  <button
                    type="button"
                    className="shop-button"
                    onClick={() => {
                      setSearchTerm(
                        ""
                      );

                      setActiveCategory(
                        "All"
                      );
                    }}
                  >
                    SHOW ALL PRODUCTS
                  </button>

                </div>

              )
              : (

                <div className="product-grid">

                  {filteredProducts.map(
                    (product) => (

                      <div
                        className="product-card"
                        key={
                          product.id
                        }
                        onClick={() =>
                          openProduct(
                            product
                          )
                        }
                      >

                        <div className="product-image">

                          <span>
                            {Number(
                              product.stock ??
                                0
                            ) <= 0
                              ? "OUT OF STOCK"
                              : "NEW"}
                          </span>

                          <button
                            type="button"
                            className="wishlist-button"
                            aria-label={
                              isWishlisted(
                                product.id
                              )
                                ? "Remove from wishlist"
                                : "Add to wishlist"
                            }
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

                          <img
                            src={
                              product.image
                            }
                            alt={
                              product.name
                            }
                          />

                        </div>

                        <div className="product-info">

                          <p className="product-category">
                            {
                              product.category
                            }
                          </p>

                          <h3>
                            {
                              product.name
                            }
                          </h3>

                          <p className="product-rating">
                            ⭐{" "}
                            {
                              product.rating
                            }
                          </p>

                          <p className="product-price">
                            ₹
                            {Number(
                              product.price ||
                                0
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </p>

                          <p>
                            Stock:{" "}
                            <strong>
                              {Number(
                                product.stock ??
                                  0
                              )}
                            </strong>
                          </p>

                          <button
                            type="button"
                            className="add-cart"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              openProduct(
                                product
                              );
                            }}
                          >
                            {Number(
                              product.stock ??
                                0
                            ) <= 0
                              ? "VIEW PRODUCT"
                              : "VIEW PRODUCT →"}
                          </button>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )
          )}

      </section>

      {/* SHOPPING BAG */}

      <section
        className="cart-section"
        id="cart"
      >

        <div className="section-heading">
          <p>
            YOUR SELECTION
          </p>

          <h2>
            Shopping bag
          </h2>
        </div>

        {cart.length === 0 ? (

          <div className="empty-cart">

            <div className="empty-cart-icon">
              🛒
            </div>

            <h3>
              Your bag is empty
            </h3>

            <p>
              Discover something you'll
              love and add it to your bag.
            </p>

            <button
              type="button"
              className="shop-button"
              onClick={() =>
                scrollToSection(
                  "products"
                )
              }
            >
              CONTINUE SHOPPING →
            </button>

          </div>

        ) : (

          <div className="cart-container">

            <div className="cart-items">

              {cart.map(
                (item) => {

                  const liveProduct =
                    products.find(
                      (product) =>
                        product.id ===
                        item.id
                    );

                  const availableStock =
                    Number(
                      liveProduct?.stock ??
                        0
                    );

                  return (
                    <div
                      className="cart-item"
                      key={
                        item.id +
                        "-" +
                        item.size
                      }
                    >

                      <img
                        src={
                          item.image
                        }
                        alt={
                          item.name
                        }
                      />

                      <div className="cart-item-info">

                        <p>
                          {
                            item.category
                          }
                        </p>

                        <h3>
                          {item.name}
                        </h3>

                        <strong>
                          ₹
                          {Number(
                            item.price ||
                              0
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </strong>

                        <p>
                          Size:{" "}
                          <strong>
                            {item.size}
                          </strong>
                        </p>

                        <p>
                          Available stock:{" "}
                          <strong>
                            {
                              availableStock
                            }
                          </strong>
                        </p>

                        {availableStock <=
                          0 && (
                          <p>
                            OUT OF STOCK
                          </p>
                        )}

                        <div className="quantity">

                          <button
                            type="button"
                            onClick={() =>
                              decreaseQuantity(
                                item.id,
                                item.size
                              )
                            }
                          >
                            −
                          </button>

                          <span>
                            {
                              item.quantity
                            }
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              increaseQuantity(
                                item.id,
                                item.size
                              )
                            }
                            disabled={
                              item.quantity >=
                              availableStock
                            }
                          >
                            +
                          </button>

                        </div>

                        <button
                          type="button"
                          className="remove-button"
                          onClick={() =>
                            removeFromCart(
                              item.id,
                              item.size
                            )
                          }
                        >
                          REMOVE
                        </button>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

            <div className="cart-summary">

              <h3>
                Order summary
              </h3>

              <div className="summary-row">
                <span>
                  Items
                </span>

                <span>
                  {cartItems}
                </span>
              </div>

              <div className="summary-row">
                <span>
                  Subtotal
                </span>

                <span>
                  ₹
                  {cartTotal.toLocaleString(
                    "en-IN"
                  )}
                </span>
              </div>

              <div className="summary-row">
                <span>
                  Shipping
                </span>

                <span>
                  FREE
                </span>
              </div>

              <div className="summary-total">
                <span>
                  Total
                </span>

                <strong>
                  ₹
                  {cartTotal.toLocaleString(
                    "en-IN"
                  )}
                </strong>
              </div>

              <button
                type="button"
                className="checkout-button"
                onClick={
                  openCheckout
                }
              >
                PROCEED TO CHECKOUT →
              </button>

            </div>

          </div>

        )}

      </section>

      {/* AI STYLIST */}

      <section
        className="ai-section"
        id="ai"
      >

        <div className="ai-section-content">

          <p className="small-title">
            YOUR PERSONAL STYLIST
          </p>

          <h2>
            Style,
            <br />

            <span>
              reimagined.
            </span>
          </h2>

          <p>
            Tell our AI stylist what
            you're looking for and get
            personalized outfit
            recommendations.
          </p>

          <button
            type="button"
            className="ai-button"
            onClick={
              openAIStylist
            }
          >
            TRY AI STYLIST →
          </button>

        </div>

        <div
          className="ai-chat"
          id="ai-chat-box"
        >

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

        </div>

      </section>

      <footer>

        <div className="footer-brand">
          LUMÉ
        </div>

        <p>
          Timeless clothing.
          Your personal style.
        </p>

        <div className="footer-links">

          <span>
            Instagram
          </span>

          <span>
            Contact
          </span>

          <span>
            Privacy
          </span>

          <span>
            Terms
          </span>

        </div>

        <small>
          © 2026 Lumé. All rights reserved.
        </small>

      </footer>

    </div>
  );
}

export default App;