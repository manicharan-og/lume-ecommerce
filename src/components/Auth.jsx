import { useState } from "react";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

import { auth } from "../firebase";
import "./Auth.css";

function Auth({ onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function getErrorMessage(errorCode) {
    switch (errorCode) {
      case "auth/email-already-in-use":
        return "An account already exists with this email address.";
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/weak-password":
        return "Use a password with at least 6 characters.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "The email or password is incorrect.";
      case "auth/user-not-found":
        return "We could not find an account with this email.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      case "auth/network-request-failed":
        return "Network error. Check your internet connection and try again.";
      case "auth/operation-not-allowed":
        return "Email and password sign-in is currently unavailable.";
      case "auth/missing-email":
        return "Enter your email address.";
      default:
        return "We could not complete that request. Please try again.";
    }
  }

  async function handleLogin() {
    setError("");
    setSuccess("");

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError("Enter your email address and password.");
      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      onClose?.();
    } catch (loginError) {
      console.error("Firebase login error:", loginError);
      setError(getErrorMessage(loginError.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup() {
    setError("");
    setSuccess("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("Enter your email address.");
      return;
    }

    if (password.length < 6) {
      setError("Use a password with at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      onClose?.();
    } catch (signupError) {
      console.error("Firebase signup error:", signupError);
      setError(getErrorMessage(signupError.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError("");
    setSuccess("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("Enter your email address first.");
      return;
    }

    try {
      setLoading(true);

      await sendPasswordResetEmail(
        auth,
        cleanEmail
      );

      setSuccess(
        "Password reset link sent. Check your email inbox."
      );
    } catch (resetError) {
      console.error("Password reset error:", resetError);
      setError(getErrorMessage(resetError.code));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    if (isLogin) {
      handleLogin();
    } else {
      handleSignup();
    }
  }

  function switchMode() {
    setIsLogin((current) => !current);
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <div
      className="auth-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lume-auth-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="auth-modal">
        <button
          type="button"
          className="auth-close"
          onClick={onClose}
          aria-label="Close account window"
        >
          ×
        </button>

        <div className="auth-brand" aria-label="LUMÉ">
          L U M É
        </div>

        <div className="auth-heading">
          <p className="auth-small-title">
            {isLogin ? "ACCOUNT ACCESS" : "NEW ACCOUNT"}
          </p>

          <h2 id="lume-auth-title">
            {isLogin
              ? "Welcome back."
              : "Create your account."}
          </h2>

          <p className="auth-description">
            {isLogin
              ? "Sign in to continue to your bag, saved pieces and order history."
              : "Save favourites, manage delivery addresses and track your LUMÉ orders in one place."}
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <div className="auth-field">
            <label htmlFor="auth-email">
              EMAIL ADDRESS
            </label>

            <input
              id="auth-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="auth-password">
                PASSWORD
              </label>

              {isLogin && (
                <button
                  type="button"
                  className="forgot-password-button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                >
                  RESET PASSWORD
                </button>
              )}
            </div>

            <input
              id="auth-password"
              type="password"
              placeholder={
                isLogin
                  ? "Enter your password"
                  : "Minimum 6 characters"
              }
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete={
                isLogin
                  ? "current-password"
                  : "new-password"
              }
              disabled={loading}
            />
          </div>

          {!isLogin && (
            <div className="auth-field">
              <label htmlFor="auth-confirm-password">
                CONFIRM PASSWORD
              </label>

              <input
                id="auth-confirm-password"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <div className="auth-message auth-error">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-message auth-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "PLEASE WAIT"
              : isLogin
              ? "SIGN IN →"
              : "CREATE ACCOUNT →"}
          </button>
        </form>

        <div className="auth-switch">
          <span>
            {isLogin
              ? "New to LUMÉ?"
              : "Already have an account?"}
          </span>

          <button
            type="button"
            onClick={switchMode}
            disabled={loading}
          >
            {isLogin
              ? "CREATE ACCOUNT →"
              : "SIGN IN →"}
          </button>
        </div>

        <p className="auth-footnote">
          SECURE ACCOUNT ACCESS · LUMÉ
        </p>
      </div>
    </div>
  );
}

export default Auth;
