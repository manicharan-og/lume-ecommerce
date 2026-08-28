import {
  useEffect,
  useState,
} from "react";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase";

function Profile({
  onBack,
}) {
  // =====================================================
  // STATE
  // =====================================================

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [profile, setProfile] =
    useState({
      fullName: "",
      phone: "",
      email: "",
    });

  const [addresses, setAddresses] =
    useState([]);

  const [showAddressForm, setShowAddressForm] =
    useState(false);

  const [editingAddressId, setEditingAddressId] =
    useState(null);

  const [addressForm, setAddressForm] =
    useState({
      label: "Home",
      fullName: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      pin: "",
    });

  // =====================================================
  // LOAD PROFILE
  // =====================================================

  useEffect(() => {
    async function loadProfile() {
      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        setError(
          "Please sign in to view your profile."
        );

        setLoading(false);

        return;
      }

      try {
        const userReference =
          doc(
            db,
            "users",
            currentUser.uid
          );

        const userSnapshot =
          await getDoc(
            userReference
          );

        if (userSnapshot.exists()) {
          const data =
            userSnapshot.data();

          setProfile({
            fullName:
              data.fullName || "",

            phone:
              data.phone || "",

            email:
              currentUser.email ||
              data.email ||
              "",
          });

          setAddresses(
            Array.isArray(
              data.addresses
            )
              ? data.addresses
              : []
          );
        } else {
          setProfile({
            fullName: "",

            phone: "",

            email:
              currentUser.email ||
              "",
          });

          setAddresses([]);
        }
      } catch (error) {
        console.error(
          "Profile loading error:",
          error
        );

        setError(
          "Could not load your profile."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  // =====================================================
  // PROFILE INPUT
  // =====================================================

  function handleProfileChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setProfile(
      (previous) => ({
        ...previous,

        [name]:
          value,
      })
    );

    setMessage("");
    setError("");
  }

  // =====================================================
  // SAVE PROFILE
  // =====================================================

  async function saveProfile(
    event
  ) {
    event.preventDefault();

    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      setError(
        "Please sign in again."
      );

      return;
    }

    if (
      !profile.fullName.trim()
    ) {
      setError(
        "Please enter your full name."
      );

      return;
    }

    if (
      !/^[0-9]{10}$/.test(
        profile.phone.trim()
      )
    ) {
      setError(
        "Please enter a valid 10-digit phone number."
      );

      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await setDoc(
        doc(
          db,
          "users",
          currentUser.uid
        ),
        {
          fullName:
            profile.fullName.trim(),

          phone:
            profile.phone.trim(),

          email:
            currentUser.email ||
            profile.email,

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      setMessage(
        "Profile saved successfully."
      );
    } catch (error) {
      console.error(
        "Profile save error:",
        error
      );

      setError(
        "Could not save your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // ADDRESS INPUT
  // =====================================================

  function handleAddressChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setAddressForm(
      (previous) => ({
        ...previous,

        [name]:
          value,
      })
    );

    setMessage("");
    setError("");
  }

  // =====================================================
  // RESET ADDRESS FORM
  // =====================================================

  function resetAddressForm() {
    setAddressForm({
      label: "Home",

      fullName:
        profile.fullName || "",

      phone:
        profile.phone || "",

      address: "",

      city: "",

      state: "",

      pin: "",
    });

    setEditingAddressId(
      null
    );
  }

  // =====================================================
  // OPEN ADD ADDRESS
  // =====================================================

  function openAddAddress() {
    resetAddressForm();

    setShowAddressForm(
      true
    );
  }

  // =====================================================
  // CANCEL ADDRESS FORM
  // =====================================================

  function cancelAddressForm() {
    resetAddressForm();

    setShowAddressForm(
      false
    );
  }

  // =====================================================
  // EDIT ADDRESS
  // =====================================================

  function editAddress(
    address
  ) {
    setAddressForm({
      label:
        address.label ||
        "Home",

      fullName:
        address.fullName ||
        profile.fullName ||
        "",

      phone:
        address.phone ||
        profile.phone ||
        "",

      address:
        address.address ||
        "",

      city:
        address.city ||
        "",

      state:
        address.state ||
        "",

      pin:
        address.pin ||
        "",
    });

    setEditingAddressId(
      address.id
    );

    setShowAddressForm(
      true
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =====================================================
  // SAVE ADDRESSES TO FIRESTORE
  // =====================================================

  async function saveAddresses(
    updatedAddresses
  ) {
    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      throw new Error(
        "Please sign in again."
      );
    }

    await setDoc(
      doc(
        db,
        "users",
        currentUser.uid
      ),
      {
        addresses:
          updatedAddresses,

        updatedAt:
          serverTimestamp(),
      },
      {
        merge: true,
      }
    );
  }

  // =====================================================
  // SAVE ADDRESS
  // =====================================================

  async function handleSaveAddress(
    event
  ) {
    event.preventDefault();

    if (
      !addressForm.fullName.trim() ||
      !addressForm.phone.trim() ||
      !addressForm.address.trim() ||
      !addressForm.city.trim() ||
      !addressForm.state.trim() ||
      !addressForm.pin.trim()
    ) {
      setError(
        "Please complete all address details."
      );

      return;
    }

    if (
      !/^[0-9]{10}$/.test(
        addressForm.phone.trim()
      )
    ) {
      setError(
        "Please enter a valid 10-digit phone number."
      );

      return;
    }

    if (
      !/^[0-9]{6}$/.test(
        addressForm.pin.trim()
      )
    ) {
      setError(
        "Please enter a valid 6-digit PIN code."
      );

      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      let updatedAddresses;

      if (
        editingAddressId
      ) {
        updatedAddresses =
          addresses.map(
            (address) =>
              address.id ===
              editingAddressId
                ? {
                    ...address,

                    ...addressForm,
                  }
                : address
          );
      } else {
        const newAddress = {
          id:
            "address-" +
            Date.now(),

          ...addressForm,

          isDefault:
            addresses.length ===
            0,
        };

        updatedAddresses = [
          ...addresses,
          newAddress,
        ];
      }

      await saveAddresses(
        updatedAddresses
      );

      setAddresses(
        updatedAddresses
      );

      setMessage(
        editingAddressId
          ? "Address updated successfully."
          : "Address saved successfully."
      );

      resetAddressForm();

      setShowAddressForm(
        false
      );
    } catch (error) {
      console.error(
        "Address save error:",
        error
      );

      setError(
        error.message ||
        "Could not save address."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // DELETE ADDRESS
  // =====================================================

  async function deleteAddress(
    addressId
  ) {
    const confirmed =
      window.confirm(
        "Delete this saved address?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      let updatedAddresses =
        addresses.filter(
          (address) =>
            address.id !==
            addressId
        );

      const removedAddress =
        addresses.find(
          (address) =>
            address.id ===
            addressId
        );

      // If default address was deleted,
      // make first remaining address default.

      if (
        removedAddress?.isDefault &&
        updatedAddresses.length >
          0
      ) {
        updatedAddresses =
          updatedAddresses.map(
            (
              address,
              index
            ) => ({
              ...address,

              isDefault:
                index === 0,
            })
          );
      }

      await saveAddresses(
        updatedAddresses
      );

      setAddresses(
        updatedAddresses
      );

      setMessage(
        "Address deleted."
      );
    } catch (error) {
      console.error(
        "Delete address error:",
        error
      );

      setError(
        "Could not delete address."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // SET DEFAULT ADDRESS
  // =====================================================

  async function setDefaultAddress(
    addressId
  ) {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const updatedAddresses =
        addresses.map(
          (address) => ({
            ...address,

            isDefault:
              address.id ===
              addressId,
          })
        );

      await saveAddresses(
        updatedAddresses
      );

      setAddresses(
        updatedAddresses
      );

      setMessage(
        "Default address updated."
      );
    } catch (error) {
      console.error(
        "Default address error:",
        error
      );

      setError(
        "Could not update default address."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <section className="profile-page">

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
            MY ACCOUNT
          </p>

          <h2>
            Loading profile...
          </h2>

        </div>

      </section>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <section className="profile-page">

      {/* HEADER */}

      <div className="profile-header">

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
          MY ACCOUNT
        </p>

        <h1>
          Profile
        </h1>

        <p>
          Manage your personal
          information and delivery
          addresses.
        </p>

      </div>

      {message && (
        <div className="profile-success-message">
          ✓ {message}
        </div>
      )}

      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}

      <div className="profile-container">

        {/* ===============================================
            PERSONAL INFORMATION
        =============================================== */}

        <div className="profile-section">

          <div className="profile-section-heading">

            <div>

              <p className="small-title">
                PERSONAL DETAILS
              </p>

              <h2>
                Your information
              </h2>

              <p>
                Update your basic
                account information.
              </p>

            </div>

          </div>

          <form
            className="profile-form"
            onSubmit={
              saveProfile
            }
          >

            <div className="form-grid">

              <div className="form-group">

                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  name="fullName"
                  value={
                    profile.fullName
                  }
                  onChange={
                    handleProfileChange
                  }
                  placeholder="Your full name"
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Phone Number
                </label>

                <input
                  type="tel"
                  name="phone"
                  value={
                    profile.phone
                  }
                  onChange={
                    handleProfileChange
                  }
                  placeholder="10-digit mobile number"
                  maxLength="10"
                  inputMode="numeric"
                  required
                />

              </div>

              <div className="form-group full-width">

                <label>
                  Email Address
                </label>

                <input
                  type="email"
                  value={
                    profile.email
                  }
                  disabled
                />

                <small>
                  Your login email cannot
                  be changed here.
                </small>

              </div>

            </div>

            <button
              type="submit"
              className="profile-save-button"
              disabled={
                saving
              }
            >
              {saving
                ? "SAVING..."
                : "SAVE PROFILE"}
            </button>

          </form>

        </div>

        {/* ===============================================
            SAVED ADDRESSES
        =============================================== */}

        <div className="profile-section">

          <div className="saved-address-header">

            <div>

              <p className="small-title">
                DELIVERY
              </p>

              <h2>
                Saved addresses
              </h2>

              <p>
                Save addresses for
                faster checkout.
              </p>

            </div>

            {!showAddressForm && (
              <button
                type="button"
                className="add-address-button"
                onClick={
                  openAddAddress
                }
              >
                + ADD ADDRESS
              </button>
            )}

          </div>

          {/* ADDRESS FORM */}

          {showAddressForm && (

            <form
              className="address-form"
              onSubmit={
                handleSaveAddress
              }
            >

              <div className="address-form-title">

                <h3>
                  {editingAddressId
                    ? "Edit address"
                    : "Add new address"}
                </h3>

              </div>

              <div className="address-label-options">

                {[
                  "Home",
                  "Work",
                  "Other",
                ].map(
                  (label) => (

                    <button
                      key={
                        label
                      }
                      type="button"
                      className={
                        addressForm.label ===
                        label
                          ? "address-label-button active"
                          : "address-label-button"
                      }
                      onClick={() =>
                        setAddressForm(
                          (
                            previous
                          ) => ({
                            ...previous,

                            label,
                          })
                        )
                      }
                    >
                      {label}
                    </button>

                  )
                )}

              </div>

              <div className="form-grid">

                <div className="form-group">

                  <label>
                    Full Name
                  </label>

                  <input
                    type="text"
                    name="fullName"
                    value={
                      addressForm.fullName
                    }
                    onChange={
                      handleAddressChange
                    }
                    required
                  />

                </div>

                <div className="form-group">

                  <label>
                    Phone Number
                  </label>

                  <input
                    type="tel"
                    name="phone"
                    value={
                      addressForm.phone
                    }
                    onChange={
                      handleAddressChange
                    }
                    maxLength="10"
                    inputMode="numeric"
                    required
                  />

                </div>

                <div className="form-group full-width">

                  <label>
                    Address
                  </label>

                  <textarea
                    name="address"
                    value={
                      addressForm.address
                    }
                    onChange={
                      handleAddressChange
                    }
                    placeholder="House / Flat number, Street, Area"
                    rows="4"
                    required
                  />

                </div>

                <div className="form-group">

                  <label>
                    City
                  </label>

                  <input
                    type="text"
                    name="city"
                    value={
                      addressForm.city
                    }
                    onChange={
                      handleAddressChange
                    }
                    required
                  />

                </div>

                <div className="form-group">

                  <label>
                    State
                  </label>

                  <input
                    type="text"
                    name="state"
                    value={
                      addressForm.state
                    }
                    onChange={
                      handleAddressChange
                    }
                    required
                  />

                </div>

                <div className="form-group">

                  <label>
                    PIN Code
                  </label>

                  <input
                    type="text"
                    name="pin"
                    value={
                      addressForm.pin
                    }
                    onChange={
                      handleAddressChange
                    }
                    maxLength="6"
                    inputMode="numeric"
                    required
                  />

                </div>

              </div>

              <div className="address-form-actions">

                <button
                  type="submit"
                  className="profile-save-button"
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? "SAVING..."
                    : editingAddressId
                    ? "UPDATE ADDRESS"
                    : "SAVE ADDRESS"}
                </button>

                <button
                  type="button"
                  className="address-cancel-button"
                  onClick={
                    cancelAddressForm
                  }
                >
                  CANCEL
                </button>

              </div>

            </form>

          )}

          {/* SAVED ADDRESS LIST */}

          {!showAddressForm &&
            addresses.length ===
              0 && (

              <div className="no-addresses">

                <h3>
                  No saved addresses
                </h3>

                <p>
                  Add your first
                  delivery address for
                  faster checkout.
                </p>

              </div>

            )}

          {!showAddressForm &&
            addresses.length >
              0 && (

              <div className="saved-address-grid">

                {addresses.map(
                  (address) => (

                    <article
                      className={
                        address.isDefault
                          ? "saved-address-card default"
                          : "saved-address-card"
                      }
                      key={
                        address.id
                      }
                    >

                      <div className="saved-address-top">

                        <span className="address-type">
                          {
                            address.label
                          }
                        </span>

                        {address.isDefault && (
                          <span className="default-address-badge">
                            DEFAULT
                          </span>
                        )}

                      </div>

                      <h3>
                        {
                          address.fullName
                        }
                      </h3>

                      <p>
                        {
                          address.address
                        }
                      </p>

                      <p>
                        {
                          address.city
                        }
                        ,{" "}
                        {
                          address.state
                        }{" "}
                        -{" "}
                        {
                          address.pin
                        }
                      </p>

                      <p>
                        Phone:{" "}
                        {
                          address.phone
                        }
                      </p>

                      <div className="saved-address-actions">

                        <button
                          type="button"
                          onClick={() =>
                            editAddress(
                              address
                            )
                          }
                        >
                          EDIT
                        </button>

                        {!address.isDefault && (

                          <button
                            type="button"
                            disabled={
                              saving
                            }
                            onClick={() =>
                              setDefaultAddress(
                                address.id
                              )
                            }
                          >
                            SET DEFAULT
                          </button>

                        )}

                        <button
                          type="button"
                          className="delete-address-button"
                          disabled={
                            saving
                          }
                          onClick={() =>
                            deleteAddress(
                              address.id
                            )
                          }
                        >
                          DELETE
                        </button>

                      </div>

                    </article>

                  )
                )}

              </div>

            )}

        </div>

      </div>

    </section>
  );
}

export default Profile;