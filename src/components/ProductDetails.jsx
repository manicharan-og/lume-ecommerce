import { useState } from "react";

function ProductDetails({
  product,
  onBack,
  onAddToCart,
  onBuyNow,
  onGoToBag,
}) {
  const [
    selectedSize,
    setSelectedSize,
  ] = useState(null);

  const [
    quantity,
    setQuantity,
  ] = useState(1);

  const [
    addedToCart,
    setAddedToCart,
  ] = useState(false);

  const availableStock =
    Number(
      product?.stock ?? 0
    );

  const isOutOfStock =
    availableStock <= 0;

  const isLowStock =
    availableStock > 0 &&
    availableStock <= 5;

  // =========================
  // SELECT SIZE
  // =========================

  function handleSizeSelect(
    size
  ) {
    if (
      isOutOfStock
    ) {
      return;
    }

    setSelectedSize(
      size
    );

    setQuantity(1);

    setAddedToCart(
      false
    );
  }

  // =========================
  // DECREASE QUANTITY
  // =========================

  function decreaseQuantity() {
    if (
      !selectedSize ||
      addedToCart ||
      isOutOfStock
    ) {
      return;
    }

    setQuantity(
      (current) =>
        Math.max(
          1,
          current - 1
        )
    );
  }

  // =========================
  // INCREASE QUANTITY
  // =========================

  function increaseQuantity() {
    if (
      !selectedSize ||
      addedToCart ||
      isOutOfStock
    ) {
      return;
    }

    if (
      quantity >=
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

    setQuantity(
      (current) =>
        Math.min(
          current + 1,
          availableStock
        )
    );
  }

  // =========================
  // ADD TO CART
  // =========================

  function handleAddToCart() {
    if (
      isOutOfStock
    ) {
      alert(
        `${product.name} is currently out of stock.`
      );

      return;
    }

    if (
      !selectedSize
    ) {
      alert(
        "Please select a size first."
      );

      return;
    }

    if (
      quantity >
      availableStock
    ) {
      alert(
        `Only ${availableStock} ${
          availableStock === 1
            ? "item is"
            : "items are"
        } available.`
      );

      return;
    }

    const added =
      onAddToCart(
        product,
        quantity,
        selectedSize
      );

    if (
      added === true
    ) {
      setAddedToCart(
        true
      );
    }
  }

  // =========================
  // GO TO BAG
  // =========================

  function handleGoToBag() {
    onGoToBag();
  }

  // =========================
  // BUY NOW
  // =========================

  function handleBuyNow() {
    if (
      isOutOfStock
    ) {
      alert(
        `${product.name} is currently out of stock.`
      );

      return;
    }

    if (
      !selectedSize
    ) {
      alert(
        "Please select a size first."
      );

      return;
    }

    if (
      quantity >
      availableStock
    ) {
      alert(
        `Only ${availableStock} ${
          availableStock === 1
            ? "item is"
            : "items are"
        } available.`
      );

      return;
    }

    onBuyNow(
      product,
      quantity,
      selectedSize
    );
  }

  return (
    <section className="product-details">

      {/* BACK BUTTON */}

      <button
        type="button"
        className="back-button"
        onClick={
          onBack
        }
      >
        ← BACK TO SHOP
      </button>

      <div className="product-details-container">

        {/* PRODUCT IMAGE */}

        <div className="product-details-image">

          <img
            src={
              product.image
            }
            alt={
              product.name
            }
          />

          {isOutOfStock && (
            <div className="details-out-of-stock-overlay">
              OUT OF STOCK
            </div>
          )}

        </div>

        {/* PRODUCT INFORMATION */}

        <div className="product-details-info">

          {/* CATEGORY */}

          <p className="product-details-category">
            {
              product.category
            }
          </p>

          {/* NAME */}

          <h1>
            {
              product.name
            }
          </h1>

          {/* RATING */}

          <div className="product-details-rating">
            ⭐{" "}
            {
              product.rating
            }
            <span>
              {" "}
              / 5
            </span>
          </div>

          {/* PRICE */}

          <div className="product-details-price">
            ₹
            {Number(
              product.price ||
                0
            ).toLocaleString(
              "en-IN"
            )}
          </div>

          {/* STOCK STATUS */}

          <div className="product-stock-status">

            {isOutOfStock ? (

              <p className="stock-out">
                OUT OF STOCK
              </p>

            ) : isLowStock ? (

              <p className="stock-low">
                Only{" "}
                {
                  availableStock
                }{" "}
                {
                  availableStock ===
                  1
                    ? "item"
                    : "items"
                }{" "}
                left
              </p>

            ) : (

              <p className="stock-available">
                IN STOCK
              </p>

            )}

            {!isOutOfStock && (
              <span>
                {
                  availableStock
                }{" "}
                available
              </span>
            )}

          </div>

          {/* DESCRIPTION */}

          <p className="product-details-description">
            {
              product.description
            }
          </p>

          {/* =========================
              SIZE
          ========================= */}

          <div className="size-section">

            <div className="size-title">

              <strong>
                Select Size
              </strong>

              {selectedSize && (
                <span>
                  Selected:{" "}
                  {
                    selectedSize
                  }
                </span>
              )}

            </div>

            <div className="size-options">

              {Array.isArray(
                product.sizes
              ) &&
                product.sizes.map(
                  (size) => (

                    <button
                      key={
                        size
                      }
                      type="button"
                      className={
                        selectedSize ===
                        size
                          ? "size-button selected"
                          : "size-button"
                      }
                      disabled={
                        isOutOfStock
                      }
                      onClick={() =>
                        handleSizeSelect(
                          size
                        )
                      }
                    >
                      {
                        size
                      }
                    </button>

                  )
                )}

            </div>

            {!selectedSize &&
              !isOutOfStock && (

              <p className="size-warning">
                Please select a size to continue
              </p>

            )}

            {isOutOfStock && (
              <p className="size-warning">
                This product is currently unavailable.
              </p>
            )}

          </div>

          {/* =========================
              QUANTITY
          ========================= */}

          <div className="quantity-section">

            <strong>
              Quantity
            </strong>

            <div
              className={
                selectedSize &&
                !isOutOfStock
                  ? "details-quantity"
                  : "details-quantity disabled"
              }
            >

              <button
                type="button"
                disabled={
                  !selectedSize ||
                  addedToCart ||
                  isOutOfStock ||
                  quantity <= 1
                }
                onClick={
                  decreaseQuantity
                }
              >
                −
              </button>

              <span>
                {
                  quantity
                }
              </span>

              <button
                type="button"
                disabled={
                  !selectedSize ||
                  addedToCart ||
                  isOutOfStock ||
                  quantity >=
                    availableStock
                }
                onClick={
                  increaseQuantity
                }
              >
                +
              </button>

            </div>

            {selectedSize &&
              !isOutOfStock &&
              quantity >=
                availableStock && (

              <p className="stock-limit-message">
                Maximum available quantity reached.
              </p>

            )}

          </div>

          {/* =========================
              BUTTONS
          ========================= */}

          <div className="product-action-buttons">

            {!addedToCart ? (

              <button
                type="button"
                className={
                  selectedSize &&
                  !isOutOfStock
                    ? "details-add-cart"
                    : "details-add-cart disabled"
                }
                disabled={
                  !selectedSize ||
                  isOutOfStock
                }
                onClick={
                  handleAddToCart
                }
              >
                {isOutOfStock
                  ? "OUT OF STOCK"
                  : "ADD TO CART"}
              </button>

            ) : (

              <button
                type="button"
                className="details-add-cart"
                onClick={
                  handleGoToBag
                }
              >
                GO TO BAG →
              </button>

            )}

            <button
              type="button"
              className={
                selectedSize &&
                !isOutOfStock
                  ? "buy-now-button"
                  : "buy-now-button disabled"
              }
              disabled={
                !selectedSize ||
                isOutOfStock
              }
              onClick={
                handleBuyNow
              }
            >
              {isOutOfStock
                ? "UNAVAILABLE"
                : "BUY NOW →"}
            </button>

          </div>

        </div>

      </div>

    </section>
  );
}

export default ProductDetails;