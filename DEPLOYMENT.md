# LUMÉ Firebase Deployment

Run these commands from the project root:

```bash
npm run build
npm install -g firebase-tools
firebase login
firebase use lume-clothing-store
firebase deploy
```

For a deployment that only updates Hosting and Firestore rules:

```bash
npm run build
firebase deploy --only hosting,firestore:rules
```

## Before deploying

1. Confirm `npm run build` completes without errors.
2. Confirm the Firebase project is `lume-clothing-store`.
3. Test sign-in, profile, wishlist, cart, checkout, My Orders and Admin.
4. Confirm the admin user document contains either:
   - `role: "admin"`, or
   - `isAdmin: true`
5. Keep the current product stock rule only while stock changes are handled in the browser.

## Important security note

The current storefront performs stock updates from the client during checkout and cancellation. The included rules restrict customer product updates to `stock` and `updatedAt`, but a determined signed-in user could still attempt to manipulate stock.

For a fully production-safe store, move checkout, stock reduction, cancellation stock restoration and admin order transitions to Firebase Cloud Functions / Admin SDK, then make all customer writes to `products` impossible.
