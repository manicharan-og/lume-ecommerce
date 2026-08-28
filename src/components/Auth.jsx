import { useState } from "react";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase";

function Auth({ onClose }) {
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // ERROR MESSAGES
  // =====================================================

  function getErrorMessage(
    errorCode,
    errorMessage = ""
  ) {
    switch (errorCode) {
      case "auth/email-already-in-use":
        return "An account already exists with this email.";

      case "auth/invalid-email":
        return "Please enter a valid email address.";

      case "auth/weak-password":
        return "Password must be at least 6 characters.";

      case "auth/invalid-credential":
        return "Incorrect email or password.";

      case "auth/user-not-found":
        return "No account was found with this email.";

      case "auth/wrong-password":
        return "Incorrect password.";

      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";

      case "auth/network-request-failed":
        return "Network error. Check your internet connection.";

      case "auth/operation-not-allowed":
        return "Email/password authentication is not enabled.";

      case "auth/invalid-api-key":
        return "Firebase API key is invalid.";

      case "auth/app-not-authorized":
        return "This app is not authorized to use Firebase Authentication.";

      case "auth/missing-email":
        return "Please enter your email address.";

      case "permission-denied":
        return "Firestore permission denied. Please check your Firestore rules.";

      default:
        if (errorCode) {
          return (
            "Firebase error: " +
            errorCode +
            (errorMessage
              ? " — " + errorMessage
              : "")
          );
        }

        return "Something went wrong. Please try again.";
    }
  }

  // =====================================================
  // CREATE FIRESTORE PROFILE
  // =====================================================

  async function createUserProfile(
    firebaseUser
  ) {
    if (!firebaseUser) {
      return;
    }

    await setDoc(
      doc(
        db,
        "users",
        firebaseUser.uid
      ),
      {
        uid: firebaseUser.uid,

        email:
          firebaseUser.email || "",

        emailVerified:
          firebaseUser.emailVerified,

        cart: [],

        wishlist: [],

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      },
      {
        merge: true,
      }
    );
  }

  // =====================================================
  // UPDATE PROFILE ON LOGIN
  // =====================================================

  async function updateUserProfile(
    firebaseUser
  ) {
    if (!firebaseUser) {
      return;
    }

    await setDoc(
      doc(
        db,
        "users",
        firebaseUser.uid
      ),
      {
        uid: firebaseUser.uid,

        email:
          firebaseUser.email || "",

        emailVerified:
          firebaseUser.emailVerified,

        updatedAt:
          serverTimestamp(),
      },
      {
        merge: true,
      }
    );
  }

  // =====================================================
  // LOGIN
  // =====================================================

  async function handleLogin() {
    setError("");
    setSuccess("");

    const cleanEmail =
      email.trim();

    if (
      !cleanEmail ||
      !password
    ) {
      setError(
        "Please enter your email and password."
      );

      return;
    }

    try {
      setLoading(true);

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

      const signedInUser =
        userCredential.user;

      await updateUserProfile(
        signedInUser
      );

      console.log(
        "Signed in:",
        signedInUser
      );

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error(
        "Firebase login error:",
        error
      );

      setError(
        getErrorMessage(
          error.code,
          error.message
        )
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // CREATE ACCOUNT
  // =====================================================

  async function handleSignup() {
    setError("");
    setSuccess("");

    const cleanEmail =
      email.trim();

    if (!cleanEmail) {
      setError(
        "Please enter your email."
      );

      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );

      return;
    }

    try {
      setLoading(true);

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

      const newUser =
        userCredential.user;

      // Create Firestore profile
      await createUserProfile(
        newUser
      );

      // Send email verification
      await sendEmailVerification(
        newUser
      );

      console.log(
        "Account created:",
        newUser
      );

      console.log(
        "Firestore profile created:",
        newUser.uid
      );

      setSuccess(
        "Account created successfully. A verification email has been sent to " +
          cleanEmail +
          ". Please verify your email."
      );

      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(
        "Firebase signup error:",
        error
      );

      setError(
        getErrorMessage(
          error.code,
          error.message
        )
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // FORGOT PASSWORD
  // =====================================================

  async function handleForgotPassword() {
    setError("");
    setSuccess("");

    const cleanEmail =
      email.trim();

    if (!cleanEmail) {
      setError(
        "Enter your email address first."
      );

      return;
    }

    try {
      setLoading(true);

      await sendPasswordResetEmail(
        auth,
        cleanEmail
      );

      setSuccess(
        "Password reset email sent. Check your inbox."
      );
    } catch (error) {
      console.error(
        "Password reset error:",
        error
      );

      setError(
        getErrorMessage(
          error.code,
          error.message
        )
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // RESEND VERIFICATION
  // =====================================================

  async function handleResendVerification() {
    setError("");
    setSuccess("");

    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      setError(
        "Please sign in first before requesting another verification email."
      );

      return;
    }

    if (
      currentUser.emailVerified
    ) {
      setSuccess(
        "Your email is already verified."
      );

      return;
    }

    try {
      setLoading(true);

      await sendEmailVerification(
        currentUser
      );

      setSuccess(
        "Verification email sent again. Please check your inbox."
      );
    } catch (error) {
      console.error(
        "Verification email error:",
        error
      );

      setError(
        getErrorMessage(
          error.code,
          error.message
        )
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // SUBMIT
  // =====================================================

  function handleSubmit(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    if (isLogin) {
      handleLogin();
    } else {
      handleSignup();
    }
  }

  // =====================================================
  // SWITCH LOGIN / SIGNUP
  // =====================================================

  function switchMode() {
    setIsLogin(
      (current) => !current
    );

    setError("");
    setSuccess("");

    setPassword("");
    setConfirmPassword("");
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="auth-overlay">

      <div className="auth-modal">

        {/* CLOSE */}

        <button
          type="button"
          className="auth-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {/* BRAND */}

        <div className="auth-brand">
          LUMÉ
        </div>

        <p className="auth-small-title">
          {isLogin
            ? "WELCOME BACK"
            : "JOIN LUMÉ"}
        </p>

        <h2>
          {isLogin
            ? "Sign in to your account"
            : "Create your account"}
        </h2>

        <p className="auth-description">
          {isLogin
            ? "Access your shopping bag, wishlist and personalized Lumé experience."
            : "Create an account and start building your personal Lumé wardrobe."}
        </p>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >

          {/* EMAIL */}

          <label htmlFor="auth-email">
            Email address
          </label>

          <input
            id="auth-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            autoComplete="email"
            disabled={loading}
            required
          />

          {/* PASSWORD */}

          <label htmlFor="auth-password">
            Password
          </label>

          <input
            id="auth-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            autoComplete={
              isLogin
                ? "current-password"
                : "new-password"
            }
            disabled={loading}
            required
          />

          {/* FORGOT PASSWORD */}

          {isLogin && (
            <button
              type="button"
              className="forgot-password-button"
              onClick={
                handleForgotPassword
              }
              disabled={loading}
            >
              Forgot password?
            </button>
          )}

          {/* CONFIRM PASSWORD */}

          {!isLogin && (
            <>
              <label htmlFor="auth-confirm-password">
                Confirm password
              </label>

              <input
                id="auth-confirm-password"
                type="password"
                placeholder="Enter password again"
                value={
                  confirmPassword
                }
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                autoComplete="new-password"
                disabled={loading}
                required
              />
            </>
          )}

          {/* ERROR */}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div className="auth-success">
              {success}
            </div>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "PLEASE WAIT..."
              : isLogin
              ? "SIGN IN →"
              : "CREATE ACCOUNT →"}
          </button>

          {/* RESEND VERIFICATION */}

          {auth.currentUser &&
            !auth.currentUser
              .emailVerified && (
              <button
                type="button"
                className="verification-button"
                onClick={
                  handleResendVerification
                }
                disabled={loading}
              >
                RESEND VERIFICATION EMAIL
              </button>
            )}

        </form>

        {/* SWITCH */}

        <div className="auth-switch">

          <span>
            {isLogin
              ? "New to Lumé?"
              : "Already have an account?"}
          </span>

          <button
            type="button"
            onClick={switchMode}
            disabled={loading}
          >
            {isLogin
              ? "Create account"
              : "Sign in"}
          </button>

        </div>

      </div>

    </div>
  );
}

export default Auth;