
/* =========================
   STORAGE KEYS
========================= */
const ACTIVE_USER_KEY = "activeUser";
const REDIRECT_KEY = "redirectAfterLogin";

/* =========================
   ELEMENT REFERENCES
========================= */
const authContainer = document.getElementById("authContainer");
const slides = document.getElementById("slides");
const dashboard = document.getElementById("dashboard");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const forgotForm = document.getElementById("forgotForm");

const userEmailField = document.getElementById("userEmail");

/* =========================
   PANEL NAVIGATION
========================= */
function showRegister() {
  slides.className = "slides show-register";
}

function showLogin() {
  slides.className = "slides show-login";
}

function showForgot() {
  slides.className = "slides show-forgot";
}

/* =========================
   AUTH HELPERS
========================= */
function isLoggedIn() {
  return !!sessionStorage.getItem(ACTIVE_USER_KEY);
}

function getActiveUser() {
  return sessionStorage.getItem(ACTIVE_USER_KEY);
}

/* =========================
   REGISTER
========================= */
registerForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value.trim();

  if (!name || !email || !password) return;

  if (localStorage.getItem("user_" + email)) {
    alert("User already exists");
    return;
  }

  localStorage.setItem(
    "user_" + email,
    JSON.stringify({
      name,
      email,
      password,
      orders: [],
      cart: [],
      payments: [],
      addressBook: []
    })
  );

  alert("Account created. Please login.");
  showLogin();
});

/* =========================
   LOGIN
========================= */
loginForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  const userData = JSON.parse(localStorage.getItem("user_" + email) || "{}");

  if (userData.password === password) {
    sessionStorage.setItem(ACTIVE_USER_KEY, email);

    const redirectTo =
      sessionStorage.getItem(REDIRECT_KEY) || "index.html";
    sessionStorage.removeItem(REDIRECT_KEY);

    window.location.href = redirectTo;
  } else {
    alert("Invalid credentials");
  }
});

/* =========================
   FORGOT PASSWORD (BASIC)
========================= */
forgotForm.addEventListener("submit", function (e) {
  e.preventDefault();
  alert("Password reset link sent (demo)");
  showLogin();
});

/* =========================
   DASHBOARD RENDER
========================= */
function loadDashboard() {
  if (!isLoggedIn()) return;

  const email = getActiveUser();
  const user = JSON.parse(localStorage.getItem("user_" + email));

  if (userEmailField) {
    userEmailField.textContent = user.email;
  }
}

/* =========================
   LOGOUT (FULL PRIVACY CLEAN)
========================= */
function logout() {
  const email = getActiveUser();

  // Clear session ONLY (data preserved securely)
  sessionStorage.clear();

  // Clear sensitive runtime data
  localStorage.removeItem("tempCart");
  localStorage.removeItem("tempCheckout");

  alert("Logged out securely");

  window.location.href = "index.html";
}

/* =========================
   AUTH GUARD
========================= */
function requireAuth(targetPage) {
  if (!isLoggedIn()) {
    sessionStorage.setItem(REDIRECT_KEY, targetPage);
    window.location.href = "authentication.html";
  } else {
    window.location.href = targetPage;
  }
}

/* =========================
   ICON / NAV REDIRECTS
========================= */
function goToCart() {
  requireAuth("cart.html");
}

function goToCheckout() {
  requireAuth("checkout.html");
}

function goToOrders() {
  requireAuth("orders.html");
}

function goToAccount() {
  requireAuth("account.html");
}

/* =========================
   AUTO INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  if (dashboard && isLoggedIn()) {
    authContainer.style.display = "none";
    dashboard.style.display = "block";
    loadDashboard();
  }

  if (dashboard && !isLoggedIn()) {
    window.location.href = "authentication.html";
  }
});
