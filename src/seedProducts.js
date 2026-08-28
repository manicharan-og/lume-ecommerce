import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  db,
} from "./firebase";

const initialProducts = [
  {
    id: "product-1",

    name:
      "Minimal Cotton Tee",

    price:
      899,

    image:
      "/images/tshirt.jpg",

    category:
      "T-Shirts",

    rating:
      4.5,

    description:
      "A premium everyday cotton t-shirt with a relaxed fit and soft feel. Perfect for casual everyday styling.",

    sizes: [
      "S",
      "M",
      "L",
      "XL",
    ],

    stock:
      25,

    active:
      true,
  },

  {
    id: "product-2",

    name:
      "Classic Oxford Shirt",

    price:
      1499,

    image:
      "/images/shirt.jpg",

    category:
      "Shirts",

    rating:
      4.7,

    description:
      "A timeless Oxford shirt designed for a clean and effortless look. Comfortable enough for everyday wear.",

    sizes: [
      "S",
      "M",
      "L",
      "XL",
    ],

    stock:
      20,

    active:
      true,
  },

  {
    id: "product-3",

    name:
      "Relaxed Fit Trousers",

    price:
      1799,

    image:
      "/images/trousers.jpg",

    category:
      "Trousers",

    rating:
      4.6,

    description:
      "Comfortable relaxed-fit trousers made for everyday styling with a modern and effortless silhouette.",

    sizes: [
      "28",
      "30",
      "32",
      "34",
      "36",
    ],

    stock:
      18,

    active:
      true,
  },

  {
    id: "product-4",

    name:
      "Everyday Hoodie",

    price:
      1999,

    image:
      "/images/hoodie.jpg",

    category:
      "Hoodies",

    rating:
      4.8,

    description:
      "A soft everyday hoodie with a comfortable fit and minimal design. Perfect for relaxed days.",

    sizes: [
      "S",
      "M",
      "L",
      "XL",
    ],

    stock:
      15,

    active:
      true,
  },
];

// =====================================================
// SEED PRODUCTS
// =====================================================

export async function seedProducts() {
  try {
    let created =
      0;

    let existing =
      0;

    for (
      const product
      of initialProducts
    ) {
      const productReference =
        doc(
          db,
          "products",
          product.id
        );

      const productSnapshot =
        await getDoc(
          productReference
        );

      // Do not overwrite existing products
      if (
        productSnapshot.exists()
      ) {
        existing += 1;

        continue;
      }

      await setDoc(
        productReference,
        {
          ...product,

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      created += 1;
    }

    console.log(
      "Product seeding finished."
    );

    console.log(
      "Created:",
      created
    );

    console.log(
      "Already existed:",
      existing
    );

    return {
      success:
        true,

      created,

      existing,
    };
  } catch (error) {
    console.error(
      "Could not seed products:",
      error
    );

    return {
      success:
        false,

      error,
    };
  }
}