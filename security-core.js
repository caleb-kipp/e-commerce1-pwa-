/* =====================================================
   SECURE CORE – GLOBAL APP SECURITY LAYER
   Author: Production Security Layer
===================================================== */

"use strict";

/* ===============================
   BASIC APP LOCK
================================ */
(function () {
  if (window.__SECURE_APP_LOADED__) {
    throw new Error("Unauthorized reload detected");
  }
  window.__SECURE_APP_LOADED__ = true;
})();

/* ===============================
   ORIGIN & HTTPS ENFORCEMENT
================================ */
(function enforceOrigin() {
  const allowedOrigins = [
    "https://yourdomain.com",
    "capacitor://localhost",
    "ionic://localhost"
  ];

  if (
    location.protocol !== "https:" &&
    !location.hostname.includes("localhost")
  ) {
    location.replace("https://" + location.host + location.pathname);
  }

  if (
    !allowedOrigins.some(origin =>
      location.href.startsWith(origin)
    )
  ) {
    document.documentElement.innerHTML = "";
    throw new Error("Blocked unauthorized origin");
  }
})();

/* ===============================
   ANTI DEVTOOLS / DEBUGGING
================================ */
(function antiDebug() {
  setInterval(() => {
    const start = performance.now();
    debugger;
    if (performance.now() - start > 100) {
      location.reload();
    }
  }, 1000);

  document.addEventListener("contextmenu", e => e.preventDefault());
  document.addEventListener("keydown", e => {
    if (
      e.key === "F12" ||
      (e.ctrlKey && e.shiftKey && ["I", "C", "J"].includes(e.key)) ||
      (e.ctrlKey && e.key === "U")
    ) {
      e.preventDefault();
      location.reload();
    }
  });
})();

/* ===============================
   CONSOLE HIJACK
================================ */
(function blockConsole() {
  const noop = () => {};
  ["log", "warn", "error", "info", "table"].forEach(fn => {
    console[fn] = noop;
  });
})();

/* ===============================
   SCRIPT INJECTION DETECTION
================================ */
(function detectInjection() {
  const allowedScripts = [...document.scripts].map(s => s.src);

  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (
          node.tagName === "SCRIPT" &&
          !allowedScripts.includes(node.src)
        ) {
          location.reload();
        }
      });
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();

/* ===============================
   SECURE STORAGE (ENCRYPTION)
================================ */
const SecureStore = (() => {
  const secret = "x9A#K@!secureKey";

  function encrypt(data) {
    return btoa(
      encodeURIComponent(
        data
          .split("")
          .map((c, i) =>
            String.fromCharCode(
              c.charCodeAt(0) ^ secret.charCodeAt(i % secret.length)
            )
          )
          .join("")
      )
    );
  }

  function decrypt(data) {
    return decodeURIComponent(
      atob(data)
        .split("")
        .map((c, i) =>
          String.fromCharCode(
            c.charCodeAt(0) ^ secret.charCodeAt(i % secret.length)
          )
        )
        .join("")
    );
  }

  return {
    set(key, value) {
      localStorage.setItem(key, encrypt(JSON.stringify(value)));
    },
    get(key) {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(decrypt(val)) : null;
    },
    remove(key) {
      localStorage.removeItem(key);
    },
    clearAll() {
      localStorage.clear();
      sessionStorage.clear();
    }
  };
})();

/* ===============================
   AUTH SESSION PROTECTION
================================ */
const AuthGuard = (() => {
  const SESSION_KEY = "SECURE_ACTIVE_USER";

  return {
    login(email) {
      sessionStorage.setItem(SESSION_KEY, email);
    },
    logout() {
      SecureStore.clearAll();
      location.replace("index.html");
    },
    isLoggedIn() {
      return !!sessionStorage.getItem(SESSION_KEY);
    },
    user() {
      return sessionStorage.getItem(SESSION_KEY);
    }
  };
})();

/* ===============================
   PAGE ACCESS CONTROL
================================ */
(function protectPages() {
  const protectedPages = [
    "cart.html",
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
   BOT / AUTOMATION DETECTION
================================ */
(function botDetection() {
  if (
    navigator.webdriver ||
    /HeadlessChrome/.test(navigator.userAgent)
  ) {
    document.documentElement.innerHTML = "";
    throw new Error("Bot blocked");
  }
})();

/* ===============================
   IFRAME / EMBED BLOCK
================================ */
(function blockEmbedding() {
  if (window.top !== window.self) {
    window.top.location = window.self.location;
  }
})();

/* ===============================
   GLOBAL EXPORT (READ-ONLY)
================================ */
Object.freeze(window);
