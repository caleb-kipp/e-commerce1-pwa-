/* ==========================================================
   ENTERPRISE CART.JS
   PART B
   Services Layer + Pricing + Promotions + Inventory
   Continuation of Part A
========================================================== */

/* ==========================================================
   CART VALIDATION ENGINE
========================================================== */

class CartValidationEngine {

  constructor({
    productRepository,
    inventoryService
  }) {
    this.productRepository = productRepository;
    this.inventoryService = inventoryService;
  }

  async validateCart(cart) {

    const errors = [];
    const warnings = [];

    for (const item of cart.items.values()) {

      const product =
        await this.productRepository.findById(item.productId);

      if (!product) {
        errors.push({
          code: "PRODUCT_NOT_FOUND",
          itemId: item.id,
          productId: item.productId
        });

        continue;
      }

      if (!product.active) {
        errors.push({
          code: "PRODUCT_DISABLED",
          itemId: item.id
        });
      }

      const stock =
        await this.inventoryService.getAvailableQuantity(
          item.productId,
          item.variantId
        );

      if (item.quantity > stock) {
        errors.push({
          code: "INSUFFICIENT_STOCK",
          itemId: item.id,
          available: stock,
          requested: item.quantity
        });
      }

      if (product.maxPurchaseLimit) {

        if (
          item.quantity >
          product.maxPurchaseLimit
        ) {
          warnings.push({
            code: "MAX_LIMIT_EXCEEDED",
            limit: product.maxPurchaseLimit,
            itemId: item.id
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/* ==========================================================
   MONEY UTILITIES
========================================================== */

class Money {

  static round(value) {
    return Math.round(value * 100) / 100;
  }

  static add(a, b) {
    return Money.round(a + b);
  }

  static subtract(a, b) {
    return Money.round(a - b);
  }

  static multiply(a, b) {
    return Money.round(a * b);
  }

  static percentage(value, percent) {
    return Money.round(
      value * (percent / 100)
    );
  }
}

/* ==========================================================
   TAX ENGINE
========================================================== */

class TaxEngine {

  constructor(config = {}) {

    this.defaultRate =
      config.defaultRate || 0;

    this.countryRates =
      config.countryRates || {};
  }

  calculateTax(
    subtotal,
    country
  ) {

    const rate =
      this.countryRates[country]
      ?? this.defaultRate;

    return Money.round(
      subtotal * rate
    );
  }
}

/* ==========================================================
   SHIPPING ENGINE
========================================================== */

class ShippingEngine {

  constructor(config = {}) {

    this.freeShippingThreshold =
      config.freeShippingThreshold || 100;

    this.defaultShippingCost =
      config.defaultShippingCost || 8.99;
  }

  calculate({
    subtotal,
    country
  }) {

    if (
      subtotal >=
      this.freeShippingThreshold
    ) {
      return {
        cost: 0,
        method: "FREE"
      };
    }

    return {
      cost: this.defaultShippingCost,
      method: "STANDARD"
    };
  }
}

/* ==========================================================
   PROMOTION TYPES
========================================================== */

const PromotionType = Object.freeze({

  FIXED_DISCOUNT:
    "FIXED_DISCOUNT",

  PERCENT_DISCOUNT:
    "PERCENT_DISCOUNT",

  BUY_X_GET_Y:
    "BUY_X_GET_Y",

  FREE_SHIPPING:
    "FREE_SHIPPING"
});

/* ==========================================================
   PROMOTION ENTITY
========================================================== */

class Promotion {

  constructor(data = {}) {

    this.id = data.id;

    this.code = data.code;

    this.type = data.type;

    this.value = data.value;

    this.active =
      data.active ?? true;

    this.startsAt =
      data.startsAt || null;

    this.endsAt =
      data.endsAt || null;

    this.minimumSpend =
      data.minimumSpend || 0;
  }

  isActive() {

    if (!this.active)
      return false;

    const now = Date.now();

    if (
      this.startsAt &&
      now < this.startsAt
    ) {
      return false;
    }

    if (
      this.endsAt &&
      now > this.endsAt
    ) {
      return false;
    }

    return true;
  }
}

/* ==========================================================
   PROMOTION SERVICE
========================================================== */

class PromotionService {

  constructor() {

    this.promotions = new Map();
  }

  registerPromotion(promo) {

    this.promotions.set(
      promo.code.toUpperCase(),
      promo
    );
  }

  getPromotion(code) {

    return this.promotions.get(
      code.toUpperCase()
    );
  }

  calculateDiscount(
    subtotal,
    promo
  ) {

    if (!promo)
      return 0;

    if (!promo.isActive())
      return 0;

    if (
      subtotal <
      promo.minimumSpend
    ) {
      return 0;
    }

    switch (promo.type) {

      case PromotionType.FIXED_DISCOUNT:

        return Math.min(
          subtotal,
          promo.value
        );

      case PromotionType.PERCENT_DISCOUNT:

        return Money.percentage(
          subtotal,
          promo.value
        );

      default:

        return 0;
    }
  }
}

/* ==========================================================
   PRICE CALCULATOR
========================================================== */

class PriceCalculator {

  constructor({
    taxEngine,
    shippingEngine,
    promotionService
  }) {

    this.taxEngine =
      taxEngine;

    this.shippingEngine =
      shippingEngine;

    this.promotionService =
      promotionService;
  }

  calculate({
    cart,
    country = "US",
    promoCode = null
  }) {

    let subtotal = 0;

    for (const item of cart.items.values()) {

      subtotal +=
        item.unitPrice *
        item.quantity;
    }

    subtotal =
      Money.round(subtotal);

    const promotion =
      promoCode
      ? this.promotionService
          .getPromotion(
            promoCode
          )
      : null;

    const discount =
      this.promotionService
        .calculateDiscount(
          subtotal,
          promotion
        );

    const discountedSubtotal =
      Money.subtract(
        subtotal,
        discount
      );

    const shipping =
      this.shippingEngine
        .calculate({
          subtotal:
            discountedSubtotal,
          country
        });

    const tax =
      this.taxEngine
        .calculateTax(
          discountedSubtotal,
          country
        );

    const grandTotal =
      Money.round(
        discountedSubtotal +
        shipping.cost +
        tax
      );

    return {

      subtotal,

      discount,

      discountedSubtotal,

      shipping,

      tax,

      total: grandTotal,

      appliedPromotion:
        promotion?.code || null
    };
  }
}

/* ==========================================================
   INVENTORY SERVICE
========================================================== */

class InventoryService {

  constructor() {

    this.inventory =
      new Map();
  }

  seed(records = []) {

    records.forEach(record => {

      this.inventory.set(
        `${record.productId}:${record.variantId}`,
        record.stock
      );
    });
  }

  async getAvailableQuantity(
    productId,
    variantId
  ) {

    const key =
      `${productId}:${variantId}`;

    return (
      this.inventory.get(key)
      ?? 0
    );
  }

  async reserveInventory(
    productId,
    variantId,
    quantity
  ) {

    const key =
      `${productId}:${variantId}`;

    const stock =
      this.inventory.get(key) || 0;

    if (stock < quantity) {

      throw new Error(
        "INSUFFICIENT_INVENTORY"
      );
    }

    this.inventory.set(
      key,
      stock - quantity
    );

    return true;
  }

  async releaseInventory(
    productId,
    variantId,
    quantity
  ) {

    const key =
      `${productId}:${variantId}`;

    const stock =
      this.inventory.get(key) || 0;

    this.inventory.set(
      key,
      stock + quantity
    );
  }
}

/* ==========================================================
   CART SYNCHRONIZATION SERVICE
========================================================== */

class CartSyncService {

  constructor({
    apiClient,
    eventBus
  }) {

    this.apiClient =
      apiClient;

    this.eventBus =
      eventBus;

    this.syncInProgress =
      false;
  }

  async push(cart) {

    if (
      this.syncInProgress
    ) {
      return;
    }

    try {

      this.syncInProgress =
        true;

      this.eventBus.emit(
        "cart.sync.started",
        {
          cartId: cart.id
        }
      );

      const response =
        await this.apiClient.post(
          "/cart/sync",
          cart.serialize()
        );

      this.eventBus.emit(
        "cart.sync.success",
        response
      );

      return response;

    } catch (error) {

      this.eventBus.emit(
        "cart.sync.failed",
        error
      );

      throw error;

    } finally {

      this.syncInProgress =
        false;
    }
  }
}

/* ==========================================================
   CART COMMAND SERVICE
========================================================== */

class CartCommandService {

  constructor({
    cart,
    repository,
    eventBus,
    validator
  }) {

    this.cart = cart;

    this.repository =
      repository;

    this.eventBus =
      eventBus;

    this.validator =
      validator;
  }

  async addItem(item) {

    this.cart.addItem(item);

    const validation =
      await this.validator
        .validateCart(
          this.cart
        );

    if (!validation.valid) {

      this.cart.removeItem(
        item.id
      );

      throw validation.errors[0];
    }

    await this.repository.save(
      this.cart
    );

    this.eventBus.emit(
      "cart.item.added",
      item
    );

    return this.cart;
  }

  async removeItem(id) {

    this.cart.removeItem(id);

    await this.repository.save(
      this.cart
    );

    this.eventBus.emit(
      "cart.item.removed",
      { id }
    );

    return this.cart;
  }

  async updateQuantity(
    itemId,
    quantity
  ) {

    this.cart.updateQuantity(
      itemId,
      quantity
    );

    const validation =
      await this.validator
        .validateCart(
          this.cart
        );

    if (!validation.valid) {
      throw validation.errors[0];
    }

    await this.repository.save(
      this.cart
    );

    this.eventBus.emit(
      "cart.item.updated",
      {
        itemId,
        quantity
      }
    );

    return this.cart;
  }
}

/* ==========================================================
   END PART B
   NEXT:
   PART C
   Cart Drawer UI
   Checkout Flow
   Address Book
   Customer Profiles
   Payment Gateway Layer
   Fraud Detection Hooks
   Order Creation Pipeline
========================================================== */
