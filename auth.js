/* Reshared complete file */
// === FILE: auth.js ===
// Handles login, registration, redirection, session control

// Redirect if already logged in
if (sessionStorage.getItem("activeUser")) {
  if (window.location.pathname.includes("authentication.html")) {
    window.location.href = "index.html";
  }
}

function loginUser() {
  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value.trim();

  const data = JSON.parse(localStorage.getItem("user_" + user) || "{}");

  if (data.password === pass) {
    sessionStorage.setItem("activeUser", user);
    window.location.href = "index.html";
  } else {
    document.getElementById("loginMsg").innerHTML = '<p class="error">Invalid credentials!</p>';
  }
}

function logoutUser() {
  sessionStorage.removeItem("activeUser");
  sessionStorage.clear();
  window.location.href = "authentication.html";
}

function protectPage() {
  const logged = sessionStorage.getItem("activeUser");
  if (!logged) {
    window.location.href = "authentication.html";
  }
}

function requireLoginBeforeAction() {
  if (!sessionStorage.getItem("activeUser")) {
    window.location.href = "authentication.html";
    return false;
  }
  return true;
}