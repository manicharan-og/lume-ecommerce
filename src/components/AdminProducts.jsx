import {
  useEffect,
  useState,
} from "react";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase";

function AdminProducts({
  onBack,
}) {
  const [
    products,
    setProducts,
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
    saving,
    setSaving,
  ] = useState(false);

  const [
    editingId,
    setEditingId,
  ] = useState(null);

  const [
    form,
    setForm,
  ] = useState({
    name: "",
    price: "",
    image: "",
    category: "T-Shirts",
    rating: "4.5",
    description: "",
    sizes: "S,M,L,XL",
    stock: "",
    active: true,
  });

  // =====================================================
  // LOAD PRODUCTS REAL TIME
  // =====================================================

  useEffect(() => {
    const unsubscribe =
      onSnapshot(
        collection(
          db,
          "products"
        ),

        (snapshot) => {
          const loaded =
            snapshot.docs.map(
              (document) => ({
                documentId:
                  document.id,

                ...document.data(),
              })
            );

          loaded.sort(
            (a, b) =>
              String(
                a.name || ""
              ).localeCompare(
                String(
                  b.name || ""
                )
              )
          );

          setProducts(
            loaded
          );

          setLoading(
            false
          );
        },

        (firebaseError) => {
          console.error(
            "Could not load admin products:",
            firebaseError
          );

          setError(
            "Could not load products."
          );

          setLoading(
            false
          );
        }
      );

    return unsubscribe;
  }, []);

  // =====================================================
  // FORM CHANGE
  // =====================================================

  function handleChange(
    event
  ) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm(
      (current) => ({
        ...current,

        [name]:
          type ===
          "checkbox"
            ? checked
            : value,
      })
    );
  }

  // =====================================================
  // RESET FORM
  // =====================================================

  function resetForm() {
    setEditingId(
      null
    );

    setForm({
      name: "",
      price: "",
      image: "",
      category:
        "T-Shirts",
      rating:
        "4.5",
      description: "",
      sizes:
        "S,M,L,XL",
      stock: "",
      active: true,
    });
  }

  // =====================================================
  // CREATE / UPDATE PRODUCT
  // =====================================================

  async function saveProduct(
    event
  ) {
    event.preventDefault();

    if (
      !auth.currentUser
    ) {
      alert(
        "Please sign in as admin."
      );

      return;
    }

    if (
      !form.name.trim() ||
      !form.price ||
      !form.image.trim() ||
      !form.category.trim()
    ) {
      alert(
        "Please fill all required fields."
      );

      return;
    }

    const price =
      Number(
        form.price
      );

    const rating =
      Number(
        form.rating
      );

    const stock =
      Number(
        form.stock
      );

    if (
      Number.isNaN(
        price
      ) ||
      price <= 0
    ) {
      alert(
        "Enter a valid price."
      );

      return;
    }

    if (
      Number.isNaN(
        stock
      ) ||
      stock < 0
    ) {
      alert(
        "Enter valid stock."
      );

      return;
    }

    const sizes =
      form.sizes
        .split(",")
        .map(
          (size) =>
            size.trim()
        )
        .filter(Boolean);

    try {
      setSaving(
        true
      );

      // EDIT EXISTING PRODUCT
      if (
        editingId
      ) {
        await updateDoc(
          doc(
            db,
            "products",
            editingId
          ),
          {
            name:
              form.name.trim(),

            price,

            image:
              form.image.trim(),

            category:
              form.category.trim(),

            rating,

            description:
              form.description.trim(),

            sizes,

            stock,

            active:
              form.active,

            updatedAt:
              serverTimestamp(),
          }
        );

        alert(
          "Product updated successfully."
        );
      }

      // CREATE NEW PRODUCT
      else {
        const newDocument =
          doc(
            collection(
              db,
              "products"
            )
          );

        await setDoc(
          newDocument,
          {
            id:
              newDocument.id,

            name:
              form.name.trim(),

            price,

            image:
              form.image.trim(),

            category:
              form.category.trim(),

            rating,

            description:
              form.description.trim(),

            sizes,

            stock,

            active:
              form.active,

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          }
        );

        alert(
          "Product added successfully."
        );
      }

      resetForm();
    } catch (
      firebaseError
    ) {
      console.error(
        "Could not save product:",
        firebaseError
      );

      alert(
        "Could not save product."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  // =====================================================
  // EDIT PRODUCT
  // =====================================================

  function editProduct(
    product
  ) {
    setEditingId(
      product.documentId
    );

    setForm({
      name:
        product.name ||
        "",

      price:
        String(
          product.price ??
            ""
        ),

      image:
        product.image ||
        "",

      category:
        product.category ||
        "T-Shirts",

      rating:
        String(
          product.rating ??
            4.5
        ),

      description:
        product.description ||
        "",

      sizes:
        Array.isArray(
          product.sizes
        )
          ? product.sizes.join(
              ","
            )
          : "",

      stock:
        String(
          product.stock ??
            0
        ),

      active:
        product.active !==
        false,
    });

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }

  // =====================================================
  // ACTIVE / INACTIVE
  // =====================================================

  async function toggleProduct(
    product
  ) {
    try {
      await updateDoc(
        doc(
          db,
          "products",
          product.documentId
        ),
        {
          active:
            product.active ===
            false,

          updatedAt:
            serverTimestamp(),
        }
      );
    } catch (
      firebaseError
    ) {
      console.error(
        "Could not change product status:",
        firebaseError
      );

      alert(
        "Could not change product status."
      );
    }
  }

  // =====================================================
  // DELETE
  // =====================================================

  async function removeProduct(
    product
  ) {
    const confirmed =
      window.confirm(
        `Delete ${product.name}?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          "products",
          product.documentId
        )
      );

      if (
        editingId ===
        product.documentId
      ) {
        resetForm();
      }
    } catch (
      firebaseError
    ) {
      console.error(
        "Could not delete product:",
        firebaseError
      );

      alert(
        "Could not delete product."
      );
    }
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="admin-products-page">

      <div className="admin-products-header">

        <button
          type="button"
          onClick={
            onBack
          }
        >
          ← BACK
        </button>

        <div>
          <p>
            ADMIN
          </p>

          <h1>
            Product Management
          </h1>
        </div>

      </div>

      <div className="admin-products-layout">

        {/* =================================================
            PRODUCT FORM
        ================================================= */}

        <form
          className="admin-product-form"
          onSubmit={
            saveProduct
          }
        >

          <h2>
            {editingId
              ? "Edit Product"
              : "Add Product"}
          </h2>

          <label>
            Product Name *

            <input
              type="text"
              name="name"
              value={
                form.name
              }
              onChange={
                handleChange
              }
              placeholder="Minimal Cotton Tee"
            />
          </label>

          <label>
            Price *

            <input
              type="number"
              name="price"
              value={
                form.price
              }
              onChange={
                handleChange
              }
              placeholder="899"
              min="1"
            />
          </label>

          <label>
            Image Path *

            <input
              type="text"
              name="image"
              value={
                form.image
              }
              onChange={
                handleChange
              }
              placeholder="/images/tshirt.jpg"
            />
          </label>

          <label>
            Category *

            <select
              name="category"
              value={
                form.category
              }
              onChange={
                handleChange
              }
            >
              <option>
                T-Shirts
              </option>

              <option>
                Shirts
              </option>

              <option>
                Trousers
              </option>

              <option>
                Hoodies
              </option>
            </select>
          </label>

          <label>
            Rating

            <input
              type="number"
              name="rating"
              value={
                form.rating
              }
              onChange={
                handleChange
              }
              min="0"
              max="5"
              step="0.1"
            />
          </label>

          <label>
            Stock *

            <input
              type="number"
              name="stock"
              value={
                form.stock
              }
              onChange={
                handleChange
              }
              placeholder="25"
              min="0"
            />
          </label>

          <label>
            Sizes

            <input
              type="text"
              name="sizes"
              value={
                form.sizes
              }
              onChange={
                handleChange
              }
              placeholder="S,M,L,XL"
            />
          </label>

          <label>
            Description

            <textarea
              name="description"
              value={
                form.description
              }
              onChange={
                handleChange
              }
              rows="5"
              placeholder="Product description..."
            />
          </label>

          <label className="admin-active-checkbox">

            <input
              type="checkbox"
              name="active"
              checked={
                form.active
              }
              onChange={
                handleChange
              }
            />

            Active product
          </label>

          <button
            type="submit"
            disabled={
              saving
            }
          >
            {saving
              ? "SAVING..."
              : editingId
                ? "UPDATE PRODUCT"
                : "ADD PRODUCT"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={
                resetForm
              }
            >
              CANCEL EDIT
            </button>
          )}

        </form>

        {/* =================================================
            PRODUCT LIST
        ================================================= */}

        <div className="admin-products-list">

          <div className="admin-products-list-heading">

            <h2>
              Products
            </h2>

            <span>
              {products.length}
            </span>

          </div>

          {loading && (
            <p>
              Loading products...
            </p>
          )}

          {error && (
            <p>
              {error}
            </p>
          )}

          {!loading &&
            products.length ===
              0 && (

              <p>
                No products yet.
              </p>

            )}

          {products.map(
            (product) => (

              <div
                className="admin-product-card"
                key={
                  product.documentId
                }
              >

                <img
                  src={
                    product.image
                  }
                  alt={
                    product.name
                  }
                />

                <div className="admin-product-details">

                  <p>
                    {
                      product.category
                    }
                  </p>

                  <h3>
                    {
                      product.name
                    }
                  </h3>

                  <strong>
                    ₹
                    {Number(
                      product.price ||
                        0
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </strong>

                  <small>
                    Stock:{" "}
                    {
                      product.stock ??
                      0
                    }
                  </small>

                  <small>
                    Status:{" "}
                    {product.active ===
                    false
                      ? "Inactive"
                      : "Active"}
                  </small>

                </div>

                <div className="admin-product-actions">

                  <button
                    type="button"
                    onClick={() =>
                      editProduct(
                        product
                      )
                    }
                  >
                    EDIT
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toggleProduct(
                        product
                      )
                    }
                  >
                    {product.active ===
                    false
                      ? "ACTIVATE"
                      : "DEACTIVATE"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      removeProduct(
                        product
                      )
                    }
                  >
                    DELETE
                  </button>

                </div>

              </div>

            )
          )}

        </div>

      </div>

    </div>
  );
}

export default AdminProducts;