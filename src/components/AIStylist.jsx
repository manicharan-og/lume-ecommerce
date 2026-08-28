import { useState } from "react";

function AIStylist({
  products = [],
  onAddToCart,
  onViewProduct,
}) {
  const [messages, setMessages] = useState([
    {
      type: "ai",
      text:
        "Hi! I'm Lumé AI Stylist ✦ Tell me what you're dressing for, your style, or your budget.",
    },
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // =====================================================
  // FIND PRODUCT
  // =====================================================

  function findProduct(name) {
    return products.find((product) =>
      product.name
        .toLowerCase()
        .includes(name.toLowerCase())
    );
  }

  // =====================================================
  // BUDGET DETECTION
  // =====================================================

  function getBudget(text) {
    const cleanedText = text
      .toLowerCase()
      .replace(/,/g, "");

    const currencyMatch = cleanedText.match(
      /(?:₹|rs\.?|inr)\s*(\d+)/
    );

    if (currencyMatch) {
      return Number(currencyMatch[1]);
    }

    const naturalBudgetMatch = cleanedText.match(
      /(?:under|below|within|less than|budget(?: is| of)?|for)\s*₹?\s*(\d+)/
    );

    if (naturalBudgetMatch) {
      return Number(naturalBudgetMatch[1]);
    }

    return null;
  }

  // =====================================================
  // PRODUCT CARD
  // =====================================================

  function ProductRecommendation({ product }) {
    const [selectedSize, setSelectedSize] = useState("");
    const [added, setAdded] = useState(false);

    function handleAddToBag() {
      if (!selectedSize) {
        alert("Please select a size first.");
        return;
      }

      if (!onAddToCart) {
        return;
      }

      const result = onAddToCart(
        product,
        1,
        selectedSize
      );

      if (result !== false) {
        setAdded(true);
      }
    }

    function handleViewProduct() {
      if (onViewProduct) {
        onViewProduct(product);
      }
    }

    return (
      <div className="ai-product-card">

        <img
          src={product.image}
          alt={product.name}
        />

        <div className="ai-product-info">

          <p className="ai-product-category">
            {product.category}
          </p>

          <h4>
            {product.name}
          </h4>

          <strong className="ai-product-price">
            ₹
            {product.price.toLocaleString(
              "en-IN"
            )}
          </strong>

          <div className="ai-size-selector">

            <span>
              Select size
            </span>

            <div className="ai-size-options">

              {product.sizes?.map((size) => (

                <button
                  type="button"
                  key={size}
                  className={
                    selectedSize === size
                      ? "ai-size-button selected"
                      : "ai-size-button"
                  }
                  onClick={() => {
                    setSelectedSize(size);
                    setAdded(false);
                  }}
                >
                  {size}
                </button>

              ))}

            </div>

          </div>

          <div className="ai-product-actions">

            <button
              type="button"
              onClick={handleViewProduct}
            >
              VIEW PRODUCT
            </button>

            <button
              type="button"
              onClick={handleAddToBag}
              disabled={added}
            >
              {added
                ? "ADDED ✓"
                : "ADD TO BAG"}
            </button>

          </div>

        </div>

      </div>
    );
  }

  // =====================================================
  // GENERATE RECOMMENDATION
  // =====================================================

  function generateRecommendation(text) {
    const lowerText = text.toLowerCase();
    const budget = getBudget(text);

    // ===================================================
    // BUDGET
    // ===================================================

    if (budget) {
      let suitableProducts = products.filter(
        (product) =>
          product.price <= budget
      );

      if (
        lowerText.includes("casual") ||
        lowerText.includes("daily") ||
        lowerText.includes("everyday") ||
        lowerText.includes("college")
      ) {
        suitableProducts =
          suitableProducts.filter(
            (product) =>
              product.category === "T-Shirts" ||
              product.category === "Trousers" ||
              product.category === "Hoodies"
          );
      }

      if (
        lowerText.includes("shirt") &&
        !lowerText.includes("t-shirt") &&
        !lowerText.includes("tshirt")
      ) {
        suitableProducts =
          suitableProducts.filter(
            (product) =>
              product.category === "Shirts"
          );
      }

      if (
        lowerText.includes("t-shirt") ||
        lowerText.includes("tshirt") ||
        lowerText.includes("tee")
      ) {
        suitableProducts =
          suitableProducts.filter(
            (product) =>
              product.category === "T-Shirts"
          );
      }

      if (lowerText.includes("hoodie")) {
        suitableProducts =
          suitableProducts.filter(
            (product) =>
              product.category === "Hoodies"
          );
      }

      if (
        lowerText.includes("trouser") ||
        lowerText.includes("pants")
      ) {
        suitableProducts =
          suitableProducts.filter(
            (product) =>
              product.category === "Trousers"
          );
      }

      suitableProducts.sort(
        (a, b) =>
          a.price - b.price
      );

      if (suitableProducts.length > 0) {
        return {
          text:
            "I found " +
            suitableProducts.length +
            " product" +
            (
              suitableProducts.length === 1
                ? ""
                : "s"
            ) +
            " within your ₹" +
            budget.toLocaleString("en-IN") +
            " budget. Here are my best options. ✦",

          products:
            suitableProducts.slice(
              0,
              4
            ),
        };
      }

      const cheapestProduct =
        [...products].sort(
          (a, b) =>
            a.price - b.price
        )[0];

      return {
        text:
          "I couldn't find anything within ₹" +
          budget.toLocaleString("en-IN") +
          "." +
          (
            cheapestProduct
              ? " Our lowest-priced product is the " +
                cheapestProduct.name +
                " at ₹" +
                cheapestProduct.price.toLocaleString(
                  "en-IN"
                ) +
                "."
              : ""
          ),

        products:
          cheapestProduct
            ? [cheapestProduct]
            : [],
      };
    }

    // ===================================================
    // T-SHIRT
    // ===================================================

    if (
      lowerText.includes("tee") ||
      lowerText.includes("t-shirt") ||
      lowerText.includes("tshirt")
    ) {
      const tee =
        findProduct(
          "Minimal Cotton Tee"
        );

      if (tee) {
        return {
          text:
            "The " +
            tee.name +
            " would be a great choice for an easy everyday look. " +
            "It's ₹" +
            tee.price.toLocaleString("en-IN") +
            " and comes in sizes " +
            tee.sizes.join(", ") +
            ". 👕",

          products: [tee],
        };
      }
    }

    // ===================================================
    // SHIRT
    // ===================================================

    if (
      lowerText.includes("shirt") &&
      !lowerText.includes("t-shirt") &&
      !lowerText.includes("tshirt")
    ) {
      const shirt =
        findProduct(
          "Classic Oxford Shirt"
        );

      if (shirt) {
        return {
          text:
            "The " +
            shirt.name +
            " is perfect for a clean smart-casual look. " +
            "It's ₹" +
            shirt.price.toLocaleString("en-IN") +
            ". 👔",

          products: [shirt],
        };
      }
    }

    // ===================================================
    // HOODIE
    // ===================================================

    if (lowerText.includes("hoodie")) {
      const hoodie =
        findProduct(
          "Everyday Hoodie"
        );

      if (hoodie) {
        return {
          text:
            "The " +
            hoodie.name +
            " is a great relaxed option. " +
            "It's ₹" +
            hoodie.price.toLocaleString("en-IN") +
            " and works well for casual and colder days. 🧥",

          products: [hoodie],
        };
      }
    }

    // ===================================================
    // TROUSERS
    // ===================================================

    if (
      lowerText.includes("trouser") ||
      lowerText.includes("pants")
    ) {
      const trousers =
        findProduct(
          "Relaxed Fit Trousers"
        );

      if (trousers) {
        return {
          text:
            "The " +
            trousers.name +
            " gives you a modern relaxed silhouette. " +
            "It's ₹" +
            trousers.price.toLocaleString("en-IN") +
            ". 👖",

          products: [trousers],
        };
      }
    }

    // ===================================================
    // DINNER / DATE / PARTY
    // ===================================================

    if (
      lowerText.includes("dinner") ||
      lowerText.includes("date") ||
      lowerText.includes("party")
    ) {
      const shirt =
        findProduct(
          "Classic Oxford Shirt"
        );

      const trousers =
        findProduct(
          "Relaxed Fit Trousers"
        );

      const outfit = [];

      if (shirt) {
        outfit.push(shirt);
      }

      if (trousers) {
        outfit.push(trousers);
      }

      const total =
        outfit.reduce(
          (sum, product) =>
            sum + product.price,
          0
        );

      let occasion = "dinner";

      if (lowerText.includes("date")) {
        occasion = "date";
      }

      if (lowerText.includes("party")) {
        occasion = "party";
      }

      return {
        text:
          "For a " +
          occasion +
          ", I'd go with a clean smart-casual outfit. " +
          "The recommended pieces total ₹" +
          total.toLocaleString("en-IN") +
          ". ✨",

        products: outfit,
      };
    }

    // ===================================================
    // CASUAL
    // ===================================================

    if (
      lowerText.includes("casual") ||
      lowerText.includes("college") ||
      lowerText.includes("daily") ||
      lowerText.includes("everyday")
    ) {
      const tee =
        findProduct(
          "Minimal Cotton Tee"
        );

      const trousers =
        findProduct(
          "Relaxed Fit Trousers"
        );

      const outfit = [];

      if (tee) {
        outfit.push(tee);
      }

      if (trousers) {
        outfit.push(trousers);
      }

      const total =
        outfit.reduce(
          (sum, product) =>
            sum + product.price,
          0
        );

      return {
        text:
          "For a casual everyday look, I'd recommend the Minimal Cotton Tee with Relaxed Fit Trousers. " +
          "The complete outfit is ₹" +
          total.toLocaleString("en-IN") +
          ". Comfortable, simple and easy to style. 👕",

        products: outfit,
      };
    }

    // ===================================================
    // WINTER
    // ===================================================

    if (
      lowerText.includes("winter") ||
      lowerText.includes("cold")
    ) {
      const hoodie =
        findProduct(
          "Everyday Hoodie"
        );

      const trousers =
        findProduct(
          "Relaxed Fit Trousers"
        );

      const outfit = [];

      if (hoodie) {
        outfit.push(hoodie);
      }

      if (trousers) {
        outfit.push(trousers);
      }

      return {
        text:
          "For colder weather, I'd recommend the Everyday Hoodie with Relaxed Fit Trousers for a comfortable streetwear look. 🧥",

        products: outfit,
      };
    }

    // ===================================================
    // FORMAL
    // ===================================================

    if (
      lowerText.includes("formal") ||
      lowerText.includes("smart") ||
      lowerText.includes("office") ||
      lowerText.includes("meeting")
    ) {
      const shirt =
        findProduct(
          "Classic Oxford Shirt"
        );

      const trousers =
        findProduct(
          "Relaxed Fit Trousers"
        );

      const outfit = [];

      if (shirt) {
        outfit.push(shirt);
      }

      if (trousers) {
        outfit.push(trousers);
      }

      return {
        text:
          "For a smarter look, I'd recommend the Classic Oxford Shirt with Relaxed Fit Trousers. Keep the colours minimal and finish with clean shoes. 👔",

        products: outfit,
      };
    }

    // ===================================================
    // CHEAP / AFFORDABLE
    // ===================================================

    if (
      lowerText.includes("cheap") ||
      lowerText.includes("affordable") ||
      lowerText.includes("lowest price") ||
      lowerText.includes("cheapest")
    ) {
      const sortedProducts =
        [...products].sort(
          (a, b) =>
            a.price - b.price
        );

      return {
        text:
          "Here are the most affordable options currently available in the Lumé collection. ✦",

        products:
          sortedProducts.slice(
            0,
            2
          ),
      };
    }

    // ===================================================
    // DEFAULT
    // ===================================================

    const tee =
      findProduct(
        "Minimal Cotton Tee"
      );

    const shirt =
      findProduct(
        "Classic Oxford Shirt"
      );

    return {
      text:
        "Tell me what you're dressing for, such as dinner, college, party, winter, office, or your budget. For now, here are two versatile Lumé pieces. ✦",

      products:
        [tee, shirt].filter(Boolean),
    };
  }

  // =====================================================
  // SHOW RESULT
  // Used by normal input and quick buttons
  // =====================================================

  function showRecommendation(message) {
    if (!message || isTyping) {
      return;
    }

    setMessages([
      {
        type: "user",
        text: message,
      },
    ]);

    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const recommendation =
        generateRecommendation(
          message
        );

      setMessages([
        {
          type: "user",
          text: message,
        },
        {
          type: "ai",
          text:
            recommendation.text,
          products:
            recommendation.products ||
            [],
        },
      ]);

      setIsTyping(false);
    }, 500);
  }

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  function sendMessage() {
    const message =
      input.trim();

    if (!message) {
      return;
    }

    showRecommendation(
      message
    );
  }

  // =====================================================
  // ENTER
  // =====================================================

  function handleKeyDown(event) {
    if (
      event.key === "Enter"
    ) {
      event.preventDefault();

      sendMessage();
    }
  }

  // =====================================================
  // QUICK PROMPT
  // Runs immediately
  // =====================================================

  function useQuickPrompt(text) {
    showRecommendation(
      text
    );
  }

  // =====================================================
  // CLEAR
  // =====================================================

  function clearStylist() {
    setMessages([
      {
        type: "ai",
        text:
          "Hi! I'm Lumé AI Stylist ✦ Tell me what you're dressing for, your style, or your budget.",
      },
    ]);

    setInput("");
    setIsTyping(false);
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="ai-stylist-box">

      {/* HEADER */}

      <div className="ai-stylist-header">

        <div>

          <span>
            ✦
          </span>

          <strong>
            Lumé AI Stylist
          </strong>

        </div>

        <div className="ai-header-actions">

          <small>
            ● Online
          </small>

          <button
            type="button"
            onClick={
              clearStylist
            }
            className="ai-clear-button"
          >
            CLEAR
          </button>

        </div>

      </div>

      {/* QUICK QUESTIONS */}

      <div className="ai-quick-prompts">

        <button
          type="button"
          onClick={() =>
            useQuickPrompt(
              "I need something for dinner"
            )
          }
          disabled={isTyping}
        >
          Dinner
        </button>

        <button
          type="button"
          onClick={() =>
            useQuickPrompt(
              "I want a casual outfit"
            )
          }
          disabled={isTyping}
        >
          Casual
        </button>

        <button
          type="button"
          onClick={() =>
            useQuickPrompt(
              "Show me products under ₹2000"
            )
          }
          disabled={isTyping}
        >
          Under ₹2000
        </button>

        <button
          type="button"
          onClick={() =>
            useQuickPrompt(
              "I need an outfit for winter"
            )
          }
          disabled={isTyping}
        >
          Winter
        </button>

      </div>

      {/* RESULTS */}

      <div className="ai-messages">

        {messages.map(
          (message, index) => (

            <div
              key={index}
              className={
                "ai-message " +
                message.type
              }
            >

              <div className="ai-message-text">
                {message.text}
              </div>

              {message.products &&
                message.products.length >
                  0 && (

                  <div className="ai-products">

                    {message.products.map(
                      (product) => (

                        <ProductRecommendation
                          key={
                            product.id
                          }
                          product={
                            product
                          }
                        />

                      )
                    )}

                  </div>

                )}

            </div>

          )
        )}

        {isTyping && (
          <div className="ai-message ai typing">
            Lumé is styling you...
          </div>
        )}

      </div>

      {/* INPUT */}

      <div className="ai-input-area">

        <input
          type="text"
          value={input}
          placeholder="Ask Lumé about an outfit..."
          onChange={(event) =>
            setInput(
              event.target.value
            )
          }
          onKeyDown={
            handleKeyDown
          }
          disabled={isTyping}
        />

        <button
          type="button"
          onClick={sendMessage}
          disabled={
            isTyping ||
            !input.trim()
          }
          aria-label="Send message"
        >
          →
        </button>

      </div>

    </div>
  );
}

export default AIStylist;