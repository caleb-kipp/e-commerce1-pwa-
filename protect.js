// === FILE: protect.js ===

function redirectIfNotLogged() {
  const isLogged = sessionStorage.getItem("activeUser");
  if (!isLogged) {
    window.location.href = "authentication.html";
  }
}

function blockGuestAction(actionName) {
  if (!sessionStorage.getItem("activeUser")) {
    alert("Please log in to " + actionName);
    window.location.href = "authentication.html";
    return false;
  }
  return true;
}
