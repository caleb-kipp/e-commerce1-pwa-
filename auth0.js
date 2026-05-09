
/* =========================
   GLOBAL AUTH STATE
========================= */

const AUTH_KEY = "activeUser";

/* =========================
   HELPER FUNCTIONS
========================= */

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function secureEquals(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function isLoggedIn() {
  return sessionStorage.getItem(AUTH_KEY) !== null;
}

function getActiveUser() {
  return sessionStorage.getItem(AUTH_KEY);
}

function requireAuth() {
  if (!isLoggedIn()) {
    sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
    window.location.href = "authentication.html";
  }
}

/* =========================
   AUTH UI SWITCHING
========================= */

function showRegister() {
  document.getElementById("slides").className = "slides show-register";
}

function showLogin() {
  document.getElementById("slides").className = "slides show-login";
}

function showForgot() {
  document.getElementById("slides").className = "slides show-forgot";
}

/* =========================
   REGISTRATION
========================= */

document.getElementById("registerForm")?.addEventListener("submit", async function (e) {
  e.preventDefault();

  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value.trim();

  if (!name || !email || !password) {
    alert("All fields are required");
    return;
  }

  if (localStorage.getItem("user_" + email)) {
    alert("Account already exists");
    return;
  }

  const passwordHash = await hashPassword(password);

  localStorage.setItem(
    "user_" + email,
    JSON.stringify({
      name,
      email,
      passwordHash,
      orders: [],
      cart: [],
      payments: [],
      addressBook: []
    })
  );

  alert("Account created successfully. Please login.");
  showLogin();
});

/* =========================
   LOGIN
========================= */

document.getElementById("loginForm")?.addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  const userData = JSON.parse(localStorage.getItem("user_" + email));
  const enteredPasswordHash = await hashPassword(password);

  if (!userData || !secureEquals(userData.passwordHash, enteredPasswordHash)) {
    alert("Invalid login credentials");
    return;
  }

  sessionStorage.setItem(AUTH_KEY, email);

  const redirect = sessionStorage.getItem("redirectAfterLogin");
  sessionStorage.removeItem("redirectAfterLogin");

  window.location.href = redirect || "account.html";
});

/* =========================
   LOGOUT (PRIVACY SAFE)
========================= */

function logout() {
  const user = getActiveUser();

  if (user) {
    // Clear session-only sensitive data
    sessionStorage.clear();
  }

  window.location.href = "authentication.html";
}

/* =========================
   ACCOUNT PAGE RENDER
========================= */

if (window.location.pathname.includes("account.html")) {
  requireAuth();

  const email = getActiveUser();
  const userData = JSON.parse(localStorage.getItem("user_" + email));

  if (userData) {
    document.getElementById("userEmail").textContent = userData.email;
  }
}

/* =========================
   PAGE ACCESS PROTECTION
========================= */

const protectedPages = [
  "cart.html",
  "checkout.html",
  "orders.html",
  "account.html"
];

protectedPages.forEach(page => {
  if (window.location.pathname.includes(page)) {
    requireAuth();
  }
});

/* =========================
   ICON NAVIGATION
========================= */

function goToCart() {
  isLoggedIn()
    ? window.location.href = "cart.html"
    : redirectToAuth();
}

function goToAccount() {
  isLoggedIn()
    ? window.location.href = "account.html"
    : redirectToAuth();
}

function redirectToAuth() {
  sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
  window.location.href = "authentication.html";
}
