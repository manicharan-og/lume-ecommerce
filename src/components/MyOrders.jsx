import {
  useEffect,
  useState,
} from "react";

import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase";

function MyOrders({
  onBack,
}) {
  // =====================================================
  // STATE
  // =====================================================

  const [
    orders,
    setOrders,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    cancellingOrderId,
    setCancellingOrderId,
  ] = useState("");

  // =====================================================
  // ORDER TRACKING STEPS
  // =====================================================

  const trackingSteps = [
    "Placed",
    "Confirmed",
    "Packed",
    "Shipped",
    "Out for Delivery",
    "Delivered",
  ];

  // =====================================================
  // NORMALIZE ORDER STATUS
  // =====================================================

  function getOrderStatus(
    order
  ) {
    const status =
      order.orderStatus ||
      order.status ||
      "Placed";

    const cleanStatus =
      status
        .toString()
        .trim()
        .toLowerCase();

    if (
      cleanStatus ===
      "placed"
    ) {
      return "Placed";
    }

    if (
      cleanStatus ===
      "confirmed"
    ) {
      return "Confirmed";
    }

    if (
      cleanStatus ===
      "packed"
    ) {
      return "Packed";
    }

    if (
      cleanStatus ===
      "shipped"
    ) {
      return "Shipped";
    }

    if (
      cleanStatus ===
        "out for delivery" ||
      cleanStatus ===
        "out-for-delivery" ||
      cleanStatus ===
        "out_for_delivery"
    ) {
      return "Out for Delivery";
    }

    if (
      cleanStatus ===
      "delivered"
    ) {
      return "Delivered";
    }

    if (
      cleanStatus ===
        "cancelled" ||
      cleanStatus ===
        "canceled"
    ) {
      return "Cancelled";
    }

    return "Placed";
  }

  // =====================================================
  // REAL-TIME LOAD CUSTOMER ORDERS
  // =====================================================

  useEffect(() => {
    const currentUser =
      auth.currentUser;

    if (
      !currentUser
    ) {
      setError(
        "Please sign in to view your orders."
      );

      setLoading(
        false
      );

      return;
    }

    setLoading(true);

    setError("");

    const ordersReference =
      collection(
        db,
        "orders"
      );

    const customerOrdersQuery =
      query(
        ordersReference,

        where(
          "userId",
          "==",
          currentUser.uid
        )
      );

    const unsubscribe =
      onSnapshot(
        customerOrdersQuery,

        (snapshot) => {
          const loadedOrders =
            snapshot.docs.map(
              (document) => ({
                id:
                  document.id,

                ...document.data(),
              })
            );

          loadedOrders.sort(
            (a, b) => {
              const timeA =
                a.createdAt?.seconds ||
                0;

              const timeB =
                b.createdAt?.seconds ||
                0;

              return (
                timeB -
                timeA
              );
            }
          );

          setOrders(
            loadedOrders
          );

          setLoading(
            false
          );
        },

        (firebaseError) => {
          console.error(
            "Real-time customer orders error:",
            firebaseError
          );

          if (
            firebaseError.code ===
            "permission-denied"
          ) {
            setError(
              "Permission denied. Please check your Firestore rules."
            );
          } else {
            setError(
              "Could not load your orders."
            );
          }

          setLoading(
            false
          );
        }
      );

    return () => {
      unsubscribe();
    };
  }, []);

  // =====================================================
  // FORMAT DATE
  // =====================================================

  function formatDate(
    timestamp
  ) {
    if (!timestamp) {
      return "Recently";
    }

    try {
      const date =
        timestamp.toDate
          ? timestamp.toDate()
          : new Date(
              timestamp
            );

      return date.toLocaleDateString(
        "en-IN",
        {
          day:
            "numeric",

          month:
            "long",

          year:
            "numeric",
        }
      );
    } catch {
      return "Recently";
    }
  }

  // =====================================================
  // PAYMENT NAME
  // =====================================================

  function getPaymentName(
    payment
  ) {
    if (
      payment === "cod"
    ) {
      return "Cash on Delivery";
    }

    if (
      payment === "upi"
    ) {
      return "UPI";
    }

    if (
      payment === "card"
    ) {
      return "Credit / Debit Card";
    }

    return (
      payment ||
      "Not available"
    );
  }

  // =====================================================
  // DELIVERY ADDRESS
  // =====================================================

  function getDeliveryAddress(
    order
  ) {
    const delivery =
      order.deliveryAddress;

    if (!delivery) {
      return "";
    }

    if (
      typeof delivery ===
      "string"
    ) {
      return delivery;
    }

    return [
      delivery.address,
      delivery.city,
      delivery.state,
      delivery.pin,
    ]
      .filter(Boolean)
      .join(", ");
  }

  // =====================================================
  // CURRENT TRACKING STEP
  // =====================================================

  function getCurrentStepIndex(
    status
  ) {
    return trackingSteps.indexOf(
      status
    );
  }

  // =====================================================
  // CAN CUSTOMER CANCEL?
  // =====================================================

  function canCancelOrder(
    status
  ) {
    return [
      "Placed",
      "Confirmed",
    ].includes(
      status
    );
  }

  // =====================================================
  // CANCEL ORDER
  // RESTORE STOCK AT THE SAME TIME
  // =====================================================

  async function cancelOrder(
    order
  ) {
    const currentUser =
      auth.currentUser;

    if (
      !currentUser
    ) {
      alert(
        "Please sign in again."
      );

      return;
    }

    const currentStatus =
      getOrderStatus(
        order
      );

    if (
      !canCancelOrder(
        currentStatus
      )
    ) {
      alert(
        "This order can no longer be cancelled."
      );

      return;
    }

    // Make sure order belongs
    // to current customer.

    if (
      order.userId !==
      currentUser.uid
    ) {
      alert(
        "You cannot cancel this order."
      );

      return;
    }

    const orderNumber =
      order.orderNumber ||
      order.orderId ||
      order.id;

    const confirmed =
      window.confirm(
        "Are you sure you want to cancel order " +
          orderNumber +
          "?"
      );

    if (
      !confirmed
    ) {
      return;
    }

    try {
      setCancellingOrderId(
        order.id
      );

      const orderReference =
        doc(
          db,
          "orders",
          order.id
        );

      // =================================================
      // TRANSACTION
      //
      // 1. Read latest order
      // 2. Verify ownership/status
      // 3. Read products
      // 4. Restore stock
      // 5. Cancel order
      //
      // If anything fails, nothing is changed.
      // =================================================

      await runTransaction(
        db,
        async (
          transaction
        ) => {
          // ===============================================
          // READ CURRENT ORDER
          // ===============================================

          const orderSnapshot =
            await transaction.get(
              orderReference
            );

          if (
            !orderSnapshot.exists()
          ) {
            throw new Error(
              "This order no longer exists."
            );
          }

          const storedOrder =
            orderSnapshot.data();

          // ===============================================
          // VERIFY OWNER
          // ===============================================

          if (
            storedOrder.userId !==
            currentUser.uid
          ) {
            throw new Error(
              "You cannot cancel this order."
            );
          }

          // ===============================================
          // CHECK CURRENT STATUS FROM FIRESTORE
          // ===============================================

          const storedStatus =
            getOrderStatus(
              storedOrder
            );

          if (
            !canCancelOrder(
              storedStatus
            )
          ) {
            if (
              storedStatus ===
              "Cancelled"
            ) {
              throw new Error(
                "This order has already been cancelled."
              );
            }

            throw new Error(
              "This order can no longer be cancelled."
            );
          }

          // ===============================================
          // DOUBLE RESTOCK PROTECTION
          // ===============================================

          if (
            storedOrder.stockRestored ===
            true
          ) {
            throw new Error(
              "Stock has already been restored for this order."
            );
          }

          // ===============================================
          // VALIDATE ORDER ITEMS
          // ===============================================

          const orderItems =
            Array.isArray(
              storedOrder.items
            )
              ? storedOrder.items
              : [];

          if (
            orderItems.length ===
            0
          ) {
            throw new Error(
              "No products were found in this order."
            );
          }

          // ===============================================
          // READ ALL PRODUCTS FIRST
          // ===============================================

          const productRestores =
            [];

          for (
            const item
            of orderItems
          ) {
            const productId =
              item.productId ||
              item.id;

            // Older order records may not
            // have productId.

            if (
              !productId
            ) {
              console.warn(
                "Product ID missing for:",
                item.name
              );

              continue;
            }

            const productReference =
              doc(
                db,
                "products",
                String(
                  productId
                )
              );

            const productSnapshot =
              await transaction.get(
                productReference
              );

            // If admin deleted the product,
            // do not fail entire cancellation.

            if (
              !productSnapshot.exists()
            ) {
              console.warn(
                "Product no longer exists:",
                productId
              );

              continue;
            }

            const productData =
              productSnapshot.data();

            const currentStock =
              Number(
                productData.stock ??
                  0
              );

            const orderedQuantity =
              Number(
                item.quantity ??
                  0
              );

            if (
              orderedQuantity <=
              0
            ) {
              continue;
            }

            productRestores.push({
              productReference,

              currentStock,

              orderedQuantity,
            });
          }

          // ===============================================
          // RESTORE PRODUCT STOCK
          // ===============================================

          for (
            const restore
            of productRestores
          ) {
            const restoredStock =
              restore.currentStock +
              restore.orderedQuantity;

            transaction.update(
              restore.productReference,
              {
                stock:
                  restoredStock,

                updatedAt:
                  serverTimestamp(),
              }
            );
          }

          // ===============================================
          // CANCEL ORDER
          // ===============================================

          transaction.update(
            orderReference,
            {
              status:
                "Cancelled",

              orderStatus:
                "Cancelled",

              cancelledBy:
                "customer",

              cancelledAt:
                serverTimestamp(),

              // Prevent the same
              // order from restoring
              // inventory twice.

              stockRestored:
                true,

              stockRestoredAt:
                serverTimestamp(),

              updatedAt:
                serverTimestamp(),
            }
          );
        }
      );

      alert(
        "Your order has been cancelled successfully and the product stock has been restored."
      );

      // onSnapshot will update
      // the page automatically.
    } catch (
      firebaseError
    ) {
      console.error(
        "Order cancellation error:",
        firebaseError
      );

      if (
        firebaseError.code ===
        "permission-denied"
      ) {
        alert(
          "Permission denied. Please update your Firestore rules for cancellation stock restoration."
        );
      } else {
        alert(
          firebaseError?.message ||
          "Could not cancel your order. Please try again."
        );
      }
    } finally {
      setCancellingOrderId(
        ""
      );
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (
    loading
  ) {
    return (
      <section className="orders-page">

        <button
          type="button"
          className="back-button"
          onClick={
            onBack
          }
        >
          ← BACK
        </button>

        <div className="orders-status">

          <p className="small-title">
            MY ORDERS
          </p>

          <h2>
            Loading your orders...
          </h2>

        </div>

      </section>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (
    error
  ) {
    return (
      <section className="orders-page">

        <button
          type="button"
          className="back-button"
          onClick={
            onBack
          }
        >
          ← BACK
        </button>

        <div className="orders-status">

          <p className="small-title">
            MY ORDERS
          </p>

          <h2>
            Something went wrong
          </h2>

          <p>
            {
              error
            }
          </p>

        </div>

      </section>
    );
  }

  // =====================================================
  // NO ORDERS
  // =====================================================

  if (
    orders.length ===
    0
  ) {
    return (
      <section className="orders-page">

        <button
          type="button"
          className="back-button"
          onClick={
            onBack
          }
        >
          ← BACK
        </button>

        <div className="orders-status">

          <p className="small-title">
            MY ORDERS
          </p>

          <h1>
            No orders yet
          </h1>

          <p>
            Once you place an order,
            it will appear here.
          </p>

          <button
            type="button"
            className="shop-button"
            onClick={
              onBack
            }
          >
            START SHOPPING →
          </button>

        </div>

      </section>
    );
  }

  // =====================================================
  // ORDERS PAGE
  // =====================================================

  return (
    <section className="orders-page">

      {/* HEADER */}

      <div className="orders-header">

        <button
          type="button"
          className="back-button"
          onClick={
            onBack
          }
        >
          ← BACK
        </button>

        <div>

          <p className="small-title">
            YOUR ACCOUNT
          </p>

          <h1>
            My Orders
          </h1>

          <p>
            Track and review your
            Lumé purchases in real time.
          </p>

        </div>

      </div>

      {/* ORDERS */}

      <div className="orders-list">

        {orders.map(
          (order) => {
            const currentStatus =
              getOrderStatus(
                order
              );

            const currentStepIndex =
              getCurrentStepIndex(
                currentStatus
              );

            const isCancelled =
              currentStatus ===
              "Cancelled";

            const cancellationAllowed =
              canCancelOrder(
                currentStatus
              );

            const deliveryAddress =
              getDeliveryAddress(
                order
              );

            return (
              <article
                className="order-card"
                key={
                  order.id
                }
              >

                {/* ORDER HEADER */}

                <div className="order-card-header">

                  <div>

                    <span>
                      ORDER
                    </span>

                    <strong>
                      {order.orderNumber ||
                        order.orderId ||
                        order.id}
                    </strong>

                  </div>

                  <div>

                    <span>
                      PLACED ON
                    </span>

                    <strong>
                      {formatDate(
                        order.createdAt
                      )}
                    </strong>

                  </div>

                  <div>

                    <span>
                      TOTAL
                    </span>

                    <strong>
                      ₹
                      {Number(
                        order.total ||
                          0
                      ).toLocaleString(
                        "en-IN"
                      )}
                    </strong>

                  </div>

                  <div>

                    <span>
                      STATUS
                    </span>

                    <strong
                      className={
                        currentStatus ===
                        "Delivered"
                          ? "order-status delivered"
                          : isCancelled
                            ? "order-status cancelled"
                            : "order-status"
                      }
                    >
                      {
                        currentStatus
                      }
                    </strong>

                  </div>

                </div>

                {/* TRACKING */}

                {!isCancelled ? (

                  <div className="order-tracker">

                    <div className="order-tracker-title">

                      <p className="small-title">
                        ORDER TRACKING
                      </p>

                      <strong>
                        {
                          currentStatus
                        }
                      </strong>

                    </div>

                    <div className="tracking-steps">

                      {trackingSteps.map(
                        (
                          step,
                          index
                        ) => {
                          const completed =
                            index <=
                            currentStepIndex;

                          const current =
                            index ===
                            currentStepIndex;

                          return (
                            <div
                              className={[
                                "tracking-step",

                                completed
                                  ? "completed"
                                  : "",

                                current
                                  ? "current"
                                  : "",
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(
                                  " "
                                )}
                              key={
                                step
                              }
                            >

                              <div className="tracking-marker">

                                <div className="tracking-circle">

                                  {completed
                                    ? "✓"
                                    : index +
                                      1}

                                </div>

                                {index <
                                  trackingSteps.length -
                                    1 && (

                                  <div
                                    className={
                                      index <
                                      currentStepIndex
                                        ? "tracking-line completed"
                                        : "tracking-line"
                                    }
                                  />

                                )}

                              </div>

                              <div className="tracking-label">

                                <strong>
                                  {
                                    step
                                  }
                                </strong>

                                {current && (

                                  <small>
                                    Current status
                                  </small>

                                )}

                              </div>

                            </div>
                          );
                        }
                      )}

                    </div>

                  </div>

                ) : (

                  <div className="order-tracker">

                    <div className="cancelled-order-message">

                      <span>
                        ×
                      </span>

                      <div>

                        <strong>
                          Order Cancelled
                        </strong>

                        <p>
                          This order has
                          been cancelled.
                        </p>

                        {order.stockRestored ===
                          true && (
                          <small>
                            Product stock restored
                          </small>
                        )}

                      </div>

                    </div>

                  </div>

                )}

                {/* PRODUCTS */}

                <div className="order-products">

                  {Array.isArray(
                    order.items
                  ) &&
                    order.items.map(
                      (
                        item,
                        index
                      ) => (

                        <div
                          className="order-product"
                          key={
                            (
                              item.productId ||
                              item.id ||
                              index
                            ) +
                            "-" +
                            item.size +
                            "-" +
                            index
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

                          <div>

                            <p className="product-category">
                              {
                                item.category
                              }
                            </p>

                            <h3>
                              {
                                item.name
                              }
                            </h3>

                            <p>
                              Size:{" "}

                              <strong>
                                {
                                  item.size
                                }
                              </strong>
                            </p>

                            <p>
                              Quantity:{" "}

                              <strong>
                                {
                                  item.quantity
                                }
                              </strong>
                            </p>

                            <strong>
                              ₹
                              {Number(
                                item.itemTotal ||
                                  item.price *
                                    item.quantity
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </strong>

                          </div>

                        </div>

                      )
                    )}

                </div>

                {/* ORDER DETAILS */}

                <div className="order-footer">

                  <div>

                    <span>
                      Payment
                    </span>

                    <strong>
                      {order.paymentMethodName ||
                        getPaymentName(
                          order.paymentMethod ||
                            order.payment
                        )}
                    </strong>

                  </div>

                  <div>

                    <span>
                      Payment Status
                    </span>

                    <strong>
                      {order.paymentStatus ||
                        "Pending"}
                    </strong>

                  </div>

                  {deliveryAddress && (

                    <div>

                      <span>
                        Delivery
                      </span>

                      <strong>
                        {
                          deliveryAddress
                        }
                      </strong>

                    </div>

                  )}

                </div>

                {/* CUSTOMER ACTIONS */}

                {cancellationAllowed && (

                  <div className="customer-order-actions">

                    <button
                      type="button"
                      className="cancel-order-button"
                      disabled={
                        cancellingOrderId ===
                        order.id
                      }
                      onClick={() =>
                        cancelOrder(
                          order
                        )
                      }
                    >
                      {cancellingOrderId ===
                      order.id
                        ? "CANCELLING..."
                        : "CANCEL ORDER"}
                    </button>

                    <p>
                      You can cancel this
                      order before it is
                      packed.
                    </p>

                  </div>

                )}

              </article>
            );
          }
        )}

      </div>

    </section>
  );
}

export default MyOrders;