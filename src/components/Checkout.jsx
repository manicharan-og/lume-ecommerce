import {
  useEffect,
  useState,
} from "react";

import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase";


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


function Checkout({
  cart,
  cartTotal,
  onBack,
  onOrderPlaced,
}) {
  // =====================================================
  // FORM
  // =====================================================

  const [
    formData,
    setFormData,
  ] = useState({
    fullName: "",
    phone: "",
    email:
      auth.currentUser?.email ||
      "",

    address: "",
    city: "",
    state: "",
    pin: "",

    payment: "cod",

    upiId: "",

    cardName: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
  });

  // =====================================================
  // SAVED ADDRESSES
  // =====================================================

  const [
    savedAddresses,
    setSavedAddresses,
  ] = useState([]);

  const [
    selectedAddressId,
    setSelectedAddressId,
  ] = useState("");

  const [
    loadingAddress,
    setLoadingAddress,
  ] = useState(true);

  const [
    useNewAddress,
    setUseNewAddress,
  ] = useState(false);

  // =====================================================
  // ORDER STATE
  // =====================================================

  const [
    orderPlaced,
    setOrderPlaced,
  ] = useState(false);

  const [
    orderId,
    setOrderId,
  ] = useState("");

  const [
    confirmedTotal,
    setConfirmedTotal,
  ] = useState(0);

  const [
    placingOrder,
    setPlacingOrder,
  ] = useState(false);

  const [
    orderError,
    setOrderError,
  ] = useState("");

  // =====================================================
  // PAYMENT STATE
  // =====================================================

  const [
    paymentStatus,
    setPaymentStatus,
  ] = useState("");

  const [
    transactionId,
    setTransactionId,
  ] = useState("");

  // =====================================================
  // LOAD PROFILE + SAVED ADDRESSES
  // =====================================================

  useEffect(() => {
    async function loadCheckoutProfile() {
      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        setLoadingAddress(false);

        return;
      }

      try {
        setLoadingAddress(true);

        const userReference =
          doc(
            db,
            "users",
            currentUser.uid
          );

        const userSnapshot =
          await getDoc(
            userReference
          );

        if (
          !userSnapshot.exists()
        ) {
          setFormData(
            (previous) => ({
              ...previous,

              email:
                currentUser.email ||
                previous.email,
            })
          );

          setUseNewAddress(true);

          return;
        }

        const userData =
          userSnapshot.data();

        const addresses =
          Array.isArray(
            userData.addresses
          )
            ? userData.addresses
            : [];

        setSavedAddresses(
          addresses
        );

        // =================================================
        // FIND DEFAULT ADDRESS
        // =================================================

        const defaultAddress =
          addresses.find(
            (address) =>
              address.isDefault ===
              true
          ) ||
          addresses[0] ||
          null;

        // =================================================
        // SAVED ADDRESS EXISTS
        // =================================================

        if (defaultAddress) {
          setSelectedAddressId(
            defaultAddress.id ||
              ""
          );

          setUseNewAddress(false);

          setFormData(
            (previous) => ({
              ...previous,

              fullName:
                defaultAddress.fullName ||
                userData.fullName ||
                "",

              phone:
                defaultAddress.phone ||
                userData.phone ||
                "",

              email:
                currentUser.email ||
                userData.email ||
                previous.email,

              address:
                defaultAddress.address ||
                "",

              city:
                defaultAddress.city ||
                "",

              state:
                defaultAddress.state ||
                "",

              pin:
                defaultAddress.pin ||
                "",
            })
          );
        }

        // =================================================
        // NO SAVED ADDRESS
        // =================================================

        else {
          setSelectedAddressId("");

          setUseNewAddress(true);

          setFormData(
            (previous) => ({
              ...previous,

              fullName:
                userData.fullName ||
                "",

              phone:
                userData.phone ||
                "",

              email:
                currentUser.email ||
                userData.email ||
                previous.email,
            })
          );
        }
      } catch (error) {
        console.error(
          "Could not load saved checkout information:",
          error
        );

        setUseNewAddress(true);
      } finally {
        setLoadingAddress(false);
      }
    }

    loadCheckoutProfile();
  }, []);

  // =====================================================
  // SELECT SAVED ADDRESS
  // =====================================================

  function selectSavedAddress(
    addressId
  ) {
    const selectedAddress =
      savedAddresses.find(
        (address) =>
          address.id ===
          addressId
      );

    if (!selectedAddress) {
      return;
    }

    setSelectedAddressId(
      addressId
    );

    setUseNewAddress(false);

    setFormData(
      (previous) => ({
        ...previous,

        fullName:
          selectedAddress.fullName ||
          previous.fullName,

        phone:
          selectedAddress.phone ||
          previous.phone,

        address:
          selectedAddress.address ||
          "",

        city:
          selectedAddress.city ||
          "",

        state:
          selectedAddress.state ||
          "",

        pin:
          selectedAddress.pin ||
          "",
      })
    );

    setOrderError("");
  }

  // =====================================================
  // USE NEW ADDRESS
  // =====================================================

  function chooseNewAddress() {
    setSelectedAddressId("");

    setUseNewAddress(true);

    setFormData(
      (previous) => ({
        ...previous,

        address: "",
        city: "",
        state: "",
        pin: "",
      })
    );

    setOrderError("");
  }

  // =====================================================
  // HANDLE INPUT
  // =====================================================

  function handleChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    let nextValue =
      value;

    // =================================================
    // PHONE
    // =================================================

    if (
      name ===
      "phone"
    ) {
      nextValue =
        value
          .replace(
            /\D/g,
            ""
          )
          .slice(
            0,
            10
          );
    }

    // =================================================
    // PIN
    // =================================================

    if (
      name ===
      "pin"
    ) {
      nextValue =
        value
          .replace(
            /\D/g,
            ""
          )
          .slice(
            0,
            6
          );
    }

    // =================================================
    // CARD NUMBER
    // =================================================

    if (
      name ===
      "cardNumber"
    ) {
      nextValue =
        value
          .replace(
            /\D/g,
            ""
          )
          .slice(
            0,
            16
          );
    }

    // =================================================
    // CVV
    // =================================================

    if (
      name ===
      "cardCvv"
    ) {
      nextValue =
        value
          .replace(
            /\D/g,
            ""
          )
          .slice(
            0,
            3
          );
    }

    // =================================================
    // EXPIRY
    // =================================================

    if (
      name ===
      "cardExpiry"
    ) {
      let digits =
        value
          .replace(
            /\D/g,
            ""
          )
          .slice(
            0,
            4
          );

      if (
        digits.length >
        2
      ) {
        digits =
          digits.slice(
            0,
            2
          ) +
          "/" +
          digits.slice(2);
      }

      nextValue =
        digits;
    }

    setFormData(
      (previous) => ({
        ...previous,

        [name]:
          nextValue,
      })
    );

    setOrderError("");
  }

  // =====================================================
  // PAYMENT NAME
  // =====================================================

  function getPaymentName() {
    if (
      formData.payment ===
      "cod"
    ) {
      return "Cash on Delivery";
    }

    if (
      formData.payment ===
      "upi"
    ) {
      return "UPI";
    }

    return "Credit / Debit Card";
  }

  // =====================================================
  // CREATE MOCK TRANSACTION ID
  // =====================================================

  function createTransactionId() {
    const timestamp =
      Date.now()
        .toString()
        .slice(-8);

    const random =
      Math.floor(
        1000 +
          Math.random() *
            9000
      );

    return (
      "LUME-PAY-" +
      timestamp +
      random
    );
  }

  // =====================================================
  // CUSTOMER VALIDATION
  // =====================================================

  function validateCustomerDetails() {
    if (
      !formData.fullName.trim() ||
      !formData.phone.trim() ||
      !formData.email.trim() ||
      !formData.address.trim() ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      !formData.pin.trim()
    ) {
      alert(
        "Please complete all required details."
      );

      return false;
    }

    if (
      !/^[0-9]{10}$/.test(
        formData.phone
      )
    ) {
      alert(
        "Please enter a valid 10-digit phone number."
      );

      return false;
    }

    if (
      !/^[0-9]{6}$/.test(
        formData.pin
      )
    ) {
      alert(
        "Please enter a valid 6-digit PIN code."
      );

      return false;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email
      )
    ) {
      alert(
        "Please enter a valid email address."
      );

      return false;
    }

    if (
      !cart ||
      cart.length ===
        0
    ) {
      alert(
        "Your shopping bag is empty."
      );

      return false;
    }

    return true;
  }

  // =====================================================
  // PAYMENT VALIDATION
  // =====================================================

  function validatePayment() {
    // =================================================
    // COD
    // =================================================

    if (
      formData.payment ===
      "cod"
    ) {
      return true;
    }

    // =================================================
    // UPI
    // =================================================

    if (
      formData.payment ===
      "upi"
    ) {
      const upiPattern =
        /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;

      if (
        !upiPattern.test(
          formData.upiId.trim()
        )
      ) {
        alert(
          "Please enter a valid UPI ID. Example: name@upi"
        );

        return false;
      }

      return true;
    }

    // =================================================
    // CARD
    // =================================================

    if (
      formData.payment ===
      "card"
    ) {
      if (
        !formData.cardName.trim()
      ) {
        alert(
          "Please enter the cardholder name."
        );

        return false;
      }

      if (
        !/^[0-9]{16}$/.test(
          formData.cardNumber
        )
      ) {
        alert(
          "Please enter a valid 16-digit card number."
        );

        return false;
      }

      if (
        !/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(
          formData.cardExpiry
        )
      ) {
        alert(
          "Please enter card expiry in MM/YY format."
        );

        return false;
      }

      // =================================================
      // CHECK EXPIRY IS NOT IN THE PAST
      // =================================================

      const [
        expiryMonth,
        expiryYear,
      ] =
        formData.cardExpiry.split(
          "/"
        );

      const currentDate =
        new Date();

      const currentMonth =
        currentDate.getMonth() +
        1;

      const currentYear =
        Number(
          String(
            currentDate.getFullYear()
          ).slice(-2)
        );

      const expMonth =
        Number(
          expiryMonth
        );

      const expYear =
        Number(
          expiryYear
        );

      if (
        expYear <
          currentYear ||
        (
          expYear ===
            currentYear &&
          expMonth <
            currentMonth
        )
      ) {
        alert(
          "Your card has expired. Please enter a valid expiry date."
        );

        return false;
      }

      if (
        !/^[0-9]{3}$/.test(
          formData.cardCvv
        )
      ) {
        alert(
          "Please enter a valid 3-digit CVV."
        );

        return false;
      }

      return true;
    }

    return false;
  }

  // =====================================================
  // MOCK PAYMENT
  // =====================================================

  async function processMockPayment() {
    // =================================================
    // COD
    // =================================================

    if (
      formData.payment ===
      "cod"
    ) {
      return {
        success: true,

        paymentStatus:
          "Pending",

        paymentMode:
          "cod",

        transactionId:
          "",
      };
    }

    setPaymentStatus(
      "Processing"
    );

    // Mock payment delay

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          1200
        )
    );

    const generatedTransactionId =
      createTransactionId();

    setTransactionId(
      generatedTransactionId
    );

    setPaymentStatus(
      "Paid"
    );

    return {
      success: true,

      paymentStatus:
        "Paid",

      paymentMode:
        "mock",

      transactionId:
        generatedTransactionId,
    };
  }

  // =====================================================
  // CREATE ORDER NUMBER
  // =====================================================

  function createOrderNumber() {
    const timestamp =
      Date.now()
        .toString()
        .slice(-6);

    const random =
      Math.floor(
        100 +
          Math.random() *
            900
      );

    return (
      "LUME-" +
      timestamp +
      random
    );
  }

  // =====================================================
  // PLACE ORDER
  // =====================================================

  async function handlePlaceOrder(
    event
  ) {
    event.preventDefault();

    if (placingOrder) {
      return;
    }

    if (
      !validateCustomerDetails()
    ) {
      return;
    }

    if (
      !validatePayment()
    ) {
      return;
    }

    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      alert(
        "Please sign in before placing your order."
      );

      return;
    }

    if (
      !currentUser.emailVerified
    ) {
      alert(
        "Please verify your email before placing your order."
      );

      return;
    }

    try {
      setPlacingOrder(true);

      setOrderError("");

      // =================================================
      // MOCK PAYMENT
      // =================================================

      const paymentResult =
        await processMockPayment();

      if (
        !paymentResult.success
      ) {
        setPaymentStatus(
          "Failed"
        );

        throw new Error(
          "Payment failed. Please try again."
        );
      }

      const generatedOrderNumber =
        createOrderNumber();

      const orderReference =
        doc(
          collection(
            db,
            "orders"
          )
        );

      let finalOrderTotal =
        0;

      // =================================================
      // FIRESTORE TRANSACTION
      // =================================================

      await runTransaction(
        db,
        async (
          transaction
        ) => {
          // =================================================
          // GROUP CART QUANTITY BY PRODUCT
          // =================================================

          const quantityByProductId =
            new Map();

          for (
            const item
            of cart
          ) {
            if (!item.id) {
              throw new Error(
                `${item.name} does not have a valid product ID.`
              );
            }

            const productId =
              String(
                item.id
              );

            const quantity =
              Number(
                item.quantity ||
                  0
              );

            if (
              quantity <=
              0
            ) {
              throw new Error(
                `Invalid quantity for ${item.name}.`
              );
            }

            quantityByProductId.set(
              productId,
              (
                quantityByProductId.get(
                  productId
                ) ||
                0
              ) +
                quantity
            );
          }

          // =================================================
          // READ ALL PRODUCTS FIRST
          // =================================================

          const productDataById =
            new Map();

          for (
            const [
              productId,
              requestedQuantity,
            ]
            of quantityByProductId.entries()
          ) {
            const productReference =
              doc(
                db,
                "products",
                productId
              );

            const productSnapshot =
              await transaction.get(
                productReference
              );

            if (
              !productSnapshot.exists()
            ) {
              throw new Error(
                "One of the products in your cart is no longer available."
              );
            }

            const productData =
              productSnapshot.data();

            if (
              productData.active ===
              false
            ) {
              throw new Error(
                `${
                  productData.name ||
                  "Product"
                } is currently unavailable.`
              );
            }

            const currentStock =
              Number(
                productData.stock ??
                  0
              );

            if (
              currentStock <=
              0
            ) {
              throw new Error(
                `${
                  productData.name ||
                  "Product"
                } is out of stock.`
              );
            }

            if (
              requestedQuantity >
              currentStock
            ) {
              throw new Error(
                `${
                  productData.name ||
                  "Product"
                } has only ${currentStock} item${
                  currentStock ===
                  1
                    ? ""
                    : "s"
                } left in stock.`
              );
            }

            productDataById.set(
              productId,
              {
                productReference,
                productData,
                currentStock,
                requestedQuantity,
              }
            );
          }

          // =================================================
          // BUILD ORDER ITEMS
          // =================================================

          const orderItems =
            cart.map(
              (item) => {
                const productId =
                  String(
                    item.id
                  );

                const storedProduct =
                  productDataById.get(
                    productId
                  );

                if (
                  !storedProduct
                ) {
                  throw new Error(
                    `${item.name} could not be verified.`
                  );
                }

                const productData =
                  storedProduct.productData;

                const requestedQuantity =
                  Number(
                    item.quantity ||
                      0
                  );

                const currentPrice =
                  Number(
                    productData.price ??
                      item.price ??
                      0
                  );

                return {
                  productId,

                  name:
                    productData.name ||
                    item.name,

                  category:
                    productData.category ||
                    item.category ||
                    "",

                  image:
                    productData.image ||
                    item.image ||
                    "",

                  price:
                    currentPrice,

                  quantity:
                    requestedQuantity,

                  size:
                    item.size ||
                    "",

                  itemTotal:
                    currentPrice *
                    requestedQuantity,
                };
              }
            );

          // =================================================
          // LIVE TOTALS
          // =================================================

          const calculatedSubtotal =
            orderItems.reduce(
              (
                total,
                item
              ) =>
                total +
                Number(
                  item.itemTotal ||
                    0
                ),
              0
            );

          const calculatedItemCount =
            orderItems.reduce(
              (
                total,
                item
              ) =>
                total +
                Number(
                  item.quantity ||
                    0
                ),
              0
            );

          finalOrderTotal =
            calculatedSubtotal;

          // =================================================
          // REDUCE STOCK
          // =================================================

          for (
            const productCheck
            of productDataById.values()
          ) {
            const newStock =
              productCheck.currentStock -
              productCheck.requestedQuantity;

            transaction.update(
              productCheck.productReference,
              {
                stock:
                  newStock,

                updatedAt:
                  serverTimestamp(),
              }
            );
          }

          // =================================================
          // ORDER DATA
          // =================================================

          const orderData = {
            orderNumber:
              generatedOrderNumber,

            userId:
              currentUser.uid,

            customerEmail:
              currentUser.email ||
              formData.email.trim(),

            customer: {
              fullName:
                formData.fullName.trim(),

              phone:
                formData.phone.trim(),

              email:
                formData.email.trim(),
            },

            deliveryAddress: {
              address:
                formData.address.trim(),

              city:
                formData.city.trim(),

              state:
                formData.state.trim(),

              pin:
                formData.pin.trim(),

              savedAddressId:
                useNewAddress
                  ? ""
                  : selectedAddressId,
            },

            items:
              orderItems,

            itemCount:
              calculatedItemCount,

            subtotal:
              calculatedSubtotal,

            deliveryCharge:
              0,

            total:
              calculatedSubtotal,

            // ===========================================
            // PAYMENT
            // ===========================================

            paymentMethod:
              formData.payment,

            paymentMethodName:
              getPaymentName(),

            paymentStatus:
              paymentResult
                .paymentStatus,

            paymentMode:
              paymentResult
                .paymentMode,

            transactionId:
              paymentResult
                .transactionId,

            paidAt:
              paymentResult
                .paymentStatus ===
              "Paid"
                ? serverTimestamp()
                : null,

            // ===========================================
            // ORDER STATUS
            // ===========================================

            status:
              "Placed",

            orderStatus:
              "Placed",

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          };

          transaction.set(
            orderReference,
            orderData
          );
        }
      );

      // =================================================
      // SUCCESS
      // =================================================

      console.log(
        "Order created:",
        orderReference.id
      );

      console.log(
        "Order number:",
        generatedOrderNumber
      );

      console.log(
        "Payment status:",
        paymentResult
          .paymentStatus
      );

      if (
        paymentResult.transactionId
      ) {
        console.log(
          "Transaction:",
          paymentResult.transactionId
        );
      }

      setConfirmedTotal(
        finalOrderTotal
      );

      setOrderId(
        generatedOrderNumber
      );

      setPaymentStatus(
        paymentResult
          .paymentStatus
      );

      setTransactionId(
        paymentResult
          .transactionId
      );

      setOrderPlaced(true);

      if (onOrderPlaced) {
        await onOrderPlaced({
          firestoreId:
            orderReference.id,

          orderNumber:
            generatedOrderNumber,

          total:
            finalOrderTotal,

          paymentStatus:
            paymentResult
              .paymentStatus,

          transactionId:
            paymentResult
              .transactionId,
        });
      }
    } catch (error) {
      console.error(
        "Order creation error:",
        error
      );

      const errorMessage =
        error?.message ||
        "Could not place your order. Please try again.";

      if (
        formData.payment !==
          "cod" &&
        paymentStatus ===
          "Processing"
      ) {
        setPaymentStatus(
          "Failed"
        );
      }

      setOrderError(
        errorMessage
      );

      alert(
        errorMessage
      );
    } finally {
      setPlacingOrder(false);
    }
  }

  // =====================================================
  // ORDER SUCCESS
  // =====================================================

  if (orderPlaced) {
    return (
      <section className="checkout-page">

        <div className="order-success">

          <div className="success-icon">
            ✓
          </div>

          <p className="small-title">
            ORDER CONFIRMED
          </p>

          <h1>
            Thank you for your order!
          </h1>

          <p className="success-message">
            Your order has been
            successfully placed. We'll
            send your order updates to
            your email and phone number.
          </p>

          <div className="order-number">

            <span>
              ORDER NUMBER
            </span>

            <strong>
              {orderId}
            </strong>

          </div>

          <div className="success-details">

            <div>

              <span>
                Customer
              </span>

              <strong>
                {
                  formData.fullName
                }
              </strong>

            </div>

            <div>

              <span>
                Payment
              </span>

              <strong>
                {
                  getPaymentName()
                }
              </strong>

            </div>

            <div>

              <span>
                Payment Status
              </span>

              <strong
                className={
                  paymentStatus ===
                  "Paid"
                    ? "payment-status-paid"
                    : paymentStatus ===
                      "Pending"
                    ? "payment-status-pending"
                    : paymentStatus ===
                      "Failed"
                    ? "payment-status-failed"
                    : ""
                }
              >
                {
                  paymentStatus
                }
              </strong>

            </div>

            <div>

              <span>
                Total
              </span>

              <strong>
                ₹
                {Number(
                  confirmedTotal ||
                    cartTotal ||
                    0
                ).toLocaleString(
                  "en-IN"
                )}
              </strong>

            </div>

          </div>

          {transactionId && (

            <div className="order-number">

              <span>
                TRANSACTION ID
              </span>

              <strong>
                {
                  transactionId
                }
              </strong>

            </div>

          )}

          <div className="delivery-confirmation">

            <span>
              ✓
            </span>

            <div>

              <strong>
                Delivery address
              </strong>

              <p>
                {
                  formData.address
                }
                ,{" "}
                {
                  formData.city
                }
                ,{" "}
                {
                  formData.state
                }{" "}
                -{" "}
                {
                  formData.pin
                }
              </p>

            </div>

          </div>

          <button
            type="button"
            className="shop-button"
            onClick={() => {
              window.location.reload();
            }}
          >
            CONTINUE SHOPPING →
          </button>

        </div>

      </section>
    );
  }

  // =====================================================
  // CHECKOUT PAGE
  // =====================================================

  return (
    <section className="checkout-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="checkout-header">

        <button
          type="button"
          className="back-button"
          onClick={
            onBack
          }
        >
          ← BACK TO BAG
        </button>

        <div className="checkout-title">

          <p className="small-title">
            SECURE CHECKOUT
          </p>

          <h1>
            Complete your order
          </h1>

          <p>
            Review your details,
            delivery address and
            payment method.
          </p>

        </div>

      </div>

      {/* =================================================
          STEPS
      ================================================= */}

      <div className="checkout-steps">

        <div className="checkout-step active">

          <span>
            1
          </span>

          <strong>
            Information
          </strong>

        </div>

        <div className="step-line" />

        <div className="checkout-step active">

          <span>
            2
          </span>

          <strong>
            Delivery
          </strong>

        </div>

        <div className="step-line" />

        <div className="checkout-step active">

          <span>
            3
          </span>

          <strong>
            Payment
          </strong>

        </div>

      </div>

      <form
        className="checkout-container"
        onSubmit={
          handlePlaceOrder
        }
      >

        <div className="checkout-form">

          {/* =================================================
              CUSTOMER INFORMATION
          ================================================= */}

          <div className="checkout-section">

            <div className="checkout-section-heading">

              <div className="checkout-number">
                01
              </div>

              <div>

                <p className="small-title">
                  CUSTOMER DETAILS
                </p>

                <h2>
                  Your information
                </h2>

                <span>
                  We'll use this
                  information to contact
                  you about your order.
                </span>

              </div>

            </div>

            <div className="form-grid">

              <div className="form-group">

                <label>
                  Full Name{" "}
                  <span>*</span>
                </label>

                <input
                  type="text"
                  name="fullName"
                  value={
                    formData.fullName
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Rahul Kumar"
                  autoComplete="name"
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Phone Number{" "}
                  <span>*</span>
                </label>

                <input
                  type="tel"
                  name="phone"
                  value={
                    formData.phone
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="10-digit mobile number"
                  maxLength="10"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                />

              </div>

              <div className="form-group full-width">

                <label>
                  Email Address{" "}
                  <span>*</span>
                </label>

                <input
                  type="email"
                  name="email"
                  value={
                    formData.email
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />

              </div>

            </div>

          </div>

          {/* =================================================
              DELIVERY
          ================================================= */}

          <div className="checkout-section">

            <div className="checkout-section-heading">

              <div className="checkout-number">
                02
              </div>

              <div>

                <p className="small-title">
                  DELIVERY
                </p>

                <h2>
                  Delivery address
                </h2>

                <span>
                  Choose a saved address
                  or enter a new
                  delivery address.
                </span>

              </div>

            </div>

            {/* ===============================================
                LOADING
            =============================================== */}

            {loadingAddress ? (

              <div className="saved-address-loading">
                Loading your saved
                addresses...
              </div>

            ) : (

              <>

                {/* ===========================================
                    SAVED ADDRESSES
                =========================================== */}

                {savedAddresses.length >
                  0 && (

                  <div className="checkout-saved-addresses">

                    <p className="small-title">
                      SAVED ADDRESSES
                    </p>

                    <div className="checkout-address-grid">

                      {savedAddresses.map(
                        (address) => (

                          <button
                            key={
                              address.id
                            }
                            type="button"
                            className={
                              selectedAddressId ===
                                address.id &&
                              !useNewAddress
                                ? "checkout-address-card selected"
                                : "checkout-address-card"
                            }
                            onClick={() =>
                              selectSavedAddress(
                                address.id
                              )
                            }
                          >

                            <div className="checkout-address-top">

                              <strong>
                                {
                                  address.label ||
                                  "Address"
                                }
                              </strong>

                              {address.isDefault && (
                                <span>
                                  DEFAULT
                                </span>
                              )}

                            </div>

                            <p>
                              <strong>
                                {
                                  address.fullName
                                }
                              </strong>
                            </p>

                            <p>
                              {
                                address.address
                              }
                            </p>

                            <p>
                              {
                                address.city
                              }
                              ,{" "}
                              {
                                address.state
                              }{" "}
                              -{" "}
                              {
                                address.pin
                              }
                            </p>

                            <p>
                              Phone:{" "}
                              {
                                address.phone
                              }
                            </p>

                          </button>

                        )
                      )}

                    </div>

                  </div>

                )}

                {/* ===========================================
                    NEW ADDRESS
                =========================================== */}

                <button
                  type="button"
                  className={
                    useNewAddress
                      ? "new-address-button active"
                      : "new-address-button"
                  }
                  onClick={
                    chooseNewAddress
                  }
                >
                  + USE A NEW ADDRESS
                </button>

                <div className="form-grid">

                  <div className="form-group full-width">

                    <label>
                      Address{" "}
                      <span>*</span>
                    </label>

                    <textarea
                      name="address"
                      value={
                        formData.address
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="House / Flat number, Street, Area"
                      rows="4"
                      autoComplete="street-address"
                      required
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      City{" "}
                      <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="city"
                      value={
                        formData.city
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="City"
                      autoComplete="address-level2"
                      required
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      State{" "}
                      <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="state"
                      value={
                        formData.state
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="State"
                      autoComplete="address-level1"
                      required
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      PIN Code{" "}
                      <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="pin"
                      value={
                        formData.pin
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="6-digit PIN"
                      maxLength="6"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      required
                    />

                  </div>

                </div>

              </>

            )}

          </div>

          {/* =================================================
              PAYMENT
          ================================================= */}

          <div className="checkout-section">

            <div className="checkout-section-heading">

              <div className="checkout-number">
                03
              </div>

              <div>

                <p className="small-title">
                  PAYMENT
                </p>

                <h2>
                  Payment method
                </h2>

                <span>
                  Choose your preferred
                  payment method.
                </span>

              </div>

            </div>

            <div className="payment-options">

              {[
                {
                  value: "cod",

                  icon: "💵",

                  title:
                    "Cash on Delivery",

                  description:
                    "Pay when your order arrives",
                },

                {
                  value: "upi",

                  icon: "📱",

                  title:
                    "UPI",

                  description:
                    "Mock Google Pay, PhonePe, Paytm payment",
                },

                {
                  value: "card",

                  icon: "💳",

                  title:
                    "Credit / Debit Card",

                  description:
                    "Mock card payment for testing",
                },
              ].map(
                (method) => (

                  <label
                    key={
                      method.value
                    }
                    className={
                      formData.payment ===
                      method.value
                        ? "payment-option selected"
                        : "payment-option"
                    }
                  >

                    <input
                      type="radio"
                      name="payment"
                      value={
                        method.value
                      }
                      checked={
                        formData.payment ===
                        method.value
                      }
                      onChange={
                        handleChange
                      }
                    />

                    <div className="payment-icon">
                      {
                        method.icon
                      }
                    </div>

                    <div className="payment-content">

                      <strong>
                        {
                          method.title
                        }
                      </strong>

                      <small>
                        {
                          method.description
                        }
                      </small>

                    </div>

                    <div className="payment-check">
                      ✓
                    </div>

                  </label>

                )
              )}

            </div>

            {/* ===============================================
                UPI
            =============================================== */}

            {formData.payment ===
              "upi" && (

              <div className="mock-payment-box">

                <p className="small-title">
                  TEST UPI PAYMENT
                </p>

                <div className="form-group">

                  <label>
                    UPI ID{" "}
                    <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="upiId"
                    value={
                      formData.upiId
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="example@upi"
                    autoComplete="off"
                  />

                </div>

                <p className="mock-payment-note">
                  This is a test
                  payment. No real money
                  will be charged.
                </p>

              </div>

            )}

            {/* ===============================================
                CARD
            =============================================== */}

            {formData.payment ===
              "card" && (

              <div className="mock-payment-box">

                <p className="small-title">
                  TEST CARD PAYMENT
                </p>

                <div className="form-grid">

                  <div className="form-group full-width">

                    <label>
                      Cardholder Name{" "}
                      <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="cardName"
                      value={
                        formData.cardName
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Name on card"
                      autoComplete="off"
                    />

                  </div>

                  <div className="form-group full-width">

                    <label>
                      Card Number{" "}
                      <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="cardNumber"
                      value={
                        formData.cardNumber
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="1234567812345678"
                      maxLength="16"
                      inputMode="numeric"
                      autoComplete="off"
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Expiry{" "}
                      <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="cardExpiry"
                      value={
                        formData.cardExpiry
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="MM/YY"
                      maxLength="5"
                      inputMode="numeric"
                      autoComplete="off"
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      CVV{" "}
                      <span>*</span>
                    </label>

                    <input
                      type="password"
                      name="cardCvv"
                      value={
                        formData.cardCvv
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="123"
                      maxLength="3"
                      inputMode="numeric"
                      autoComplete="off"
                    />

                  </div>

                </div>

                <p className="mock-payment-note">
                  Test only. Card number
                  and CVV are never
                  stored in Firestore.
                </p>

              </div>

            )}

            {/* ===============================================
                PAYMENT PROCESSING
            =============================================== */}

            {paymentStatus ===
              "Processing" && (

              <div className="mock-payment-status">
                Processing test payment...
              </div>

            )}

          </div>

          {/* =================================================
              ERROR
          ================================================= */}

          {orderError && (

            <div className="auth-error">
              {
                orderError
              }
            </div>

          )}

        </div>

        {/* =================================================
            ORDER SUMMARY
        ================================================= */}

        <aside className="checkout-summary">

          <div className="summary-header">

            <p className="small-title">
              YOUR ORDER
            </p>

            <h2>
              Order summary
            </h2>

            <span>
              {cart.reduce(
                (
                  total,
                  item
                ) =>
                  total +
                  Number(
                    item.quantity ||
                      0
                  ),
                0
              )}{" "}
              items
            </span>

          </div>

          <div className="checkout-products">

            {cart.map(
              (item) => (

                <div
                  className="checkout-product"
                  key={`${item.id}-${item.size}`}
                >

                  <div className="checkout-product-image">

                    <img
                      src={resolveProductImage(item)}
                      alt={item.name}
                      onError={(event) =>
                        handleProductImageError(event, item)
                      }
                    />

                    <span>
                      {
                        item.quantity
                      }
                    </span>

                  </div>

                  <div className="checkout-product-info">

                    <h3>
                      {
                        item.name
                      }
                    </h3>

                    <p>
                      Size{" "}
                      {
                        item.size
                      }
                    </p>

                    <strong>
                      ₹
                      {(
                        Number(
                          item.price ||
                            0
                        ) *
                        Number(
                          item.quantity ||
                            0
                        )
                      ).toLocaleString(
                        "en-IN"
                      )}
                    </strong>

                  </div>

                </div>

              )
            )}

          </div>

          <div className="checkout-total">

            <div>

              <span>
                Subtotal
              </span>

              <span>
                ₹
                {Number(
                  cartTotal ||
                    0
                ).toLocaleString(
                  "en-IN"
                )}
              </span>

            </div>

            <div>

              <span>
                Delivery
              </span>

              <span className="free-text">
                FREE
              </span>

            </div>

            <div className="checkout-grand-total">

              <span>
                Total
              </span>

              <strong>
                ₹
                {Number(
                  cartTotal ||
                    0
                ).toLocaleString(
                  "en-IN"
                )}
              </strong>

            </div>

          </div>

          <button
            type="submit"
            className="place-order-button"
            disabled={
              placingOrder ||
              loadingAddress
            }
          >
            {loadingAddress
              ? "LOADING ADDRESS..."
              : placingOrder
              ? formData.payment ===
                "cod"
                ? "CHECKING STOCK..."
                : "PROCESSING PAYMENT..."
              : formData.payment ===
                "cod"
              ? "PLACE ORDER"
              : `PAY ₹${Number(
                  cartTotal ||
                    0
                ).toLocaleString(
                  "en-IN"
                )}`}

            {!placingOrder &&
              !loadingAddress && (
                <span>
                  →
                </span>
              )}
          </button>

          <div className="secure-text">

            <span>
              🔒
            </span>

            <div>

              <strong>
                Secure checkout
              </strong>

              <p>
                Stock and order details
                are verified before your
                order is confirmed.
              </p>

            </div>

          </div>

        </aside>

      </form>

    </section>
  );
}

export default Checkout;