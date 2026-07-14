/* =========================================================
   SHARED PRODUCT CATALOG
   Used by index.html and category.html
========================================================= */

window.STORE_PRODUCTS = [
  /* ---------- PHONES ---------- */
  {
    id: "phone-1",
    title: "Pro Max Smartphone",
    brand: "TechOne",
    category: "electronics",
    subcategory: "phones",
    material: "Glass",
    colorName: "Black",
    price: 999,
    oldPrice: 1199,
    discount: 0.17,
    rating: 4.9,
    reviews: 324,
    badge: "Best Seller",
    stock: "In Stock",
    images: ["images/phone1.jpg"],
    addedAt: Date.parse("2026-06-20"),
    likes: 950,
    sales: 1420
  },

  /* ---------- LAPTOPS ---------- */
  {
    id: "laptop-1",
    title: "Ultra Performance Laptop",
    brand: "TechOne",
    category: "electronics",
    subcategory: "laptops",
    material: "Aluminum",
    colorName: "Grey",
    price: 1299,
    oldPrice: 1499,
    discount: 0.13,
    rating: 4.8,
    reviews: 215,
    badge: "Trending",
    stock: "In Stock",
    images: ["images/laptop1.jpg"],
    addedAt: Date.parse("2026-07-01"),
    likes: 810,
    sales: 930
  },

  /* ---------- FASHION ---------- */
  {
    id: "fashion-shirt-1",
    title: "Classic White Shirt",
    brand: "Urban Style",
    category: "fashion",
    subcategory: "men",
    material: "Cotton",
    colorName: "White",
    price: 45,
    oldPrice: 60,
    discount: 0.25,
    rating: 4,
    reviews: 84,
    badge: "Popular",
    stock: "In Stock",
    images: ["images/kitchen.jpg"],
    addedAt: Date.parse("2026-06-25"),
    likes: 430,
    sales: 670
  },

  {
    id: "shoe-1",
    title: "Leather Sneakers",
    brand: "City Walk",
    category: "fashion",
    subcategory: "shoes",
    material: "Leather",
    colorName: "White",
    price: 89.99,
    oldPrice: 119.99,
    discount: 0.25,
    rating: 5,
    reviews: 132,
    badge: "Best Seller",
    stock: "In Stock",
    images: ["images/sofa1.jpg"],
    addedAt: Date.parse("2026-06-29"),
    likes: 720,
    sales: 980
  },

  /* ---------- KITCHEN ---------- */
  {
    id: "kitchen-1",
    title: "Modern Kitchen Essential Set",
    brand: "HomeCraft",
    category: "home",
    subcategory: "kitchen",
    material: "Steel",
    colorName: "Silver",
    price: 129,
    oldPrice: 169,
    discount: 0.24,
    rating: 4.7,
    reviews: 96,
    badge: "Deal",
    stock: "In Stock",
    images: ["images/kitchen.jpg"],
    addedAt: Date.parse("2026-06-18"),
    likes: 390,
    sales: 510
  },

  /* ---------- OFFICE ---------- */
  {
    id: "office-1",
    title: "Ergonomic Office Chair",
    brand: "WorkSpace",
    category: "office",
    subcategory: "office-chairs",
    material: "Fabric",
    colorName: "Black",
    price: 299,
    oldPrice: 399,
    discount: 0.25,
    rating: 4.8,
    reviews: 188,
    badge: "Top Rated",
    stock: "In Stock",
    images: ["images/office.jpg"],
    addedAt: Date.parse("2026-07-03"),
    likes: 680,
    sales: 740
  },

  /* ---------- SPORTS ---------- */
  {
    id: "sports-1",
    title: "Premium Fitness Training Set",
    brand: "ActivePro",
    category: "sports",
    subcategory: "fitness",
    material: "Mixed",
    colorName: "Black",
    price: 149,
    oldPrice: 199,
    discount: 0.25,
    rating: 4.7,
    reviews: 115,
    badge: "Trending",
    stock: "In Stock",
    images: ["images/sports.jpg"],
    addedAt: Date.parse("2026-06-30"),
    likes: 750,
    sales: 820
  },

  /* ---------- FURNITURE ---------- */
  {
    id: "sofa-1",
    title: "Haven 3-Seater Sofa",
    brand: "FurniHome",
    category: "home",
    subcategory: "sofas",
    material: "Fabric",
    colorName: "Beige",
    price: 699,
    oldPrice: 899,
    discount: 0.22,
    rating: 4.8,
    reviews: 124,
    badge: "Best Seller",
    stock: "In Stock",
    images: [
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1200&auto=format&fit=crop"
    ],
    addedAt: Date.parse("2026-05-10"),
    likes: 870,
    sales: 1100
  }
];

/* Backward compatibility with your existing homepage code */
window.products = window.STORE_PRODUCTS;
