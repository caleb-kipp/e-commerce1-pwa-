/* =====================================================
   SECURE CORE – MOBILE OPTIMIZED SECURITY LAYER
===================================================== */

"use strict";

/* ===============================
   SINGLE LOAD LOCK (SAFE)
================================ */
if (window.__SECURE_APP_LOADED__) {
  throw new Error("App already initialized");
}
window.__SECURE_APP_LOADED__ = true;

/* ===============================
   HTTPS & ORIGIN (LIGHTWEIGHT)
================================ */
(function enforceOrigin() {
  const allowed = ["yourdomain.com", "localhost"];

  if (!location.hostname.includes("localhost") && location.protocol !== "https:") {
    location.replace("https://" + location.host + location.pathname);
  }

  if (!allowed.some(o => location.hostname.includes(o))) {
    document.documentElement.innerHTML = "";
    throw new Error("Unauthorized origin");
  }
})();

/* ===============================
   SECURE STORAGE (PER USER)
================================ */
const SecureStore = (() => {
  const secret = "secure-mobile-key";

  const crypt = (str) =>
    btoa(
      encodeURIComponent(
        [...str].map((c, i) =>
          String.fromCharCode(
            c.charCodeAt(0) ^ secret.charCodeAt(i % secret.length)
          )
        ).join("")
      )
    );

  const decrypt = (str) =>
    decodeURIComponent(
      atob(str)
        .split("")
        .map((c, i) =>
          String.fromCharCode(
            c.charCodeAt(0) ^ secret.charCodeAt(i % secret.length)
          )
        )
        .join("")
    );

  return {
    set(key, value) {
      localStorage.setItem(key, crypt(JSON.stringify(value)));
    },
    get(key) {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(decrypt(v)) : null;
    },
    remove(key) {
      localStorage.removeItem(key);
    },
    wipeAll() {
      localStorage.clear();
      sessionStorage.clear();
    }
  };
})();

/* ===============================
   AUTH & USER ISOLATION
================================ */
const AuthGuard = (() => {
  const SESSION = "ACTIVE_USER";
  let lastUser = sessionStorage.getItem(SESSION);

  function isolateUser(email) {
    if (lastUser && lastUser !== email) {
      // Different user detected → wipe old data
      SecureStore.remove("user_" + lastUser);
    }
    lastUser = email;
  }

  return {
    login(email) {
      isolateUser(email);
      sessionStorage.setItem(SESSION, email);

      const data = SecureStore.get("user_" + email) || {
        email,
        cart: [],
        wishlist: [],
        orders: [],
        profile: {}
      };

      SecureStore.set("user_" + email, data);
    },

    logout() {
      const user = sessionStorage.getItem(SESSION);
      if (user) SecureStore.remove("user_" + user);
      SecureStore.wipeAll();
      location.replace("authentication.html");
    },

    isLoggedIn() {
      return !!sessionStorage.getItem(SESSION);
    },

    currentUser() {
      return sessionStorage.getItem(SESSION);
    },

    getUserData() {
      const u = this.currentUser();
      return u ? SecureStore.get("user_" + u) : null;
    },

    saveUserData(data) {
      const u = this.currentUser();
      if (u) SecureStore.set("user_" + u, data);
    }
  };
})();

/* ===============================
   PAGE ACCESS CONTROL (FAST)
================================ */
(function protectPages() {
  const protectedPages = [
    "cart.html",
    "wishlist.html",
    "checkout.html",
    "orders.html",
    "account.html"
  ];

  const page = location.pathname.split("/").pop();

  if (protectedPages.includes(page) && !AuthGuard.isLoggedIn()) {
    sessionStorage.setItem("redirectAfterLogin", page);
    location.replace("authentication.html");
  }
})();

/* ===============================
   DATA AUTO-CLEAR IF NOT LOGGED IN
================================ */
if (!AuthGuard.isLoggedIn()) {
  SecureStore.wipeAll();
}

/* ===============================
   SAFE NAVIGATION HELPERS
================================ */
function goToCart() {
  AuthGuard.isLoggedIn()
    ? location.href = "cart.html"
    : location.href = "authentication.html";
}

function goToWishlist() {
  AuthGuard.isLoggedIn()
    ? location.href = "wishlist.html"
    : location.href = "authentication.html";
}

function goToAccount() {
  AuthGuard.isLoggedIn()
    ? location.href = "account.html"
    : location.href = "authentication.html";
}

/* ===============================
   LOGIN REDIRECT RESTORE
================================ */
(function restoreAfterLogin() {
  if (!AuthGuard.isLoggedIn()) return;

  const redirect = sessionStorage.getItem("redirectAfterLogin");
  if (redirect) {
    sessionStorage.removeItem("redirectAfterLogin");
    location.replace(redirect);
  }
})();

/* ===============================
   LIGHT ANTI-BOT (MOBILE SAFE)
================================ */
if (navigator.webdriver) {
  document.documentElement.innerHTML = "";
  throw new Error("Automation blocked");
}

/* ===============================
   IFRAME PROTECTION
================================ */
if (window.top !== window.self) {
  window.top.location = window.self.location;
}
