import { useEffect, useMemo, useState } from "react";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const EMPTY_ADDRESS = {
  id: "",
  label: "Home",
  fullName: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pin: "",
  isDefault: false,
};

function Profile({ onBack }) {
  const [profile, setProfile] = useState({
    fullName: "",
    phone: "",
    email: auth.currentUser?.email || "",
  });
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const user = auth.currentUser;

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        const data = snap.exists() ? snap.data() : {};

        setProfile({
          fullName: data.fullName || user.displayName || "",
          phone: data.phone || "",
          email: user.email || data.email || "",
        });

        setAddresses(
          Array.isArray(data.addresses) ? data.addresses : []
        );
      } catch (error) {
        console.error("Profile load error:", error);
        setMessage("Could not load your account.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const defaultAddress = useMemo(
    () =>
      addresses.find((item) => item.isDefault) ||
      addresses[0] ||
      null,
    [addresses]
  );

  function handleProfileChange(event) {
    const { name, value } = event.target;
    let next = value;

    if (name === "phone") {
      next = value.replace(/\D/g, "").slice(0, 10);
    }

    setProfile((current) => ({
      ...current,
      [name]: next,
    }));
    setMessage("");
  }

  async function saveProfile(event) {
    event.preventDefault();

    const user = auth.currentUser;
    if (!user) return;

    if (!profile.fullName.trim()) {
      setMessage("Enter your full name.");
      return;
    }

    if (profile.phone && !/^\d{10}$/.test(profile.phone)) {
      setMessage("Phone number must contain 10 digits.");
      return;
    }

    try {
      setSavingProfile(true);
      setMessage("");

      await setDoc(
        doc(db, "users", user.uid),
        {
          fullName: profile.fullName.trim(),
          phone: profile.phone,
          email: user.email || profile.email,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage("Profile updated successfully.");
    } catch (error) {
      console.error("Profile save error:", error);
      setMessage("Could not save your profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  function openNewAddress() {
    setEditingAddressId("");
    setAddressForm({
      ...EMPTY_ADDRESS,
      id: `address-${Date.now()}`,
      fullName: profile.fullName,
      phone: profile.phone,
      isDefault: addresses.length === 0,
    });
    setShowAddressForm(true);
    setMessage("");
  }

  function editAddress(address) {
    setEditingAddressId(address.id);
    setAddressForm({
      ...EMPTY_ADDRESS,
      ...address,
    });
    setShowAddressForm(true);
    setMessage("");
  }

  function handleAddressChange(event) {
    const { name, value } = event.target;
    let next = value;

    if (name === "phone") {
      next = value.replace(/\D/g, "").slice(0, 10);
    }

    if (name === "pin") {
      next = value.replace(/\D/g, "").slice(0, 6);
    }

    setAddressForm((current) => ({
      ...current,
      [name]: next,
    }));
    setMessage("");
  }

  async function persistAddresses(nextAddresses, successMessage) {
    const user = auth.currentUser;
    if (!user) return;

    await setDoc(
      doc(db, "users", user.uid),
      {
        addresses: nextAddresses,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    setAddresses(nextAddresses);
    setMessage(successMessage);
  }

  async function saveAddress(event) {
    event.preventDefault();

    const required = [
      addressForm.label,
      addressForm.fullName,
      addressForm.phone,
      addressForm.address,
      addressForm.city,
      addressForm.state,
      addressForm.pin,
    ];

    if (required.some((value) => !String(value || "").trim())) {
      setMessage("Complete all address fields.");
      return;
    }

    if (!/^\d{10}$/.test(addressForm.phone)) {
      setMessage("Phone number must contain 10 digits.");
      return;
    }

    if (!/^\d{6}$/.test(addressForm.pin)) {
      setMessage("PIN code must contain 6 digits.");
      return;
    }

    try {
      setSavingAddress(true);
      setMessage("");

      let nextAddresses;

      if (editingAddressId) {
        nextAddresses = addresses.map((item) =>
          item.id === editingAddressId
            ? { ...addressForm, id: editingAddressId }
            : item
        );
      } else {
        nextAddresses = [
          ...addresses,
          {
            ...addressForm,
            id: addressForm.id || `address-${Date.now()}`,
          },
        ];
      }

      if (addressForm.isDefault) {
        const activeId =
          editingAddressId || addressForm.id;
        nextAddresses = nextAddresses.map((item) => ({
          ...item,
          isDefault: item.id === activeId,
        }));
      }

      if (
        nextAddresses.length > 0 &&
        !nextAddresses.some((item) => item.isDefault)
      ) {
        nextAddresses[0] = {
          ...nextAddresses[0],
          isDefault: true,
        };
      }

      await persistAddresses(
        nextAddresses,
        editingAddressId
          ? "Address updated successfully."
          : "Address added successfully."
      );

      setShowAddressForm(false);
      setEditingAddressId("");
      setAddressForm(EMPTY_ADDRESS);
    } catch (error) {
      console.error("Address save error:", error);
      setMessage("Could not save the address.");
    } finally {
      setSavingAddress(false);
    }
  }

  async function makeDefault(id) {
    try {
      const nextAddresses = addresses.map((item) => ({
        ...item,
        isDefault: item.id === id,
      }));

      await persistAddresses(
        nextAddresses,
        "Default address updated."
      );
    } catch (error) {
      console.error("Default address error:", error);
      setMessage("Could not update the default address.");
    }
  }

  async function deleteAddress(id) {
    const confirmed = window.confirm("Delete this saved address?");
    if (!confirmed) return;

    try {
      let nextAddresses = addresses.filter((item) => item.id !== id);

      if (
        nextAddresses.length > 0 &&
        !nextAddresses.some((item) => item.isDefault)
      ) {
        nextAddresses = nextAddresses.map((item, index) => ({
          ...item,
          isDefault: index === 0,
        }));
      }

      await persistAddresses(nextAddresses, "Address removed.");

      if (editingAddressId === id) {
        setShowAddressForm(false);
        setEditingAddressId("");
      }
    } catch (error) {
      console.error("Delete address error:", error);
      setMessage("Could not delete the address.");
    }
  }

  if (loading) {
    return (
      <main className="profile-dashboard profile-loading">
        <p>ACCOUNT</p>
        <h1>Loading your profile…</h1>
      </main>
    );
  }

  return (
    <main className="profile-dashboard">
      <section className="profile-dashboard-hero">
        <div>
          <p>YOUR ACCOUNT</p>
          <h1>Profile.</h1>
          <span>
            Manage your personal details and delivery addresses.
          </span>
        </div>

        <div className="profile-identity">
          <div className="profile-avatar">
            {(profile.fullName || profile.email || "L")
              .trim()
              .charAt(0)
              .toUpperCase()}
          </div>
          <div>
            <strong>{profile.fullName || "LUMÉ Customer"}</strong>
            <span>{profile.email}</span>
            <small>
              {auth.currentUser?.emailVerified
                ? "✓ VERIFIED ACCOUNT"
                : "EMAIL VERIFICATION PENDING"}
            </small>
          </div>
        </div>
      </section>

      <section className="profile-dashboard-grid">
        <aside className="profile-summary-panel">
          <p>ACCOUNT OVERVIEW</p>

          <div className="profile-summary-row">
            <span>EMAIL</span>
            <strong>{profile.email || "—"}</strong>
          </div>

          <div className="profile-summary-row">
            <span>PHONE</span>
            <strong>{profile.phone || "Not added"}</strong>
          </div>

          <div className="profile-summary-row">
            <span>SAVED ADDRESSES</span>
            <strong>{addresses.length}</strong>
          </div>

          <div className="profile-summary-row">
            <span>DEFAULT DELIVERY</span>
            <strong>
              {defaultAddress?.label || "Not selected"}
            </strong>
          </div>

          <button type="button" onClick={onBack}>
            ← BACK TO STORE
          </button>
        </aside>

        <div className="profile-dashboard-content">
          <section className="profile-section">
            <div className="profile-section-heading">
              <div>
                <p>01 · PERSONAL DETAILS</p>
                <h2>Your information</h2>
              </div>
              <span>Used for your LUMÉ account and checkout.</span>
            </div>

            <form className="profile-form" onSubmit={saveProfile}>
              <label>
                <span>FULL NAME</span>
                <input
                  name="fullName"
                  value={profile.fullName}
                  onChange={handleProfileChange}
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </label>

              <label>
                <span>PHONE NUMBER</span>
                <input
                  name="phone"
                  value={profile.phone}
                  onChange={handleProfileChange}
                  placeholder="10-digit mobile number"
                  inputMode="numeric"
                  maxLength="10"
                  autoComplete="tel"
                />
              </label>

              <label className="profile-email-field">
                <span>EMAIL ADDRESS</span>
                <input
                  value={profile.email}
                  readOnly
                  aria-label="Email address"
                />
                <small>Email is managed by your sign-in account.</small>
              </label>

              <button
                type="submit"
                className="profile-primary-button"
                disabled={savingProfile}
              >
                {savingProfile ? "SAVING…" : "SAVE PROFILE"}
              </button>
            </form>
          </section>

          <section className="profile-section">
            <div className="profile-section-heading profile-address-heading">
              <div>
                <p>02 · SAVED ADDRESSES</p>
                <h2>Delivery addresses</h2>
              </div>

              <button
                type="button"
                className="profile-add-address"
                onClick={openNewAddress}
              >
                + ADD ADDRESS
              </button>
            </div>

            {addresses.length === 0 ? (
              <div className="profile-address-empty">
                <span>⌂</span>
                <h3>No saved addresses.</h3>
                <p>Add an address to make checkout faster.</p>
                <button type="button" onClick={openNewAddress}>
                  ADD YOUR FIRST ADDRESS →
                </button>
              </div>
            ) : (
              <div className="profile-address-grid">
                {addresses.map((item) => (
                  <article
                    className={`profile-address-card ${
                      item.isDefault ? "is-default" : ""
                    }`}
                    key={item.id}
                  >
                    <div className="profile-address-card-top">
                      <strong>{item.label || "Address"}</strong>
                      {item.isDefault && <span>DEFAULT</span>}
                    </div>

                    <h3>{item.fullName}</h3>
                    <p>{item.address}</p>
                    <p>
                      {item.city}, {item.state} - {item.pin}
                    </p>
                    <p>{item.phone}</p>

                    <div className="profile-address-actions">
                      <button type="button" onClick={() => editAddress(item)}>
                        EDIT
                      </button>

                      {!item.isDefault && (
                        <button
                          type="button"
                          onClick={() => makeDefault(item.id)}
                        >
                          SET DEFAULT
                        </button>
                      )}

                      <button
                        type="button"
                        className="danger"
                        onClick={() => deleteAddress(item.id)}
                      >
                        DELETE
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {showAddressForm && (
            <section className="profile-section profile-address-editor">
              <div className="profile-section-heading">
                <div>
                  <p>
                    {editingAddressId
                      ? "EDIT ADDRESS"
                      : "NEW ADDRESS"}
                  </p>
                  <h2>
                    {editingAddressId
                      ? "Update delivery address"
                      : "Add delivery address"}
                  </h2>
                </div>

                <button
                  type="button"
                  className="profile-editor-close"
                  onClick={() => {
                    setShowAddressForm(false);
                    setEditingAddressId("");
                  }}
                >
                  ×
                </button>
              </div>

              <form className="profile-address-form" onSubmit={saveAddress}>
                <label>
                  <span>LABEL</span>
                  <select
                    name="label"
                    value={addressForm.label}
                    onChange={handleAddressChange}
                  >
                    <option>Home</option>
                    <option>Work</option>
                    <option>Other</option>
                  </select>
                </label>

                <label>
                  <span>FULL NAME</span>
                  <input
                    name="fullName"
                    value={addressForm.fullName}
                    onChange={handleAddressChange}
                    placeholder="Full name"
                  />
                </label>

                <label>
                  <span>PHONE</span>
                  <input
                    name="phone"
                    value={addressForm.phone}
                    onChange={handleAddressChange}
                    inputMode="numeric"
                    maxLength="10"
                    placeholder="10-digit mobile number"
                  />
                </label>

                <label className="profile-address-full">
                  <span>ADDRESS</span>
                  <textarea
                    name="address"
                    value={addressForm.address}
                    onChange={handleAddressChange}
                    placeholder="House / Flat number, Street, Area"
                    rows="3"
                  />
                </label>

                <label>
                  <span>CITY</span>
                  <input
                    name="city"
                    value={addressForm.city}
                    onChange={handleAddressChange}
                    placeholder="City"
                  />
                </label>

                <label>
                  <span>STATE</span>
                  <input
                    name="state"
                    value={addressForm.state}
                    onChange={handleAddressChange}
                    placeholder="State"
                  />
                </label>

                <label>
                  <span>PIN CODE</span>
                  <input
                    name="pin"
                    value={addressForm.pin}
                    onChange={handleAddressChange}
                    inputMode="numeric"
                    maxLength="6"
                    placeholder="6-digit PIN"
                  />
                </label>

                <label className="profile-default-check">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={(event) =>
                      setAddressForm((current) => ({
                        ...current,
                        isDefault: event.target.checked,
                      }))
                    }
                  />
                  <span>MAKE THIS MY DEFAULT ADDRESS</span>
                </label>

                <div className="profile-editor-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddressForm(false);
                      setEditingAddressId("");
                    }}
                  >
                    CANCEL
                  </button>

                  <button
                    type="submit"
                    className="profile-primary-button"
                    disabled={savingAddress}
                  >
                    {savingAddress ? "SAVING…" : "SAVE ADDRESS"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {message && (
            <div className="profile-message" role="status">
              {message}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default Profile;
