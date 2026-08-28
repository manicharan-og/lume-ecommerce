import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase";

function AdminOrders({
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
    updatingOrderId,
    setUpdatingOrderId,
  ] = useState("");

  const [
    cancellingOrderId,
    setCancellingOrderId,
  ] = useState("");

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("All");

  // =====================================================
  // ORDER STATUS FLOW
  // =====================================================

  const orderStatuses = [
    "Placed",
    "Confirmed",
    "Packed",
    "Shipped",
    "Out for Delivery",
    "Delivered",
  ];

  // =====================================================
  // NORMALIZE STATUS
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
  // REAL-TIME LOAD ORDERS
  // =====================================================

  useEffect(() => {
    const currentUser =
      auth.currentUser;

    if (
      !currentUser
    ) {
      setError(
        "Please sign in as admin."
      );

      setLoading(
        false
      );

      return;
    }

    setLoading(
      true
    );

    setError("");

    const ordersReference =
      collection(
        db,
        "orders"
      );

    const unsubscribe =
      onSnapshot(
        ordersReference,

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

        (
          firebaseError
        ) => {
          console.error(
            "Real-time orders error:",
            firebaseError
          );

          if (
            firebaseError.code ===
            "permission-denied"
          ) {
            setError(
              "Permission denied. Check your admin role and Firestore rules."
            );
          } else {
            setError(
              "Could not load orders."
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
  // STATUS COUNTS
  // =====================================================

  const counts =
    useMemo(() => {
      const result = {
        All:
          orders.length,

        Placed: 0,
        Confirmed: 0,
        Packed: 0,
        Shipped: 0,
        "Out for Delivery": 0,
        Delivered: 0,
        Cancelled: 0,
      };

      orders.forEach(
        (order) => {
          const status =
            getOrderStatus(
              order
            );

          if (
            result[
              status
            ] !== undefined
          ) {
            result[
              status
            ] += 1;
          }
        }
      );

      return result;
    }, [orders]);

  // =====================================================
  // ADMIN SUMMARY
  // =====================================================

  const adminSummary =
    useMemo(() => {
      const totalRevenue =
        orders.reduce(
          (
            total,
            order
          ) => {
            const status =
              getOrderStatus(
                order
              );

            if (
              status ===
              "Cancelled"
            ) {
              return total;
            }

            return (
              total +
              Number(
                order.total ||
                  0
              )
            );
          },
          0
        );

      const pendingOrders =
        orders.filter(
          (order) => {
            const status =
              getOrderStatus(
                order
              );

            return ![
              "Delivered",
              "Cancelled",
            ].includes(
              status
            );
          }
        ).length;

      const deliveredOrders =
        orders.filter(
          (order) =>
            getOrderStatus(
              order
            ) ===
            "Delivered"
        ).length;

      const cancelledOrders =
        orders.filter(
          (order) =>
            getOrderStatus(
              order
            ) ===
            "Cancelled"
        ).length;

      return {
        totalOrders:
          orders.length,

        totalRevenue,

        pendingOrders,

        deliveredOrders,

        cancelledOrders,
      };
    }, [orders]);

  // =====================================================
  // FILTER ORDERS
  // =====================================================

  const filteredOrders =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return orders.filter(
        (order) => {
          const status =
            getOrderStatus(
              order
            );

          const matchesStatus =
            statusFilter ===
              "All" ||
            status ===
              statusFilter;

          const orderNumber =
            (
              order.orderNumber ||
              order.orderId ||
              order.id ||
              ""
            )
              .toString()
              .toLowerCase();

          const customerName =
            (
              order.customer
                ?.fullName ||
              order.fullName ||
              ""
            )
              .toString()
              .toLowerCase();

          const customerEmail =
            (
              order.customer
                ?.email ||
              order.email ||
              order.customerEmail ||
              ""
            )
              .toString()
              .toLowerCase();

          const customerPhone =
            (
              order.customer
                ?.phone ||
              order.phone ||
              ""
            )
              .toString()
              .toLowerCase();

          const matchesSearch =
            !search ||
            orderNumber.includes(
              search
            ) ||
            customerName.includes(
              search
            ) ||
            customerEmail.includes(
              search
            ) ||
            customerPhone.includes(
              search
            );

          return (
            matchesStatus &&
            matchesSearch
          );
        }
      );
    }, [
      orders,
      searchTerm,
      statusFilter,
    ]);

  // =====================================================
  // NEXT ORDER STATUS
  // =====================================================

  function getNextStatus(
    currentStatus
  ) {
    const currentIndex =
      orderStatuses.indexOf(
        currentStatus
      );

    if (
      currentIndex === -1
    ) {
      return null;
    }

    if (
      currentIndex >=
      orderStatuses.length -
        1
    ) {
      return null;
    }

    return orderStatuses[
      currentIndex + 1
    ];
  }

  // =====================================================
  // STATUS OPTIONS
  //
  // Admin can keep current status
  // or advance only one step.
  // =====================================================

  function getStatusOptions(
    currentStatus
  ) {
    if (
      currentStatus ===
      "Cancelled"
    ) {
      return [
        "Cancelled",
      ];
    }

    if (
      currentStatus ===
      "Delivered"
    ) {
      return [
        "Delivered",
      ];
    }

    const nextStatus =
      getNextStatus(
        currentStatus
      );

    if (
      !nextStatus
    ) {
      return [
        currentStatus,
      ];
    }

    return [
      currentStatus,
      nextStatus,
    ];
  }

  // =====================================================
  // UPDATE ORDER STATUS
  // =====================================================

  async function updateOrderStatus(
    order,
    newStatus
  ) {
    const currentUser =
      auth.currentUser;

    if (
      !currentUser
    ) {
      alert(
        "Please sign in as admin."
      );

      return;
    }

    const currentStatus =
      getOrderStatus(
        order
      );

    if (
      currentStatus ===
        "Cancelled" ||
      currentStatus ===
        "Delivered"
    ) {
      return;
    }

    const nextStatus =
      getNextStatus(
        currentStatus
      );

    if (
      newStatus ===
      currentStatus
    ) {
      return;
    }

    if (
      newStatus !==
      nextStatus
    ) {
      alert(
        `Order can only move from ${currentStatus} to ${nextStatus}.`
      );

      return;
    }

    try {
      setUpdatingOrderId(
        order.id
      );

      await updateDoc(
        doc(
          db,
          "orders",
          order.id
        ),
        {
          status:
            newStatus,

          orderStatus:
            newStatus,

          updatedAt:
            serverTimestamp(),
        }
      );
    } catch (
      firebaseError
    ) {
      console.error(
        "Status update error:",
        firebaseError
      );

      if (
        firebaseError.code ===
        "permission-denied"
      ) {
        alert(
          "Permission denied. Make sure this account has role: admin."
        );
      } else {
        alert(
          "Could not update order status."
        );
      }
    } finally {
      setUpdatingOrderId(
        ""
      );
    }
  }

  // =====================================================
  // CAN ADMIN CANCEL?
  // =====================================================

  function canAdminCancel(
    order
  ) {
    const status =
      getOrderStatus(
        order
      );

    return ![
      "Delivered",
      "Cancelled",
    ].includes(
      status
    );
  }

  // =====================================================
  // ADMIN CANCEL ORDER
  // RESTORE INVENTORY AT SAME TIME
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
        "Please sign in as admin."
      );

      return;
    }

    if (
      !canAdminCancel(
        order
      )
    ) {
      alert(
        "This order cannot be cancelled."
      );

      return;
    }

    const orderNumber =
      order.orderNumber ||
      order.orderId ||
      order.id;

    const confirmed =
      window.confirm(
        `Are you sure you want to cancel order ${orderNumber}?`
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

      await runTransaction(
        db,
        async (
          transaction
        ) => {
          // ===============================================
          // READ LATEST ORDER
          // ===============================================

          const orderSnapshot =
            await transaction.get(
              orderReference
            );

          if (
            !orderSnapshot.exists()
          ) {
            throw new Error(
              "Order no longer exists."
            );
          }

          const storedOrder =
            orderSnapshot.data();

          const storedStatus =
            getOrderStatus(
              storedOrder
            );

          // ===============================================
          // DO NOT CANCEL DELIVERED ORDER
          // ===============================================

          if (
            storedStatus ===
            "Delivered"
          ) {
            throw new Error(
              "Delivered orders cannot be cancelled."
            );
          }

          // ===============================================
          // ALREADY CANCELLED
          // ===============================================

          if (
            storedStatus ===
            "Cancelled"
          ) {
            throw new Error(
              "This order has already been cancelled."
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
          // READ ALL PRODUCT DOCUMENTS FIRST
          // Firestore requires reads before writes.
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

            if (
              !productId
            ) {
              console.warn(
                "Missing product ID:",
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

            // Product may have been deleted
            // by admin after purchase.
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
          // RESTORE STOCK
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
                "admin",

              cancelledAt:
                serverTimestamp(),

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
        "Order cancelled successfully and product stock has been restored."
      );
    } catch (
      firebaseError
    ) {
      console.error(
        "Admin cancellation error:",
        firebaseError
      );

      if (
        firebaseError.code ===
        "permission-denied"
      ) {
        alert(
          "Permission denied. Make sure this account has role: admin."
        );
      } else {
        alert(
          firebaseError?.message ||
            "Could not cancel the order."
        );
      }
    } finally {
      setCancellingOrderId(
        ""
      );
    }
  }

  // =====================================================
  // FORMAT DATE
  // =====================================================

  function formatDate(
    timestamp
  ) {
    if (
      !timestamp
    ) {
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
            "short",

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
      payment ===
      "cod"
    ) {
      return "Cash on Delivery";
    }

    if (
      payment ===
      "upi"
    ) {
      return "UPI";
    }

    if (
      payment ===
      "card"
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

    if (
      !delivery
    ) {
      return "Not available";
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
  // LOADING
  // =====================================================

  if (
    loading
  ) {
    return (
      <section className="admin-orders-page">

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
            LUMÉ ADMIN
          </p>

          <h2>
            Loading orders...
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
      <section className="admin-orders-page">

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
            LUMÉ ADMIN
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
  // PAGE
  // =====================================================

  return (
    <section className="admin-orders-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="admin-orders-header">

        <button
          type="button"
          className="back-button"
          onClick={
            onBack
          }
        >
          ← BACK TO STORE
        </button>

        <p className="small-title">
          LUMÉ ADMIN
        </p>

        <h1>
          Order Management
        </h1>

        <p>
          Manage customer orders,
          payments and delivery status
          in real time.
        </p>

      </div>

      {/* =================================================
          BUSINESS SUMMARY
      ================================================= */}

      <div className="admin-summary-grid">

        <div className="admin-summary-card">

          <span>
            TOTAL ORDERS
          </span>

          <strong>
            {
              adminSummary
                .totalOrders
            }
          </strong>

        </div>

        <div className="admin-summary-card">

          <span>
            TOTAL REVENUE
          </span>

          <strong>
            ₹
            {adminSummary
              .totalRevenue
              .toLocaleString(
                "en-IN"
              )}
          </strong>

        </div>

        <div className="admin-summary-card">

          <span>
            PENDING
          </span>

          <strong>
            {
              adminSummary
                .pendingOrders
            }
          </strong>

        </div>

        <div className="admin-summary-card">

          <span>
            DELIVERED
          </span>

          <strong>
            {
              adminSummary
                .deliveredOrders
            }
          </strong>

        </div>

        <div className="admin-summary-card">

          <span>
            CANCELLED
          </span>

          <strong>
            {
              adminSummary
                .cancelledOrders
            }
          </strong>

        </div>

      </div>

      {/* =================================================
          STATUS FILTERS
      ================================================= */}

      <div className="admin-stats">

        {[
          "All",
          "Placed",
          "Confirmed",
          "Packed",
          "Shipped",
          "Out for Delivery",
          "Delivered",
          "Cancelled",
        ].map(
          (status) => (

            <button
              type="button"
              key={
                status
              }
              className={
                statusFilter ===
                status
                  ? "admin-stat-card active"
                  : "admin-stat-card"
              }
              onClick={() =>
                setStatusFilter(
                  status
                )
              }
            >

              <span>
                {status ===
                "All"
                  ? "ALL ORDERS"
                  : status.toUpperCase()}
              </span>

              <strong>
                {
                  counts[
                    status
                  ] || 0
                }
              </strong>

            </button>

          )
        )}

      </div>

      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="admin-orders-toolbar">

        <input
          type="text"
          placeholder="Search order, name, email or phone..."
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
        />

        <span>
          {
            filteredOrders.length
          }{" "}
          order
          {filteredOrders.length ===
          1
            ? ""
            : "s"}
        </span>

      </div>

      {/* =================================================
          ORDERS
      ================================================= */}

      {filteredOrders.length ===
      0 ? (

        <div className="orders-status">

          <h2>
            No orders found
          </h2>

          <p>
            Try another search or
            status filter.
          </p>

        </div>

      ) : (

        <div className="admin-orders-list">

          {filteredOrders.map(
            (order) => {
              const currentStatus =
                getOrderStatus(
                  order
                );

              const nextStatus =
                getNextStatus(
                  currentStatus
                );

              const statusOptions =
                getStatusOptions(
                  currentStatus
                );

              const cancellationAllowed =
                canAdminCancel(
                  order
                );

              const isUpdating =
                updatingOrderId ===
                order.id;

              const isCancelling =
                cancellingOrderId ===
                order.id;

              return (
                <article
                  className="admin-order-card"
                  key={
                    order.id
                  }
                >

                  {/* =====================================
                      ORDER HEADER
                  ===================================== */}

                  <div className="admin-order-top">

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
                        DATE
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
                            : currentStatus ===
                              "Cancelled"
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

                  {/* =====================================
                      CUSTOMER
                  ===================================== */}

                  <div className="admin-order-section">

                    <p className="small-title">
                      CUSTOMER
                    </p>

                    <h3>
                      {order.customer
                        ?.fullName ||
                        order.fullName ||
                        "Customer"}
                    </h3>

                    <p>
                      {order.customer
                        ?.email ||
                        order.email ||
                        order.customerEmail ||
                        "No email"}
                    </p>

                    <p>
                      {order.customer
                        ?.phone ||
                        order.phone ||
                        "No phone number"}
                    </p>

                  </div>

                  {/* =====================================
                      PRODUCTS
                  ===================================== */}

                  <div className="admin-order-products">

                    {Array.isArray(
                      order.items
                    ) &&
                      order.items.map(
                        (
                          item,
                          index
                        ) => (

                          <div
                            className="admin-order-product"
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
                                Size{" "}
                                {
                                  item.size
                                }

                                {" · "}

                                Qty{" "}
                                {
                                  item.quantity
                                }
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

                  {/* =====================================
                      ORDER DETAILS
                  ===================================== */}

                  <div className="admin-order-details">

                    <div>

                      <span>
                        PAYMENT
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
                        PAYMENT STATUS
                      </span>

                      <strong>
                        {order.paymentStatus ||
                          "Pending"}
                      </strong>

                    </div>

                    <div>

                      <span>
                        DELIVERY ADDRESS
                      </span>

                      <strong>
                        {getDeliveryAddress(
                          order
                        )}
                      </strong>

                    </div>

                  </div>

                  {/* =====================================
                      CANCELLED INFO
                  ===================================== */}

                  {currentStatus ===
                    "Cancelled" && (

                    <div className="cancelled-order-message">

                      <span>
                        ×
                      </span>

                      <div>

                        <strong>
                          Order Cancelled
                        </strong>

                        <p>
                          Cancelled by{" "}
                          {
                            order.cancelledBy ||
                            "admin"
                          }.
                        </p>

                        {order.stockRestored ===
                          true && (

                          <small>
                            ✓ Product stock restored
                          </small>

                        )}

                      </div>

                    </div>

                  )}

                  {/* =====================================
                      STATUS CONTROL
                  ===================================== */}

                  {currentStatus !==
                    "Cancelled" && (

                    <div className="admin-status-control">

                      <label>
                        UPDATE ORDER STATUS
                      </label>

                      <select
                        value={
                          currentStatus
                        }
                        disabled={
                          isUpdating ||
                          isCancelling ||
                          currentStatus ===
                            "Delivered"
                        }
                        onChange={(
                          event
                        ) =>
                          updateOrderStatus(
                            order,
                            event.target.value
                          )
                        }
                      >

                        {statusOptions.map(
                          (
                            status
                          ) => (

                            <option
                              key={
                                status
                              }
                              value={
                                status
                              }
                            >
                              {
                                status
                              }
                            </option>

                          )
                        )}

                      </select>

                      {isUpdating && (

                        <small>
                          Updating status...
                        </small>

                      )}

                      {!isUpdating &&
                        nextStatus &&
                        currentStatus !==
                          "Delivered" && (

                        <small>
                          Next:{" "}
                          {
                            nextStatus
                          }
                        </small>

                      )}

                      {currentStatus ===
                        "Delivered" && (

                        <small>
                          Order completed.
                        </small>

                      )}

                    </div>

                  )}

                  {/* =====================================
                      ADMIN CANCELLATION
                  ===================================== */}

                  {cancellationAllowed && (

                    <div className="customer-order-actions">

                      <button
                        type="button"
                        className="cancel-order-button"
                        disabled={
                          isCancelling ||
                          isUpdating
                        }
                        onClick={() =>
                          cancelOrder(
                            order
                          )
                        }
                      >
                        {isCancelling
                          ? "CANCELLING..."
                          : "CANCEL ORDER"}
                      </button>

                      <p>
                        Cancelling this order
                        restores the purchased
                        quantities to product
                        stock.
                      </p>

                    </div>

                  )}

                </article>
              );
            }
          )}

        </div>

      )}

    </section>
  );
}

export default AdminOrders;