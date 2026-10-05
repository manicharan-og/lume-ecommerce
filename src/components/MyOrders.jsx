import { useEffect, useMemo, useState } from "react";

import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";

const TRACKING_STEPS = [
  "Placed",
  "Confirmed",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
];

function normaliseStatus(order = {}) {
  const clean = String(
    order.orderStatus ||
      order.status ||
      "Placed"
  )
    .trim()
    .toLowerCase();

  if (clean === "confirmed") return "Confirmed";
  if (clean === "packed") return "Packed";
  if (clean === "shipped") return "Shipped";

  if (
    clean === "out for delivery" ||
    clean === "out-for-delivery" ||
    clean === "out_for_delivery"
  ) {
    return "Out for Delivery";
  }

  if (clean === "delivered") return "Delivered";

  if (
    clean === "cancelled" ||
    clean === "canceled"
  ) {
    return "Cancelled";
  }

  return "Placed";
}

function formatDate(timestamp) {
  if (!timestamp) return "Recently";

  try {
    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  } catch {
    return "Recently";
  }
}

function formatTime(timestamp) {
  if (!timestamp) return "";

  try {
    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

    return date.toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  } catch {
    return "";
  }
}

function getPaymentName(order = {}) {
  if (order.paymentMethodName) {
    return order.paymentMethodName;
  }

  const value = String(
    order.paymentMethod ||
      order.payment ||
      ""
  ).toLowerCase();

  if (value === "cod") {
    return "Cash on Delivery";
  }

  if (value === "upi") {
    return "UPI";
  }

  if (value === "card") {
    return "Credit / Debit Card";
  }

  return value || "Not available";
}

function getAddress(order = {}) {
  const value =
    order.deliveryAddress;

  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return [
    value.address,
    value.city,
    value.state,
    value.pin,
  ]
    .filter(Boolean)
    .join(", ");
}

function fallbackImage(item = {}) {
  const value = `${item.name || ""} ${item.category || ""}`.toLowerCase();

  if (value.includes("trouser") || value.includes("bottom")) {
    return "/images/trousers.jpg";
  }

  if (value.includes("hoodie")) {
    return "/images/hoodie.jpg";
  }

  if (
    value.includes("t-shirt") ||
    value.includes("tshirt") ||
    value.includes("tee")
  ) {
    return "/images/tshirt.jpg";
  }

  return "/images/shirt.jpg";
}

function resolveOrderImage(item = {}) {
  const raw = String(
    item.image ||
      item.imageUrl ||
      ""
  ).trim();

  if (!raw) return fallbackImage(item);

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:")
  ) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return raw;
  }

  if (raw.startsWith("images/")) {
    return `/${raw}`;
  }

  return `/images/${raw.replace(/^.*[\\/]/, "")}`;
}

function MyOrders({ onBack }) {
  const [orders, setOrders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    cancellingOrderId,
    setCancellingOrderId,
  ] = useState("");

  const [filter, setFilter] =
    useState("All");

  const [expandedOrderId, setExpandedOrderId] =
    useState("");

  useEffect(() => {
    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      setError(
        "Please sign in to view your orders."
      );
      setLoading(false);
      return;
    }

    const ordersRef =
      collection(db, "orders");

    const customerOrdersQuery =
      query(
        ordersRef,
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
          const loaded =
            snapshot.docs.map(
              (document) => ({
                id: document.id,
                ...document.data(),
              })
            );

          loaded.sort((a, b) => {
            const timeA =
              a.createdAt?.seconds ||
              0;

            const timeB =
              b.createdAt?.seconds ||
              0;

            return timeB - timeA;
          });

          setOrders(loaded);
          setLoading(false);
          setError("");
        },
        (snapshotError) => {
          console.error(
            "Customer orders error:",
            snapshotError
          );

          setError(
            snapshotError.code ===
              "permission-denied"
              ? "Permission denied. Please check your Firestore rules."
              : "Could not load your orders."
          );

          setLoading(false);
        }
      );

    return unsubscribe;
  }, []);

  const orderCounts = useMemo(() => {
    const result = {
      All: orders.length,
      Active: 0,
      Delivered: 0,
      Cancelled: 0,
    };

    orders.forEach((order) => {
      const status =
        normaliseStatus(order);

      if (
        status === "Delivered"
      ) {
        result.Delivered += 1;
      } else if (
        status === "Cancelled"
      ) {
        result.Cancelled += 1;
      } else {
        result.Active += 1;
      }
    });

    return result;
  }, [orders]);

  const visibleOrders =
    useMemo(() => {
      if (filter === "All") {
        return orders;
      }

      if (filter === "Active") {
        return orders.filter(
          (order) => {
            const status =
              normaliseStatus(order);

            return ![
              "Delivered",
              "Cancelled",
            ].includes(status);
          }
        );
      }

      return orders.filter(
        (order) =>
          normaliseStatus(order) ===
          filter
      );
    }, [filter, orders]);

  function canCancel(status) {
    return [
      "Placed",
      "Confirmed",
    ].includes(status);
  }

  async function cancelOrder(order) {
    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      alert(
        "Please sign in again."
      );
      return;
    }

    const currentStatus =
      normaliseStatus(order);

    if (!canCancel(currentStatus)) {
      alert(
        "This order can no longer be cancelled."
      );
      return;
    }

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
        `Cancel order ${orderNumber}? Stock will be restored automatically.`
      );

    if (!confirmed) return;

    try {
      setCancellingOrderId(
        order.id
      );

      await runTransaction(
        db,
        async (transaction) => {
          const orderRef =
            doc(
              db,
              "orders",
              order.id
            );

          const orderSnap =
            await transaction.get(
              orderRef
            );

          if (!orderSnap.exists()) {
            throw new Error(
              "Order no longer exists."
            );
          }

          const liveOrder =
            orderSnap.data();

          if (
            liveOrder.userId !==
            currentUser.uid
          ) {
            throw new Error(
              "You cannot cancel this order."
            );
          }

          const liveStatus =
            normaliseStatus(
              liveOrder
            );

          if (
            !canCancel(
              liveStatus
            )
          ) {
            throw new Error(
              "This order can no longer be cancelled."
            );
          }

          const quantityByProductId =
            new Map();

          for (
            const item
            of Array.isArray(
              liveOrder.items
            )
              ? liveOrder.items
              : []
          ) {
            const productId =
              String(
                item.productId ||
                  item.id ||
                  ""
              );

            const quantity =
              Number(
                item.quantity ||
                  0
              );

            if (
              !productId ||
              quantity <= 0
            ) {
              continue;
            }

            quantityByProductId.set(
              productId,
              (
                quantityByProductId.get(
                  productId
                ) || 0
              ) + quantity
            );
          }

          const productRows = [];

          for (
            const [
              productId,
              quantity,
            ]
            of quantityByProductId.entries()
          ) {
            const productRef =
              doc(
                db,
                "products",
                productId
              );

            const productSnap =
              await transaction.get(
                productRef
              );

            if (
              productSnap.exists()
            ) {
              productRows.push({
                productRef,
                currentStock:
                  Number(
                    productSnap.data()
                      .stock || 0
                  ),
                quantity,
              });
            }
          }

          for (
            const row
            of productRows
          ) {
            transaction.update(
              row.productRef,
              {
                stock:
                  row.currentStock +
                  row.quantity,
                updatedAt:
                  serverTimestamp(),
              }
            );
          }

          transaction.update(
            orderRef,
            {
              status: "Cancelled",
              orderStatus:
                "Cancelled",
              cancelledBy:
                "customer",
              cancelledAt:
                serverTimestamp(),
              stockRestored: true,
              updatedAt:
                serverTimestamp(),
            }
          );
        }
      );

      alert(
        "Your order has been cancelled successfully."
      );
    } catch (cancelError) {
      console.error(
        "Order cancellation error:",
        cancelError
      );

      alert(
        cancelError?.message ||
          "Could not cancel your order. Please try again."
      );
    } finally {
      setCancellingOrderId(
        ""
      );
    }
  }

  function renderStatusScreen(
    title,
    text
  ) {
    return (
      <section className="orders-page orders-state-page">
        <button
          type="button"
          className="orders-back"
          onClick={onBack}
        >
          ← BACK
        </button>

        <div className="orders-state">
          <p>MY ORDERS</p>
          <h1>{title}</h1>
          {text && <span>{text}</span>}

          <button
            type="button"
            onClick={onBack}
          >
            RETURN TO STORE →
          </button>
        </div>
      </section>
    );
  }

  if (loading) {
    return renderStatusScreen(
      "Loading your orders…",
      "Your latest order information is being synced."
    );
  }

  if (error) {
    return renderStatusScreen(
      "Something went wrong",
      error
    );
  }

  if (orders.length === 0) {
    return renderStatusScreen(
      "No orders yet",
      "Once you place an order, it will appear here."
    );
  }

  return (
    <main className="orders-page lume-orders">
      <section className="orders-top">
        <button
          type="button"
          className="orders-back"
          onClick={onBack}
        >
          ← BACK TO STORE
        </button>

        <div className="orders-title-row">
          <div>
            <p>YOUR ACCOUNT</p>
            <h1>My Orders.</h1>
            <span>
              Track, review and manage your LUMÉ purchases in real time.
            </span>
          </div>

          <strong>
            {orders.length} ORDER
            {orders.length === 1
              ? ""
              : "S"}
          </strong>
        </div>
      </section>

      <nav className="orders-filters">
        {[
          "All",
          "Active",
          "Delivered",
          "Cancelled",
        ].map((value) => (
          <button
            type="button"
            key={value}
            className={
              filter === value
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter(value)
            }
          >
            {value}
            <span>
              {orderCounts[value]}
            </span>
          </button>
        ))}
      </nav>

      <section className="orders-list">
        {visibleOrders.length === 0 ? (
          <div className="orders-filter-empty">
            <p>NO ORDERS</p>
            <h2>
              Nothing in this view.
            </h2>
            <button
              type="button"
              onClick={() =>
                setFilter("All")
              }
            >
              SHOW ALL ORDERS →
            </button>
          </div>
        ) : (
          visibleOrders.map(
            (order) => {
              const status =
                normaliseStatus(
                  order
                );

              const stepIndex =
                TRACKING_STEPS.indexOf(
                  status
                );

              const cancelled =
                status ===
                "Cancelled";

              const delivered =
                status ===
                "Delivered";

              const address =
                getAddress(order);

              const items =
                Array.isArray(
                  order.items
                )
                  ? order.items
                  : [];

              const expanded =
                expandedOrderId ===
                order.id;

              const orderNumber =
                order.orderNumber ||
                order.orderId ||
                order.id;

              const paymentStatus =
                order.paymentStatus ||
                "Pending";

              return (
                <article
                  className={`premium-order-card ${
                    cancelled
                      ? "is-cancelled"
                      : delivered
                        ? "is-delivered"
                        : ""
                  }`}
                  key={order.id}
                >
                  <header className="premium-order-header">
                    <div>
                      <span>ORDER</span>
                      <strong>
                        {orderNumber}
                      </strong>
                    </div>

                    <div>
                      <span>PLACED</span>
                      <strong>
                        {formatDate(
                          order.createdAt
                        )}
                      </strong>
                      <small>
                        {formatTime(
                          order.createdAt
                        )}
                      </small>
                    </div>

                    <div>
                      <span>ITEMS</span>
                      <strong>
                        {Number(
                          order.itemCount ||
                            items.reduce(
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
                            )
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>TOTAL</span>
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

                    <div className="order-status-column">
                      <span>STATUS</span>
                      <strong
                        className={`premium-order-status status-${status
                          .toLowerCase()
                          .replaceAll(
                            " ",
                            "-"
                          )}`}
                      >
                        {status}
                      </strong>
                    </div>
                  </header>

                  {!cancelled ? (
                    <section className="premium-tracking">
                      <div className="tracking-heading">
                        <div>
                          <p>ORDER TRACKING</p>
                          <h2>
                            {delivered
                              ? "Delivered."
                              : `${status}.`}
                          </h2>
                        </div>

                        <span>
                          {delivered
                            ? "Your order has been completed."
                            : "Live status updates"}
                        </span>
                      </div>

                      <div className="premium-tracking-steps">
                        {TRACKING_STEPS.map(
                          (
                            step,
                            index
                          ) => {
                            const complete =
                              index <=
                              stepIndex;

                            const current =
                              index ===
                              stepIndex;

                            return (
                              <div
                                className={`premium-track-step ${
                                  complete
                                    ? "complete"
                                    : ""
                                } ${
                                  current
                                    ? "current"
                                    : ""
                                }`}
                                key={step}
                              >
                                <div className="premium-track-marker">
                                  <span>
                                    {complete
                                      ? "✓"
                                      : index +
                                        1}
                                  </span>

                                  {index <
                                    TRACKING_STEPS.length -
                                      1 && (
                                    <i
                                      className={
                                        index <
                                        stepIndex
                                          ? "complete"
                                          : ""
                                      }
                                    />
                                  )}
                                </div>

                                <div>
                                  <strong>
                                    {step}
                                  </strong>

                                  {current && (
                                    <small>
                                      Current
                                    </small>
                                  )}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </section>
                  ) : (
                    <section className="cancelled-order-panel">
                      <span>×</span>

                      <div>
                        <p>ORDER CANCELLED</p>
                        <h2>
                          This order was cancelled.
                        </h2>
                        <small>
                          Stock has been restored for the cancelled items.
                        </small>
                      </div>
                    </section>
                  )}

                  <section className="premium-order-products">
                    {items.map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          className="premium-order-product"
                          key={`${item.productId || item.id || index}-${item.size || "size"}-${index}`}
                        >
                          <div className="premium-order-image">
                            <img
                              src={resolveOrderImage(
                                item
                              )}
                              alt={
                                item.name
                              }
                              onError={(
                                event
                              ) => {
                                event.currentTarget.src =
                                  fallbackImage(
                                    item
                                  );
                              }}
                            />
                          </div>

                          <div className="premium-order-product-info">
                            <span>
                              {item.category ||
                                "LUMÉ"}
                            </span>

                            <h3>
                              {item.name}
                            </h3>

                            <p>
                              SIZE{" "}
                              <strong>
                                {item.size ||
                                  "—"}
                              </strong>
                              <i>·</i>
                              QTY{" "}
                              <strong>
                                {Number(
                                  item.quantity ||
                                    1
                                )}
                              </strong>
                            </p>
                          </div>

                          <strong className="premium-order-line-price">
                            ₹
                            {Number(
                              item.itemTotal ||
                                Number(
                                  item.price ||
                                    0
                                ) *
                                  Number(
                                    item.quantity ||
                                      1
                                  )
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </strong>
                        </div>
                      )
                    )}
                  </section>

                  <button
                    type="button"
                    className="order-details-toggle"
                    onClick={() =>
                      setExpandedOrderId(
                        expanded
                          ? ""
                          : order.id
                      )
                    }
                  >
                    <span>
                      {expanded
                        ? "HIDE ORDER DETAILS"
                        : "VIEW ORDER DETAILS"}
                    </span>

                    <b>
                      {expanded
                        ? "−"
                        : "+"}
                    </b>
                  </button>

                  {expanded && (
                    <section className="premium-order-details">
                      <div>
                        <span>
                          PAYMENT
                        </span>
                        <strong>
                          {getPaymentName(
                            order
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          PAYMENT STATUS
                        </span>
                        <strong
                          className={
                            String(
                              paymentStatus
                            ).toLowerCase() ===
                            "paid"
                              ? "paid"
                              : ""
                          }
                        >
                          {paymentStatus}
                        </strong>
                      </div>

                      {order.transactionId && (
                        <div>
                          <span>
                            TRANSACTION
                          </span>
                          <strong>
                            {order.transactionId}
                          </strong>
                        </div>
                      )}

                      {address && (
                        <div className="order-address-detail">
                          <span>
                            DELIVERY ADDRESS
                          </span>
                          <strong>
                            {address}
                          </strong>
                        </div>
                      )}
                    </section>
                  )}

                  <footer className="premium-order-footer">
                    <div>
                      <span>
                        {cancelled
                          ? "Cancelled"
                          : delivered
                            ? "Order completed"
                            : `Current status: ${status}`}
                      </span>

                      {!cancelled &&
                        !delivered && (
                        <small>
                          This page updates automatically when your order status changes.
                        </small>
                      )}
                    </div>

                    {canCancel(status) && (
                      <button
                        type="button"
                        className="premium-cancel-button"
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
                          ? "CANCELLING…"
                          : "CANCEL ORDER"}
                      </button>
                    )}
                  </footer>
                </article>
              );
            }
          )
        )}
      </section>
    </main>
  );
}

export default MyOrders;
