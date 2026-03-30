// =============================== // FULL WORKING BACKEND (Node.js + Vercel) // ===============================

// 1. Install dependencies: // npm init -y // npm install express cors mongoose dotenv

// 2. Folder structure: // /api/index.js  <-- Vercel serverless entry // /models/User.js // /models/Order.js // .env

// =============================== // api/index.js // ===============================

const express = require("express"); const mongoose = require("mongoose"); const cors = require("cors"); require("dotenv").config();

const app = express();

app.use(cors()); app.use(express.json());

// =============================== // DATABASE CONNECTION // ===============================

mongoose.connect(process.env.MONGO_URI) .then(() => console.log("MongoDB Connected")) .catch(err => console.error(err));

// =============================== // MODELS // ===============================

const UserSchema = new mongoose.Schema({ name: String, email: String, avatar: String, memberSince: String });

const OrderSchema = new mongoose.Schema({ userId: String, date: String, status: String, total: String });

const User = mongoose.model("User", UserSchema); const Order = mongoose.model("Order", OrderSchema);

// =============================== // ROUTES // ===============================

// GET USER PROFILE app.get("/api/user/profile", async (req, res) => { try { const user = await User.findOne(); res.json(user); } catch (err) { res.status(500).json({ error: err.message }); } });

// GET ORDERS app.get("/api/orders", async (req, res) => { try { const orders = await Order.find(); res.json(orders); } catch (err) { res.status(500).json({ error: err.message }); } });

// CREATE USER (for testing) app.post("/api/user/create", async (req, res) => { try { const user = new User(req.body); await user.save(); res.json(user); } catch (err) { res.status(500).json({ error: err.message }); } });

// CREATE ORDER app.post("/api/orders/create", async (req, res) => { try { const order = new Order(req.body); await order.save(); res.json(order); } catch (err) { res.status(500).json({ error: err.message }); } });

// =============================== // EXPORT FOR VERCEL // ===============================

module.exports = app;

// =============================== // .env // ===============================

// MONGO_URI=your_mongodb_connection_string

// =============================== // FRONTEND UPDATE (IMPORTANT) // ===============================

// Replace API_BASE_URL in your script: // const API_BASE_URL = "https://your-vercel-app.vercel.app";

// =============================== // IMPROVED FRONTEND FETCH // ===============================

async function apiRequest(url) { try { const response = await fetch(url);

if (!response.ok) {
  throw new Error("API error");
}

return await response.json();

} catch (error) { console.error("API ERROR:", error); return null; } }

// Example usage in account page async function loadUserProfile() { const user = await fetchUserProfile();

document.getElementById("user-name").innerText = user.name; document.getElementById("user-email").innerText = user.email; }

// =============================== // DEPLOYMENT STEPS // ===============================

// 1. Push to GitHub // 2. Import repo in Vercel // 3. Add ENV variable MONGO_URI in Vercel dashboard // 4. Deploy

// =============================== // OPTIONAL (NEXT FEATURES) // ===============================

// - Authentication (JWT) // - Payments (Stripe) // - Wishlist API // - Reviews API // - Notifications // - Admin dashboard

// =============================== // DONE: REAL BACKEND CONNECTED // ===============================
