import { useEffect, useMemo, useState } from "react";

function getFallbackProductImage(product = {}) {
  const value = `${product.name || ""} ${product.category || ""}`.toLowerCase();

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

  if (value.includes("shirt")) {
    return "/images/shirt.jpg";
  }

  return "/images/tshirt.jpg";
}

function resolveProductImage(product = {}) {
  const raw = String(
    product.image ||
      product.imageUrl ||
      ""
  ).trim();

  if (!raw) {
    return getFallbackProductImage(product);
  }

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

function ProductDetails({
  product,
  onBack,
  onAddToCart,
  onBuyNow,
  onGoToBag,
  relatedProducts = [],
  onOpenProduct,
}) {
  const sizes = useMemo(
    () =>
      Array.isArray(product?.sizes)
        ? product.sizes
        : [],
    [product]
  );

  const stock = Number(
    product?.stock || 0
  );

  const [selectedSize, setSelectedSize] =
    useState("");

  const [quantity, setQuantity] =
    useState(1);

  const [activeInfo, setActiveInfo] =
    useState("details");

  const [added, setAdded] =
    useState(false);

  useEffect(() => {
    setSelectedSize(
      sizes.length === 1
        ? String(sizes[0])
        : ""
    );

    setQuantity(1);
    setAdded(false);
    setActiveInfo("details");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [product?.id, sizes]);

  function requireSize() {
    if (
      sizes.length > 0 &&
      !selectedSize
    ) {
      alert("Please select a size first.");
      return false;
    }

    return true;
  }

  function handleAddToBag() {
    if (
      stock <= 0 ||
      !requireSize()
    ) {
      return;
    }

    const success =
      onAddToCart?.(
        product,
        quantity,
        selectedSize ||
          null
      );

    if (success !== false) {
      setAdded(true);

      window.setTimeout(
        () => setAdded(false),
        1600
      );
    }
  }

  function handleBuyNow() {
    if (
      stock <= 0 ||
      !requireSize()
    ) {
      return;
    }

    onBuyNow?.(
      product,
      quantity,
      selectedSize ||
        null
    );
  }

  const originalPrice = Number(
    product?.originalPrice ||
      product?.compareAtPrice ||
      0
  );

  const price = Number(
    product?.price || 0
  );

  const discount =
    originalPrice > price
      ? Math.round(
          ((originalPrice -
            price) /
            originalPrice) *
            100
        )
      : 0;

  return (
    <main className="lume-pdp">
      <div className="pdp-breadcrumb">
        <button
          type="button"
          onClick={onBack}
        >
          ← BACK TO SHOP
        </button>

        <span>
          {product?.category ||
            "COLLECTION"}
        </span>
      </div>

      <section className="pdp-main">
        <div className="pdp-media">
          <div className="pdp-image-frame">
            <img
              src={resolveProductImage(
                product
              )}
              alt={product?.name}
              onError={(event) => {
                event.currentTarget.src =
                  getFallbackProductImage(
                    product
                  );
              }}
            />

            <span
              className={`pdp-stock-badge ${
                stock <= 0
                  ? "sold-out"
                  : ""
              }`}
            >
              {stock <= 0
                ? "SOLD OUT"
                : `${stock} IN STOCK`}
            </span>
          </div>

          <div className="pdp-media-note">
            <span>
              LUMÉ ESSENTIALS
            </span>
            <span>
              DESIGNED FOR EVERYDAY
            </span>
          </div>
        </div>

        <div className="pdp-info">
          <div className="pdp-heading">
            <p>
              {product?.category ||
                "LUMÉ"}
            </p>

            <h1>
              {product?.name}
            </h1>

            <div className="pdp-meta">
              <span>
                ★{" "}
                {Number(
                  product?.rating ||
                    0
                ).toFixed(1)}
              </span>

              <span>
                {stock > 0
                  ? "READY TO SHIP"
                  : "CURRENTLY UNAVAILABLE"}
              </span>
            </div>
          </div>

          <div className="pdp-price">
            <strong>
              ₹
              {price.toLocaleString(
                "en-IN"
              )}
            </strong>

            {originalPrice >
              price && (
              <>
                <del>
                  ₹
                  {originalPrice.toLocaleString(
                    "en-IN"
                  )}
                </del>

                <span>
                  {discount}% OFF
                </span>
              </>
            )}
          </div>

          <p className="pdp-description">
            {product?.description ||
              "A refined LUMÉ essential designed for effortless everyday styling."}
          </p>

          {sizes.length > 0 && (
            <div className="pdp-size-section">
              <div className="pdp-section-head">
                <span>
                  SELECT SIZE
                </span>

                {selectedSize && (
                  <strong>
                    {selectedSize}
                  </strong>
                )}
              </div>

              <div className="pdp-sizes">
                {sizes.map(
                  (size) => {
                    const value =
                      String(size);

                    return (
                      <button
                        type="button"
                        key={value}
                        className={
                          selectedSize ===
                          value
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setSelectedSize(
                            value
                          )
                        }
                      >
                        {value}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                type="button"
                className="pdp-size-guide"
                onClick={() =>
                  alert(
                    "Size guide: choose your usual size for a regular fit. For an oversized look, go one size up."
                  )
                }
              >
                SIZE GUIDE →
              </button>
            </div>
          )}

          <div className="pdp-quantity-section">
            <span>
              QUANTITY
            </span>

            <div className="pdp-quantity">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() =>
                  setQuantity(
                    (current) =>
                      Math.max(
                        1,
                        current - 1
                      )
                  )
                }
              >
                −
              </button>

              <strong>
                {quantity}
              </strong>

              <button
                type="button"
                aria-label="Increase quantity"
                disabled={
                  stock <= 0 ||
                  quantity >= stock
                }
                onClick={() =>
                  setQuantity(
                    (current) =>
                      Math.min(
                        stock,
                        current + 1
                      )
                  )
                }
              >
                +
              </button>
            </div>
          </div>

          <div className="pdp-actions">
            <button
              type="button"
              className="pdp-add"
              disabled={stock <= 0}
              onClick={handleAddToBag}
            >
              {stock <= 0
                ? "SOLD OUT"
                : added
                  ? "ADDED ✓"
                  : "ADD TO BAG"}
            </button>

            <button
              type="button"
              className="pdp-buy"
              disabled={stock <= 0}
              onClick={handleBuyNow}
            >
              BUY NOW
            </button>

            <button
              type="button"
              className="pdp-view-bag"
              onClick={onGoToBag}
            >
              VIEW BAG →
            </button>
          </div>

          <div className="pdp-benefits">
            <div>
              <span>◇</span>
              <div>
                <strong>
                  FREE DELIVERY
                </strong>
                <p>
                  Standard delivery on
                  all LUMÉ orders.
                </p>
              </div>
            </div>

            <div>
              <span>↺</span>
              <div>
                <strong>
                  EASY RETURNS
                </strong>
                <p>
                  Simple return process
                  for eligible items.
                </p>
              </div>
            </div>

            <div>
              <span>✓</span>
              <div>
                <strong>
                  SECURE CHECKOUT
                </strong>
                <p>
                  Order and stock are
                  verified at checkout.
                </p>
              </div>
            </div>
          </div>

          <div className="pdp-accordions">
            <button
              type="button"
              className={
                activeInfo ===
                "details"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveInfo(
                  activeInfo ===
                    "details"
                    ? ""
                    : "details"
                )
              }
            >
              <span>
                PRODUCT DETAILS
              </span>
              <b>
                {activeInfo ===
                "details"
                  ? "−"
                  : "+"}
              </b>
            </button>

            {activeInfo ===
              "details" && (
              <div className="pdp-accordion-content">
                <p>
                  {product?.description}
                </p>
                <ul>
                  <li>
                    Premium everyday
                    construction
                  </li>
                  <li>
                    Minimal LUMÉ styling
                  </li>
                  <li>
                    Designed for comfort
                    and repeat wear
                  </li>
                </ul>
              </div>
            )}

            <button
              type="button"
              className={
                activeInfo ===
                "delivery"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveInfo(
                  activeInfo ===
                    "delivery"
                    ? ""
                    : "delivery"
                )
              }
            >
              <span>
                DELIVERY & RETURNS
              </span>
              <b>
                {activeInfo ===
                "delivery"
                  ? "−"
                  : "+"}
              </b>
            </button>

            {activeInfo ===
              "delivery" && (
              <div className="pdp-accordion-content">
                <p>
                  Free standard delivery.
                  Delivery timing depends
                  on your destination.
                </p>
                <p>
                  Returns are subject to
                  the store return policy
                  and item condition.
                </p>
              </div>
            )}

            <button
              type="button"
              className={
                activeInfo ===
                "care"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveInfo(
                  activeInfo ===
                    "care"
                    ? ""
                    : "care"
                )
              }
            >
              <span>
                CARE
              </span>
              <b>
                {activeInfo ===
                "care"
                  ? "−"
                  : "+"}
              </b>
            </button>

            {activeInfo ===
              "care" && (
              <div className="pdp-accordion-content">
                <p>
                  Follow the garment care
                  label. Wash similar
                  colours together and
                  avoid excessive heat.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {relatedProducts.length >
        0 && (
        <section className="pdp-related">
          <div className="pdp-related-head">
            <div>
              <p>
                COMPLETE THE LOOK
              </p>
              <h2>
                You may also like
              </h2>
            </div>

            <button
              type="button"
              onClick={onBack}
            >
              VIEW SHOP →
            </button>
          </div>

          <div className="pdp-related-grid">
            {relatedProducts.map(
              (item) => (
                <button
                  type="button"
                  className="pdp-related-card"
                  key={item.id}
                  onClick={() =>
                    onOpenProduct?.(
                      item
                    )
                  }
                >
                  <div>
                    <img
                      src={resolveProductImage(
                        item
                      )}
                      alt={item.name}
                      onError={(
                        event
                      ) => {
                        event.currentTarget.src =
                          getFallbackProductImage(
                            item
                          );
                      }}
                    />
                  </div>

                  <span>
                    {item.category}
                  </span>

                  <strong>
                    {item.name}
                  </strong>

                  <em>
                    ₹
                    {Number(
                      item.price ||
                        0
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </em>
                </button>
              )
            )}
          </div>
        </section>
      )}
    </main>
  );
}

export default ProductDetails;
