/**

* ============================================================
* cart.core.js
* Enterprise Cart Engine
* Version: 1.0.0
* Part 1A
* ============================================================
  */

(function(window){

'use strict';

/* ============================================================

* CONSTANTS
* ============================================================
  */

const CART_VERSION = '1.0.0';

const CART_EVENTS = {
INIT: 'cart:init',
ADD: 'cart:add',
REMOVE: 'cart:remove',
UPDATE: 'cart:update',
CLEAR: 'cart:clear',
RESTORE: 'cart:restore',
SAVE: 'cart:save',
ERROR: 'cart:error',
COUPON_APPLIED: 'cart:coupon_applied',
COUPON_REMOVED: 'cart:coupon_removed',
ITEM_INCREMENT: 'cart:item_increment',
ITEM_DECREMENT: 'cart:item_decrement',
ITEM_UPDATED: 'cart:item_updated',
MERGED: 'cart:merged',
SYNCED: 'cart:synced',
CHECKOUT_STARTED: 'cart:checkout_started'
};

const DEFAULT_CONFIG = {
storageKey: 'ss_cart',
maxItems: 100,
maxQuantityPerItem: 50,
autoSave: true,
persistDelay: 300,
debug: false,
currency: 'USD',
taxRate: 0,
shippingRate: 0
};

/* ============================================================

* UTILITIES
* ============================================================
  */

const Utils = {

uid(prefix='id'){
return "${prefix}_${Date.now()}_${Math.random() .toString(36) .substring(2,11)}";
},

clone(obj){
return JSON.parse(JSON.stringify(obj));
},

debounce(fn, wait=300){
let timer;

return (...args)=>{
  clearTimeout(timer);
  timer = setTimeout(()=>{
    fn(...args);
  }, wait);
};

},

isNumber(value){
return typeof value === 'number' &&
!Number.isNaN(value);
},

money(value){
return Number(value || 0);
},

now(){
return Date.now();
},

log(...args){
console.log('[EnterpriseCart]', ...args);
}

};

/* ============================================================

* EVENT BUS
* ============================================================
  */

class EventBus {

constructor(){
this.events = new Map();
}

on(event, handler){

if(!this.events.has(event)){
  this.events.set(event, []);
}

this.events
  .get(event)
  .push(handler);

return () => this.off(event, handler);

}

off(event, handler){

if(!this.events.has(event)) return;

const list = this.events.get(event);

this.events.set(
  event,
  list.filter(fn => fn !== handler)
);

}

emit(event, payload={}){

if(!this.events.has(event)) return;

this.events.get(event)
  .forEach(handler=>{
    try{
      handler(payload);
    }catch(error){
      console.error(error);
    }
  });

}

clear(){
this.events.clear();
}

}

/* ============================================================

* STORAGE ADAPTER
* ============================================================
  */

class StorageAdapter {

constructor(key){
this.key = key;
}

load(){

try{

  const raw =
    localStorage.getItem(this.key);

  if(!raw){
    return null;
  }

  return JSON.parse(raw);

}catch(error){

  console.error(error);

  return null;
}

}

save(data){

try{

  localStorage.setItem(
    this.key,
    JSON.stringify(data)
  );

  return true;

}catch(error){

  console.error(error);

  return false;
}

}

clear(){
localStorage.removeItem(this.key);
}

}

/* ============================================================

* CART ITEM MODEL
* ============================================================
  */

class CartItem {

constructor(product, quantity=1){

this.id = product.id;

this.title = product.title;

this.price = Number(
  product.price *
  (1 - (product.discount || 0))
);

this.originalPrice =
  product.price;

this.quantity = quantity;

this.image =
  product.images?.[0] || '';

this.category =
  product.category || '';

this.sku =
  product.sku || '';

this.discount =
  product.discount || 0;

this.createdAt =
  Utils.now();

this.updatedAt =
  Utils.now();

this.meta = {
  rating: product.rating || 0,
  likes: product.likes || 0,
  sales: product.sales || 0
};

}

}

/* ============================================================

* HISTORY MANAGER
* ============================================================
  */

class HistoryManager {

constructor(limit=50){

this.limit = limit;

this.undoStack = [];

this.redoStack = [];

}

push(state){

this.undoStack.push(
  Utils.clone(state)
);

if(
  this.undoStack.length >
  this.limit
){
  this.undoStack.shift();
}

this.redoStack = [];

}

undo(current){

if(
  this.undoStack.length === 0
){
  return current;
}

const previous =
  this.undoStack.pop();

this.redoStack.push(
  Utils.clone(current)
);

return previous;

}

redo(current){

if(
  this.redoStack.length === 0
){
  return current;
}

const next =
  this.redoStack.pop();

this.undoStack.push(
  Utils.clone(current)
);

return next;

}

}

/* ============================================================

* CART STATE
* ============================================================
  */

class CartState {

constructor(){

this.items = [];

this.coupon = null;

this.currency = 'USD';

this.taxRate = 0;

this.shippingRate = 0;

this.updatedAt = Utils.now();

this.createdAt = Utils.now();

}

}

/* ============================================================

* ENTERPRISE CART
* ============================================================
  */

class EnterpriseCart {

constructor(config={}){

this.config = {
  ...DEFAULT_CONFIG,
  ...config
};

this.events =
  new EventBus();

this.storage =
  new StorageAdapter(
    this.config.storageKey
  );

this.history =
  new HistoryManager();

this.state =
  new CartState();

this.persist =
  Utils.debounce(
    ()=>this.save(),
    this.config.persistDelay
  );

this.initialize();

}

initialize(){

const existing =
  this.storage.load();

if(existing){

  this.state = existing;

  this.events.emit(
    CART_EVENTS.RESTORE,
    existing
  );
}

this.events.emit(
  CART_EVENTS.INIT,
  this.state
);

}

getItems(){
return [...this.state.items];
}

getItem(id){

return this.state.items
  .find(item=>item.id===id);

}

hasItem(id){

return !!this.getItem(id);

}

count(){

return this.state.items
  .reduce(
    (sum,item)=>
      sum + item.quantity,
    0
  );

}

uniqueCount(){
return this.state.items.length;
}

subtotal(){

return this.state.items
  .reduce(
    (sum,item)=>
      sum +
      (item.price * item.quantity),
    0
  );

}

tax(){

return this.subtotal() *
  this.state.taxRate;

}

shipping(){

return this.state.shippingRate;

}

total(){

return (
  this.subtotal() +
  this.tax() +
  this.shipping()
);

}

add(product, quantity=1){

if(!product){
  return false;
}

this.history.push(
  this.state
);

const existing =
  this.getItem(product.id);

if(existing){

  existing.quantity += quantity;

  existing.updatedAt =
    Utils.now();

  this.events.emit(
    CART_EVENTS.ITEM_INCREMENT,
    existing
  );

}else{

  this.state.items.push(
    new CartItem(
      product,
      quantity
    )
  );

  this.events.emit(
    CART_EVENTS.ADD,
    product
  );
}

this.state.updatedAt =
  Utils.now();

this.persist();

return true;

}

remove(productId){

this.history.push(
  this.state
);

const before =
  this.state.items.length;

this.state.items =
  this.state.items.filter(
    item =>
      item.id !== productId
  );

if(
  before !==
  this.state.items.length
){

  this.events.emit(
    CART_EVENTS.REMOVE,
    { productId }
  );

  this.persist();

  return true;
}

return false;

}

clear(){

this.history.push(
  this.state
);

this.state.items = [];

this.events.emit(
  CART_EVENTS.CLEAR
);

this.persist();

}

save(){

this.storage.save(
  this.state
);

this.events.emit(
  CART_EVENTS.SAVE,
  this.state
);

}

}

window.EnterpriseCart =
EnterpriseCart;

window.CART_EVENTS =
CART_EVENTS;

})(window);
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
/* ==========================================================
   ENTERPRISE CART.JS
   PART C
   Checkout + Customer + Orders + Payments
========================================================== */

/* ==========================================================
   ADDRESS ENTITY
========================================================== */

class Address {

  constructor(data = {}) {

    this.id =
      data.id ||
      crypto.randomUUID();

    this.firstName =
      data.firstName || "";

    this.lastName =
      data.lastName || "";

    this.company =
      data.company || "";

    this.line1 =
      data.line1 || "";

    this.line2 =
      data.line2 || "";

    this.city =
      data.city || "";

    this.state =
      data.state || "";

    this.postalCode =
      data.postalCode || "";

    this.country =
      data.country || "";

    this.phone =
      data.phone || "";

    this.isDefault =
      data.isDefault || false;
  }

  serialize() {
    return {
      ...this
    };
  }
}

/* ==========================================================
   ADDRESS BOOK
========================================================== */

class AddressBook {

  constructor() {
    this.addresses = [];
  }

  add(address) {

    if (
      address.isDefault
    ) {
      this.addresses.forEach(
        a => a.isDefault = false
      );
    }

    this.addresses.push(
      address
    );

    return address;
  }

  remove(addressId) {

    this.addresses =
      this.addresses.filter(
        a => a.id !== addressId
      );
  }

  update(addressId, data) {

    const address =
      this.get(addressId);

    if (!address)
      return null;

    Object.assign(
      address,
      data
    );

    return address;
  }

  get(addressId) {

    return this.addresses.find(
      a => a.id === addressId
    );
  }

  getDefault() {

    return (
      this.addresses.find(
        a => a.isDefault
      ) || null
    );
  }
}

/* ==========================================================
   CUSTOMER PROFILE
========================================================== */

class CustomerProfile {

  constructor(data = {}) {

    this.id =
      data.id ||
      crypto.randomUUID();

    this.email =
      data.email || "";

    this.firstName =
      data.firstName || "";

    this.lastName =
      data.lastName || "";

    this.phone =
      data.phone || "";

    this.loyaltyPoints =
      data.loyaltyPoints || 0;

    this.tags =
      data.tags || [];

    this.addressBook =
      new AddressBook();
  }

  fullName() {

    return `${this.firstName} ${this.lastName}`.trim();
  }
}

/* ==========================================================
   CUSTOMER REPOSITORY
========================================================== */

class CustomerRepository {

  constructor(storage) {

    this.storage =
      storage;

    this.key =
      "enterprise_customers";
  }

  async save(customer) {

    const customers =
      await this.getAll();

    const existing =
      customers.findIndex(
        c => c.id === customer.id
      );

    if (existing > -1) {

      customers[existing] =
        customer;

    } else {

      customers.push(
        customer
      );
    }

    this.storage.set(
      this.key,
      customers
    );

    return customer;
  }

  async getAll() {

    return (
      this.storage.get(
        this.key,
        []
      )
    );
  }

  async findById(id) {

    const customers =
      await this.getAll();

    return customers.find(
      c => c.id === id
    );
  }
}

/* ==========================================================
   PAYMENT TYPES
========================================================== */

const PaymentMethodType =
Object.freeze({

  CARD: "CARD",

  PAYPAL: "PAYPAL",

  APPLE_PAY: "APPLE_PAY",

  GOOGLE_PAY: "GOOGLE_PAY",

  BANK_TRANSFER:
    "BANK_TRANSFER"
});

/* ==========================================================
   PAYMENT REQUEST
========================================================== */

class PaymentRequest {

  constructor(data = {}) {

    this.amount =
      data.amount;

    this.currency =
      data.currency || "USD";

    this.customerId =
      data.customerId;

    this.orderId =
      data.orderId;

    this.metadata =
      data.metadata || {};
  }
}

/* ==========================================================
   PAYMENT RESULT
========================================================== */

class PaymentResult {

  constructor(data = {}) {

    this.success =
      data.success;

    this.transactionId =
      data.transactionId;

    this.status =
      data.status;

    this.message =
      data.message || "";

    this.raw =
      data.raw || null;
  }
}

/* ==========================================================
   PAYMENT GATEWAY BASE
========================================================== */

class PaymentGateway {

  constructor(name) {

    this.name = name;
  }

  async authorize() {

    throw new Error(
      "NOT_IMPLEMENTED"
    );
  }

  async capture() {

    throw new Error(
      "NOT_IMPLEMENTED"
    );
  }

  async refund() {

    throw new Error(
      "NOT_IMPLEMENTED"
    );
  }
}

/* ==========================================================
   STRIPE ADAPTER
========================================================== */

class StripeGateway
extends PaymentGateway {

  constructor(config) {

    super("STRIPE");

    this.config = config;
  }

  async authorize(request) {

    return new PaymentResult({

      success: true,

      transactionId:
        crypto.randomUUID(),

      status:
        "AUTHORIZED",

      raw: request
    });
  }

  async capture(
    transactionId
  ) {

    return new PaymentResult({

      success: true,

      transactionId,

      status:
        "CAPTURED"
    });
  }
}

/* ==========================================================
   PAYPAL ADAPTER
========================================================== */

class PaypalGateway
extends PaymentGateway {

  constructor(config) {

    super("PAYPAL");

    this.config = config;
  }

  async authorize(request) {

    return new PaymentResult({

      success: true,

      transactionId:
        crypto.randomUUID(),

      status:
        "AUTHORIZED",

      raw: request
    });
  }
}

/* ==========================================================
   PAYMENT REGISTRY
========================================================== */

class PaymentGatewayRegistry {

  constructor() {

    this.gateways =
      new Map();
  }

  register(
    name,
    gateway
  ) {

    this.gateways.set(
      name,
      gateway
    );
  }

  get(name) {

    return this.gateways.get(
      name
    );
  }
}

/* ==========================================================
   FRAUD SERVICE
========================================================== */

class FraudService {

  async score(order) {

    let score = 0;

    if (
      order.total > 500
    ) {
      score += 15;
    }

    if (
      order.items.length > 20
    ) {
      score += 10;
    }

    if (
      !order.customerEmail
    ) {
      score += 30;
    }

    return {

      score,

      risk:
        score > 40
          ? "HIGH"
          : score > 20
          ? "MEDIUM"
          : "LOW"
    };
  }
}

/* ==========================================================
   ORDER STATUS
========================================================== */

const OrderStatus =
Object.freeze({

  PENDING:
    "PENDING",

  AUTHORIZED:
    "AUTHORIZED",

  PROCESSING:
    "PROCESSING",

  FULFILLED:
    "FULFILLED",

  CANCELLED:
    "CANCELLED",

  REFUNDED:
    "REFUNDED"
});

/* ==========================================================
   ORDER ENTITY
========================================================== */

class Order {

  constructor(data = {}) {

    this.id =
      data.id ||
      crypto.randomUUID();

    this.number =
      data.number ||
      Order.generateNumber();

    this.customerId =
      data.customerId;

    this.customerEmail =
      data.customerEmail;

    this.items =
      data.items || [];

    this.subtotal =
      data.subtotal || 0;

    this.discount =
      data.discount || 0;

    this.shipping =
      data.shipping || 0;

    this.tax =
      data.tax || 0;

    this.total =
      data.total || 0;

    this.status =
      data.status ||
      OrderStatus.PENDING;

    this.createdAt =
      Date.now();
  }

  static generateNumber() {

    return (
      "ORD-" +
      Date.now() +
      "-" +
      Math.floor(
        Math.random() *
        10000
      )
    );
  }
}

/* ==========================================================
   ORDER REPOSITORY
========================================================== */

class OrderRepository {

  constructor(storage) {

    this.storage =
      storage;

    this.key =
      "enterprise_orders";
  }

  async create(order) {

    const orders =
      this.storage.get(
        this.key,
        []
      );

    orders.push(order);

    this.storage.set(
      this.key,
      orders
    );

    return order;
  }

  async get(id) {

    const orders =
      this.storage.get(
        this.key,
        []
      );

    return orders.find(
      o => o.id === id
    );
  }

  async all() {

    return this.storage.get(
      this.key,
      []
    );
  }
}

/* ==========================================================
   ORDER FACTORY
========================================================== */

class OrderFactory {

  static fromCart(
    cart,
    totals,
    customer
  ) {

    return new Order({

      customerId:
        customer?.id,

      customerEmail:
        customer?.email,

      items:
        Array.from(
          cart.items.values()
        ),

      subtotal:
        totals.subtotal,

      discount:
        totals.discount,

      shipping:
        totals.shipping.cost,

      tax:
        totals.tax,

      total:
        totals.total
    });
  }
}

/* ==========================================================
   CHECKOUT SESSION
========================================================== */

class CheckoutSession {

  constructor() {

    this.id =
      crypto.randomUUID();

    this.customer =
      null;

    this.billingAddress =
      null;

    this.shippingAddress =
      null;

    this.paymentMethod =
      null;

    this.promoCode =
      null;

    this.currency =
      "USD";

    this.createdAt =
      Date.now();
  }
}

/* ==========================================================
   CHECKOUT SERVICE
========================================================== */

class CheckoutService {

  constructor({

    cart,

    calculator,

    fraudService,

    orderRepository,

    gatewayRegistry,

    inventoryService,

    eventBus

  }) {

    this.cart = cart;

    this.calculator =
      calculator;

    this.fraudService =
      fraudService;

    this.orderRepository =
      orderRepository;

    this.gatewayRegistry =
      gatewayRegistry;

    this.inventoryService =
      inventoryService;

    this.eventBus =
      eventBus;
  }

  async placeOrder({

    customer,

    paymentGateway,

    promoCode

  }) {

    const totals =
      this.calculator
      .calculate({

        cart: this.cart,

        promoCode

      });

    const order =
      OrderFactory
      .fromCart(
        this.cart,
        totals,
        customer
      );

    const fraud =
      await this.fraudService
      .score(order);

    if (
      fraud.risk === "HIGH"
    ) {

      throw new Error(
        "FRAUD_RISK_TOO_HIGH"
      );
    }

    const gateway =
      this.gatewayRegistry.get(
        paymentGateway
      );

    if (!gateway) {

      throw new Error(
        "PAYMENT_GATEWAY_NOT_FOUND"
      );
    }

    const payment =
      await gateway.authorize(
        new PaymentRequest({

          amount:
            totals.total,

          customerId:
            customer.id,

          orderId:
            order.id
        })
      );

    if (
      !payment.success
    ) {

      throw new Error(
        "PAYMENT_FAILED"
      );
    }

    for (
      const item
      of order.items
    ) {

      await this
        .inventoryService
        .reserveInventory(

          item.productId,

          item.variantId,

          item.quantity
        );
    }

    order.status =
      OrderStatus.AUTHORIZED;

    await this
      .orderRepository
      .create(order);

    this.eventBus.emit(

      "checkout.completed",

      {
        orderId:
          order.id,

        total:
          order.total
      }
    );

    return {

      order,

      payment
    };
  }
}

/* ==========================================================
   ORDER TRACKING SERVICE
========================================================== */

class OrderTrackingService {

  constructor() {

    this.history =
      new Map();
  }

  append(
    orderId,
    status
  ) {

    if (
      !this.history.has(
        orderId
      )
    ) {

      this.history.set(
        orderId,
        []
      );
    }

    this.history
      .get(orderId)
      .push({

        status,

        timestamp:
          Date.now()
      });
  }

  getTimeline(
    orderId
  ) {

    return (
      this.history.get(
        orderId
      ) || []
    );
  }
}

/* ==========================================================
   LOYALTY SERVICE
========================================================== */

class LoyaltyService {

  calculatePoints(
    orderTotal
  ) {

    return Math.floor(
      orderTotal
    );
  }

  reward(
    customer,
    orderTotal
  ) {

    const points =
      this.calculatePoints(
        orderTotal
      );

    customer
      .loyaltyPoints +=
      points;

    return points;
  }
}

/* ==========================================================
   END PART C

   NEXT PART D

   - Cart Drawer UI
   - Virtual DOM Renderer
   - Product Recommendation Engine
   - Search Index
   - Analytics Layer
   - A/B Testing
   - Monitoring
   - Telemetry
   - Performance Optimization
   - Error Tracking
========================================================== */
/* ==========================================================
   ENTERPRISE CART.JS
   PART D
   Analytics + Recommendations + Telemetry + UI Runtime
========================================================== */

/* ==========================================================
   FEATURE FLAG SERVICE
========================================================== */

class FeatureFlagService {

  constructor() {
    this.flags = new Map();
  }

  register(key, value = false) {
    this.flags.set(key, value);
  }

  enable(key) {
    this.flags.set(key, true);
  }

  disable(key) {
    this.flags.set(key, false);
  }

  isEnabled(key) {
    return this.flags.get(key) === true;
  }

  getAll() {
    return Object.fromEntries(this.flags);
  }
}

/* ==========================================================
   EXPERIMENT ENGINE
========================================================== */

class ExperimentEngine {

  constructor() {
    this.experiments = new Map();
  }

  register(config) {

    this.experiments.set(
      config.key,
      config
    );
  }

  getVariant(
    experimentKey,
    userId
  ) {

    const experiment =
      this.experiments.get(
        experimentKey
      );

    if (!experiment) {
      return null;
    }

    const hash =
      this.hash(
        experimentKey +
        userId
      );

    const bucket =
      hash % 100;

    let current = 0;

    for (const variant of experiment.variants) {

      current += variant.weight;

      if (bucket < current) {
        return variant.name;
      }
    }

    return experiment.variants[0].name;
  }

  hash(str) {

    let h = 0;

    for (
      let i = 0;
      i < str.length;
      i++
    ) {
      h =
        ((h << 5) - h) +
        str.charCodeAt(i);

      h |= 0;
    }

    return Math.abs(h);
  }
}

/* ==========================================================
   ANALYTICS EVENT
========================================================== */

class AnalyticsEvent {

  constructor(
    name,
    payload = {}
  ) {

    this.id =
      crypto.randomUUID();

    this.name =
      name;

    this.payload =
      payload;

    this.timestamp =
      Date.now();
  }
}

/* ==========================================================
   ANALYTICS PROVIDER BASE
========================================================== */

class AnalyticsProvider {

  async track() {

    throw new Error(
      "TRACK_NOT_IMPLEMENTED"
    );
  }
}

/* ==========================================================
   CONSOLE ANALYTICS
========================================================== */

class ConsoleAnalyticsProvider
extends AnalyticsProvider {

  async track(event) {

    console.log(
      "[Analytics]",
      event
    );

    return true;
  }
}

/* ==========================================================
   ANALYTICS MANAGER
========================================================== */

class AnalyticsManager {

  constructor() {

    this.providers = [];
  }

  register(provider) {

    this.providers.push(
      provider
    );
  }

  async track(
    name,
    payload = {}
  ) {

    const event =
      new AnalyticsEvent(
        name,
        payload
      );

    await Promise.all(

      this.providers.map(
        provider =>
          provider.track(event)
      )
    );
  }
}

/* ==========================================================
   CUSTOMER BEHAVIOR PROFILE
========================================================== */

class CustomerBehaviorProfile {

  constructor(userId) {

    this.userId =
      userId;

    this.views = [];

    this.cartAdds = [];

    this.purchases = [];

    this.categories =
      new Map();
  }

  recordView(product) {

    this.views.push(
      product.id
    );

    this.incrementCategory(
      product.category
    );
  }

  recordCartAdd(product) {

    this.cartAdds.push(
      product.id
    );

    this.incrementCategory(
      product.category
    );
  }

  recordPurchase(product) {

    this.purchases.push(
      product.id
    );

    this.incrementCategory(
      product.category
    );
  }

  incrementCategory(
    category
  ) {

    const count =
      this.categories.get(
        category
      ) || 0;

    this.categories.set(
      category,
      count + 1
    );
  }

  favoriteCategory() {

    let best = null;

    let score = 0;

    for (
      const [category,count]
      of this.categories
    ) {

      if (count > score) {

        score = count;

        best = category;
      }
    }

    return best;
  }
}

/* ==========================================================
   RECOMMENDATION ENGINE
========================================================== */

class RecommendationEngine {

  constructor(products) {

    this.products =
      products || [];
  }

  related(productId) {

    const target =
      this.products.find(
        p => p.id === productId
      );

    if (!target) {
      return [];
    }

    return this.products

      .filter(p =>

        p.id !== target.id &&

        (
          p.category ===
          target.category ||

          p.tags?.some(
            tag =>
              target.tags?.includes(
                tag
              )
          )
        )
      )

      .slice(0, 12);
  }

  personalized(
    behaviorProfile
  ) {

    const category =
      behaviorProfile
      .favoriteCategory();

    if (!category) {
      return [];
    }

    return this.products

      .filter(
        p =>
          p.category ===
          category
      )

      .sort(
        (a,b) =>
          b.sales -
          a.sales
      )

      .slice(0, 12);
  }

  trending() {

    return this.products

      .sort(
        (a,b) =>
          b.sales -
          a.sales
      )

      .slice(0, 20);
  }
}

/* ==========================================================
   SEARCH INDEX
========================================================== */

class ProductSearchIndex {

  constructor() {

    this.index =
      new Map();
  }

  build(products) {

    products.forEach(
      product => {

        const terms = [

          product.title,

          product.category,

          ...(product.tags || [])

        ];

        terms.forEach(term => {

          const normalized =
            term
            .toLowerCase();

          if (
            !this.index.has(
              normalized
            )
          ) {

            this.index.set(
              normalized,
              []
            );
          }

          this.index
            .get(normalized)
            .push(product);
        });
      }
    );
  }

  search(query) {

    query =
      query.toLowerCase();

    const results =
      [];

    for (
      const [key, products]
      of this.index
    ) {

      if (
        key.includes(query)
      ) {

        results.push(
          ...products
        );
      }
    }

    return [

      ...new Map(
        results.map(
          p => [p.id,p]
        )
      ).values()
    ];
  }
}

/* ==========================================================
   PERFORMANCE MONITOR
========================================================== */

class PerformanceMonitor {

  constructor() {

    this.metrics =
      new Map();
  }

  start(label) {

    this.metrics.set(

      label,

      performance.now()
    );
  }

  stop(label) {

    const start =
      this.metrics.get(
        label
      );

    if (!start) {
      return 0;
    }

    const duration =
      performance.now() -
      start;

    this.metrics.delete(
      label
    );

    return duration;
  }
}

/* ==========================================================
   ERROR TRACKER
========================================================== */

class ErrorTracker {

  constructor() {

    this.errors = [];
  }

  capture(error, context = {}) {

    const entry = {

      id:
        crypto.randomUUID(),

      message:
        error.message,

      stack:
        error.stack,

      context,

      timestamp:
        Date.now()
    };

    this.errors.push(
      entry
    );

    console.error(
      "[ErrorTracker]",
      entry
    );

    return entry;
  }
}

/* ==========================================================
   TELEMETRY CLIENT
========================================================== */

class TelemetryClient {

  constructor() {

    this.queue = [];
  }

  enqueue(event) {

    this.queue.push({
      ...event,
      queuedAt:
        Date.now()
    });
  }

  async flush() {

    const payload =
      [...this.queue];

    this.queue = [];

    return payload;
  }
}

/* ==========================================================
   CART VIEW MODEL
========================================================== */

class CartViewModel {

  constructor(cart) {

    this.cart =
      cart;
  }

  get items() {

    return Array.from(
      this.cart.items.values()
    );
  }

  get count() {

    return this.items.reduce(

      (sum,item) =>

      sum + item.quantity,

      0
    );
  }

  get subtotal() {

    return this.items.reduce(

      (sum,item) =>

      sum +
      (
        item.unitPrice *
        item.quantity
      ),

      0
    );
  }
}

/* ==========================================================
   DRAWER UI COMPONENT
========================================================== */

class CartDrawer {

  constructor({
    container,
    viewModel
  }) {

    this.container =
      container;

    this.viewModel =
      viewModel;
  }

  render() {

    const vm =
      this.viewModel;

    this.container.innerHTML = `

      <div class="cart-drawer">

        <header>

          <h2>
            Cart
            (${vm.count})
          </h2>

        </header>

        <section>

          ${vm.items.map(
            item => `

              <div
                class="cart-row"
              >

                <div>
                  ${item.title}
                </div>

                <div>

                  ${item.quantity}
                  ×
                  $${item.unitPrice}

                </div>

              </div>
            `
          ).join("")}

        </section>

        <footer>

          <strong>

            $${vm.subtotal.toFixed(2)}

          </strong>

        </footer>

      </div>
    `;
  }
}

/* ==========================================================
   REALTIME INVENTORY WATCHER
========================================================== */

class InventoryWatcher {

  constructor(
    inventoryService
  ) {

    this.inventoryService =
      inventoryService;

    this.subscribers = [];
  }

  subscribe(fn) {

    this.subscribers.push(
      fn
    );
  }

  notify(data) {

    this.subscribers.forEach(

      fn => fn(data)
    );
  }
}

/* ==========================================================
   SESSION RECOVERY
========================================================== */

class SessionRecoveryService {

  constructor(
    repository
  ) {

    this.repository =
      repository;
  }

  async recover(
    cartId
  ) {

    return this.repository
      .findById(cartId);
  }
}

/* ==========================================================
   CUSTOMER JOURNEY ENGINE
========================================================== */

class CustomerJourneyEngine {

  constructor(
    analytics
  ) {

    this.analytics =
      analytics;
  }

  async pageView(page) {

    await this.analytics.track(

      "page_view",

      { page }
    );
  }

  async productView(product) {

    await this.analytics.track(

      "product_view",

      {
        productId:
          product.id
      }
    );
  }

  async checkoutStart(cart) {

    await this.analytics.track(

      "checkout_start",

      {
        cartId:
          cart.id
      }
    );
  }

  async purchase(order) {

    await this.analytics.track(

      "purchase",

      {
        orderId:
          order.id,

        total:
          order.total
      }
    );
  }
}

/* ==========================================================
   OBSERVABILITY HUB
========================================================== */

class ObservabilityHub {

  constructor() {

    this.analytics =
      new AnalyticsManager();

    this.errors =
      new ErrorTracker();

    this.telemetry =
      new TelemetryClient();

    this.performance =
      new PerformanceMonitor();
  }
}

/* ==========================================================
   APPLICATION BOOTSTRAP
========================================================== */

class EnterpriseCartApplication {

  constructor(config = {}) {

    this.config = config;

    this.flags =
      new FeatureFlagService();

    this.analytics =
      new AnalyticsManager();

    this.telemetry =
      new TelemetryClient();

    this.errors =
      new ErrorTracker();

    this.performance =
      new PerformanceMonitor();

    this.experiments =
      new ExperimentEngine();
  }

  async start() {

    console.log(
      "Enterprise Cart Started"
    );

    return true;
  }
}

/* ==========================================================
   END PART D

   NEXT PART E

   - SSR Hydration
   - Offline Sync Engine
   - WebSocket Cart Sync
   - Multi-Currency Engine
   - Subscription Commerce
   - Marketplace Vendors
   - Inventory Allocation
   - Warehouse Routing
   - OMS Integration
   - ERP Connectors
   - Audit Logging
   - Security Layer
   - Enterprise Admin APIs

   Approximate cumulative size:
   Part A + B + C + D
   ≈ 2,500–3,500 lines
========================================================== */
/* =========================================================
   CART.JS ENTERPRISE EDITION
   PART 3 — Checkout, Payments, Orders, Fraud, Analytics
   Continuation from Part 2
========================================================= */

/* =========================================================
   SECTION 25 — CHECKOUT SESSION MANAGER
========================================================= */

class CheckoutSessionManager {
  constructor(storage, bus) {
    this.storage = storage;
    this.bus = bus;
    this.key = 'checkout_session_v1';
  }

  create(payload = {}) {
    const session = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      expiresAt: Date.now() + (1000 * 60 * 30),
      status: 'active',
      shippingAddress: null,
      billingAddress: null,
      shippingMethod: null,
      paymentMethod: null,
      customer: null,
      ...payload
    };

    this.storage.set(this.key, session);

    this.bus.emit(
      'checkout:session_created',
      session
    );

    return session;
  }

  get() {
    return this.storage.get(this.key, null);
  }

  update(data) {
    const current = this.get();

    if (!current) {
      throw new Error(
        'Checkout session missing'
      );
    }

    const updated = {
      ...current,
      ...data,
      updatedAt: Date.now()
    };

    this.storage.set(
      this.key,
      updated
    );

    this.bus.emit(
      'checkout:session_updated',
      updated
    );

    return updated;
  }

  destroy() {
    localStorage.removeItem(
      this.key
    );

    this.bus.emit(
      'checkout:session_destroyed'
    );
  }

  isExpired() {
    const session = this.get();

    if (!session) return true;

    return (
      Date.now() >
      session.expiresAt
    );
  }
}

/* =========================================================
   SECTION 26 — ADDRESS VALIDATION SERVICE
========================================================= */

class AddressValidator {
  constructor(api) {
    this.api = api;
  }

  async validate(address) {
    try {
      const result =
        await this.api.post(
          '/address/validate',
          address
        );

      return result;

    } catch (error) {
      Logger.error(error);

      return {
        valid: false,
        suggestions: []
      };
    }
  }

  normalize(address) {
    return {
      firstName:
        address.firstName?.trim(),
      lastName:
        address.lastName?.trim(),
      address1:
        address.address1?.trim(),
      address2:
        address.address2?.trim(),
      city:
        address.city?.trim(),
      state:
        address.state?.trim(),
      postalCode:
        address.postalCode?.trim(),
      country:
        address.country?.trim(),
      phone:
        address.phone?.trim()
    };
  }
}

/* =========================================================
   SECTION 27 — PAYMENT BASE CLASS
========================================================= */

class PaymentGateway {
  constructor(config = {}) {
    this.config = config;
  }

  async initialize() {
    throw new Error(
      'initialize() not implemented'
    );
  }

  async authorize() {
    throw new Error(
      'authorize() not implemented'
    );
  }

  async capture() {
    throw new Error(
      'capture() not implemented'
    );
  }

  async refund() {
    throw new Error(
      'refund() not implemented'
    );
  }
}

/* =========================================================
   SECTION 28 — STRIPE GATEWAY
========================================================= */

class StripeGateway
  extends PaymentGateway {

  constructor(config) {
    super(config);
    this.provider = 'stripe';
  }

  async initialize() {
    return {
      ready: true,
      provider: this.provider
    };
  }

  async authorize(order) {
    return {
      success: true,
      provider: this.provider,
      transactionId:
        crypto.randomUUID(),
      amount:
        order.pricing.total
    };
  }

  async capture(transactionId) {
    return {
      success: true,
      transactionId
    };
  }

  async refund(
    transactionId,
    amount
  ) {
    return {
      success: true,
      refunded: amount,
      transactionId
    };
  }
}

/* =========================================================
   SECTION 29 — PAYPAL GATEWAY
========================================================= */

class PayPalGateway
  extends PaymentGateway {

  constructor(config) {
    super(config);
    this.provider = 'paypal';
  }

  async initialize() {
    return {
      ready: true,
      provider: this.provider
    };
  }

  async authorize(order) {
    return {
      success: true,
      provider: this.provider,
      transactionId:
        crypto.randomUUID(),
      amount:
        order.pricing.total
    };
  }

  async capture(transactionId) {
    return {
      success: true,
      transactionId
    };
  }

  async refund(
    transactionId,
    amount
  ) {
    return {
      success: true,
      refunded: amount
    };
  }
}

/* =========================================================
   SECTION 30 — PAYMENT MANAGER
========================================================= */

class PaymentManager {
  constructor(bus) {
    this.bus = bus;
    this.gateways = new Map();
  }

  register(name, gateway) {
    this.gateways.set(
      name,
      gateway
    );
  }

  get(name) {
    return this.gateways.get(
      name
    );
  }

  async process({
    gateway,
    order
  }) {
    const driver =
      this.gateways.get(
        gateway
      );

    if (!driver) {
      throw new Error(
        'Payment gateway not found'
      );
    }

    this.bus.emit(
      'payment:started',
      {
        gateway
      }
    );

    const result =
      await driver.authorize(
        order
      );

    this.bus.emit(
      'payment:completed',
      result
    );

    return result;
  }
}

/* =========================================================
   SECTION 31 — FRAUD DETECTION ENGINE
========================================================= */

class FraudDetectionEngine {
  constructor(config = {}) {
    this.config = config;
  }

  score(order) {
    let score = 0;

    if (
      order.pricing.total >
      1000
    ) {
      score += 25;
    }

    if (
      order.items.length > 15
    ) {
      score += 15;
    }

    if (
      order.customer?.isGuest
    ) {
      score += 5;
    }

    if (
      order.shippingAddress
        ?.country !==
      order.billingAddress
        ?.country
    ) {
      score += 20;
    }

    return {
      score,
      risk:
        score > 50
          ? 'high'
          : score > 20
          ? 'medium'
          : 'low'
    };
  }

  approve(order) {
    const result =
      this.score(order);

    return (
      result.risk !== 'high'
    );
  }
}

/* =========================================================
   SECTION 32 — ORDER FACTORY
========================================================= */

class OrderFactory {
  create({
    cart,
    pricing,
    session
  }) {
    return {
      id: this.generateOrderId(),
      createdAt: Date.now(),
      status: 'pending',
      items:
        structuredClone(
          cart.items
        ),
      pricing,
      customer:
        session.customer,
      shippingAddress:
        session.shippingAddress,
      billingAddress:
        session.billingAddress,
      shippingMethod:
        session.shippingMethod,
      paymentMethod:
        session.paymentMethod
    };
  }

  generateOrderId() {
    return (
      'ORD-' +
      Date.now() +
      '-' +
      Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()
    );
  }
}

/* =========================================================
   SECTION 33 — ORDER REPOSITORY
========================================================= */

class OrderRepository {
  constructor(storage) {
    this.storage = storage;
    this.key = 'orders_v1';
  }

  getAll() {
    return this.storage.get(
      this.key,
      []
    );
  }

  save(order) {
    const orders =
      this.getAll();

    orders.unshift(order);

    this.storage.set(
      this.key,
      orders
    );

    return order;
  }

  update(orderId, patch) {
    const orders =
      this.getAll();

    const index =
      orders.findIndex(
        o => o.id === orderId
      );

    if (index === -1) {
      return null;
    }

    orders[index] = {
      ...orders[index],
      ...patch
    };

    this.storage.set(
      this.key,
      orders
    );

    return orders[index];
  }

  find(orderId) {
    return this.getAll().find(
      o => o.id === orderId
    );
  }
}

/* =========================================================
   SECTION 34 — ORDER SERVICE
========================================================= */

class OrderService {
  constructor({
    repository,
    bus
  }) {
    this.repository =
      repository;

    this.bus = bus;
  }

  create(order) {
    const saved =
      this.repository.save(
        order
      );

    this.bus.emit(
      'order:created',
      saved
    );

    return saved;
  }

  updateStatus(
    orderId,
    status
  ) {
    const updated =
      this.repository.update(
        orderId,
        {
          status,
          updatedAt:
            Date.now()
        }
      );

    if (updated) {
      this.bus.emit(
        'order:status_changed',
        updated
      );
    }

    return updated;
  }

  get(orderId) {
    return this.repository.find(
      orderId
    );
  }
}

/* =========================================================
   SECTION 35 — ANALYTICS ENGINE
========================================================= */

class AnalyticsEngine {
  constructor(api = null) {
    this.api = api;
    this.queue = [];
  }

  track(
    event,
    payload = {}
  ) {
    this.queue.push({
      event,
      payload,
      timestamp:
        Date.now()
    });

    Logger.info(
      '[Analytics]',
      event,
      payload
    );

    if (
      this.queue.length >= 20
    ) {
      this.flush();
    }
  }

  async flush() {
    if (!this.queue.length)
      return;

    const events = [
      ...this.queue
    ];

    this.queue = [];

    try {
      if (this.api) {
        await this.api.post(
          '/analytics',
          {
            events
          }
        );
      }
    } catch (error) {
      Logger.error(error);
    }
  }
}

/* =========================================================
   SECTION 36 — CUSTOMER INSIGHTS
========================================================= */

class CustomerInsights {
  constructor() {
    this.metrics = {
      viewedProducts: 0,
      addedProducts: 0,
      ordersCompleted: 0,
      revenue: 0
    };
  }

  productViewed() {
    this.metrics
      .viewedProducts++;
  }

  productAdded() {
    this.metrics
      .addedProducts++;
  }

  orderCompleted(
    total
  ) {
    this.metrics
      .ordersCompleted++;

    this.metrics.revenue +=
      total;
  }

  snapshot() {
    return structuredClone(
      this.metrics
    );
  }
}

/* =========================================================
   SECTION 37 — RECOMMENDATION ENGINE
========================================================= */

class RecommendationEngine {
  constructor(products = []) {
    this.products =
      products;
  }

  recommend(product) {
    return this.products
      .filter(
        p =>
          p.id !==
          product.id
      )
      .sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        if (
          a.category ===
          product.category
        )
          scoreA += 10;

        if (
          b.category ===
          product.category
        )
          scoreB += 10;

        scoreA +=
          a.sales || 0;

        scoreB +=
          b.sales || 0;

        return (
          scoreB -
          scoreA
        );
      })
      .slice(0, 12);
  }
}

/* =========================================================
   SECTION 38 — CHECKOUT ORCHESTRATOR
========================================================= */

class CheckoutOrchestrator {
  constructor({
    cartStore,
    sessionManager,
    priceCalculator,
    paymentManager,
    orderFactory,
    orderService,
    fraudEngine,
    analytics
  }) {
    Object.assign(
      this,
      arguments[0]
    );
  }

  async checkout() {
    const cart =
      this.cartStore.export();

    const session =
      this.sessionManager.get();

    const pricing =
      this.priceCalculator
        .calculate(cart);

    const order =
      this.orderFactory.create({
        cart,
        pricing,
        session
      });

    const approved =
      this.fraudEngine.approve(
        order
      );

    if (!approved) {
      throw new Error(
        'Fraud review required'
      );
    }

    const payment =
      await this.paymentManager
        .process({
          gateway:
            session.paymentMethod,
          order
        });

    order.payment =
      payment;

    order.status =
      'paid';

    const saved =
      this.orderService.create(
        order
      );

    this.analytics.track(
      'order_completed',
      {
        orderId:
          saved.id,
        total:
          pricing.total
      }
    );

    this.cartStore.clear();

    return saved;
  }
}

/* =========================================================
   SECTION 39 — ORDER TRACKING SERVICE
========================================================= */

class OrderTrackingService {
  constructor(api) {
    this.api = api;
  }

  async track(
    orderId
  ) {
    try {
      return await this.api.get(
        `/orders/${orderId}/tracking`
      );
    } catch {
      return {
        status:
          'processing'
      };
    }
  }
}

/* =========================================================
   SECTION 40 — INVOICE GENERATOR
========================================================= */

class InvoiceGenerator {
  generate(order) {
    return {
      invoiceNumber:
        'INV-' +
        order.id,
      orderId:
        order.id,
      issuedAt:
        new Date()
          .toISOString(),
      total:
        order.pricing.total,
      tax:
        order.pricing.tax
          .amount,
      items:
        order.items
    };
  }
}

/* =========================================================
   SECTION 41 — EXPORTS
========================================================= */

window.CheckoutSessionManager =
  CheckoutSessionManager;

window.AddressValidator =
  AddressValidator;

window.PaymentGateway =
  PaymentGateway;

window.StripeGateway =
  StripeGateway;

window.PayPalGateway =
  PayPalGateway;

window.PaymentManager =
  PaymentManager;

window.FraudDetectionEngine =
  FraudDetectionEngine;

window.OrderFactory =
  OrderFactory;

window.OrderRepository =
  OrderRepository;

window.OrderService =
  OrderService;

window.AnalyticsEngine =
  AnalyticsEngine;

window.CustomerInsights =
  CustomerInsights;

window.RecommendationEngine =
  RecommendationEngine;

window.CheckoutOrchestrator =
  CheckoutOrchestrator;

window.OrderTrackingService =
  OrderTrackingService;

window.InvoiceGenerator =
  InvoiceGenerator;

/* =========================================================
   END OF PART 3

   NEXT:
   PART 4
   - Enterprise Cart UI Controller
   - Virtual DOM Renderer
   - Reactive State Layer
   - Mini Cart
   - Drawer Cart
   - Checkout UI
   - Saved Carts UI
   - Wishlist Sync
   - Customer Dashboard
   - Accessibility Layer
   - Keyboard Navigation
   - Lazy Image System
   - Performance Monitoring
========================================================= */
/* =========================================================
   CART.JS ENTERPRISE EDITION
   PART 4 — Enterprise UI Framework, Reactive Rendering,
   Mini Cart, Drawer Cart, Wishlist Sync, Dashboard,
   Accessibility, Performance Layer
========================================================= */

/* =========================================================
   SECTION 42 — REACTIVE STORE CONNECTOR
========================================================= */

class ReactiveStore {
  constructor(store, bus) {
    this.store = store;
    this.bus = bus;
    this.subscribers = new Set();

    this.initialize();
  }

  initialize() {
    [
      'cart:updated',
      'cart:item_added',
      'cart:item_removed',
      'cart:cleared',
      'wishlist:updated'
    ].forEach(event => {
      this.bus.on(event, payload => {
        this.notify(event, payload);
      });
    });
  }

  subscribe(callback) {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  notify(event, payload) {
    this.subscribers.forEach(fn => {
      try {
        fn({
          event,
          payload,
          state: this.snapshot()
        });
      } catch (err) {
        Logger.error(err);
      }
    });
  }

  snapshot() {
    return {
      cart: this.store.export
        ? this.store.export()
        : null
    };
  }
}

/* =========================================================
   SECTION 43 — DOM CACHE MANAGER
========================================================= */

class DOMCache {
  constructor() {
    this.nodes = new Map();
  }

  get(selector) {
    if (!this.nodes.has(selector)) {
      this.nodes.set(
        selector,
        document.querySelector(selector)
      );
    }

    return this.nodes.get(selector);
  }

  clear() {
    this.nodes.clear();
  }
}

const DOM = new DOMCache();

/* =========================================================
   SECTION 44 — TEMPLATE ENGINE
========================================================= */

class TemplateEngine {
  static interpolate(
    template,
    data = {}
  ) {
    return template.replace(
      /\{\{(.*?)\}\}/g,
      (_, key) =>
        data[key.trim()] ?? ''
    );
  }

  static renderList(
    items,
    renderer
  ) {
    return items
      .map(renderer)
      .join('');
  }
}

/* =========================================================
   SECTION 45 — UI COMPONENT BASE
========================================================= */

class UIComponent {
  constructor(selector) {
    this.el =
      typeof selector === 'string'
        ? document.querySelector(
            selector
          )
        : selector;
  }

  show() {
    if (this.el)
      this.el.hidden = false;
  }

  hide() {
    if (this.el)
      this.el.hidden = true;
  }

  html(content) {
    if (this.el)
      this.el.innerHTML = content;
  }

  text(content) {
    if (this.el)
      this.el.textContent = content;
  }

  destroy() {
    this.el?.remove();
  }
}

/* =========================================================
   SECTION 46 — MINI CART COMPONENT
========================================================= */

class MiniCart extends UIComponent {
  constructor({
    selector,
    cartStore,
    bus
  }) {
    super(selector);

    this.cartStore = cartStore;
    this.bus = bus;

    this.bindEvents();
    this.render();
  }

  bindEvents() {
    [
      'cart:item_added',
      'cart:item_removed',
      'cart:updated',
      'cart:cleared'
    ].forEach(event => {
      this.bus.on(
        event,
        () => this.render()
      );
    });
  }

  render() {
    const cart =
      this.cartStore.export();

    const count =
      cart.items.reduce(
        (sum, item) =>
          sum + item.qty,
        0
      );

    const total =
      cart.items.reduce(
        (sum, item) =>
          sum +
          item.price *
            item.qty,
        0
      );

    this.html(`
      <div class="mini-cart">
        <span class="mini-cart-count">
          ${count}
        </span>
        <span class="mini-cart-total">
          $${total.toFixed(2)}
        </span>
      </div>
    `);
  }
}

/* =========================================================
   SECTION 47 — CART DRAWER
========================================================= */

class CartDrawer extends UIComponent {
  constructor(config) {
    super(config.selector);

    this.store =
      config.cartStore;

    this.bus =
      config.bus;

    this.attach();
  }

  attach() {
    [
      'cart:item_added',
      'cart:item_removed',
      'cart:updated'
    ].forEach(event => {
      this.bus.on(
        event,
        () => this.render()
      );
    });

    this.render();
  }

  open() {
    this.el.classList.add(
      'is-open'
    );
  }

  close() {
    this.el.classList.remove(
      'is-open'
    );
  }

  render() {
    const cart =
      this.store.export();

    const html =
      cart.items
        .map(
          item => `
      <div class="drawer-item">
        <img src="${item.image || ''}">
        <div>
          <strong>
            ${item.title}
          </strong>
          <div>
            ${item.qty}
            ×
            $${item.price}
          </div>
        </div>
      </div>
    `
        )
        .join('');

    this.html(html);
  }
}

/* =========================================================
   SECTION 48 — CART COUNTER
========================================================= */

class CartCounter {
  constructor({
    selector,
    cartStore,
    bus
  }) {
    this.el =
      document.querySelector(
        selector
      );

    this.store =
      cartStore;

    bus.on(
      'cart:updated',
      () =>
        this.render()
    );

    this.render();
  }

  render() {
    const total =
      this.store
        .export()
        .items.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.qty,
          0
        );

    this.el.textContent =
      total;
  }
}

/* =========================================================
   SECTION 49 — WISHLIST SYNCHRONIZER
========================================================= */

class WishlistSynchronizer {
  constructor(
    storage,
    bus
  ) {
    this.storage =
      storage;

    this.bus = bus;

    this.key =
      'wishlist_v2';
  }

  getAll() {
    return this.storage.get(
      this.key,
      []
    );
  }

  add(product) {
    const list =
      this.getAll();

    if (
      list.some(
        p =>
          p.id ===
          product.id
      )
    ) {
      return;
    }

    list.push(product);

    this.storage.set(
      this.key,
      list
    );

    this.bus.emit(
      'wishlist:updated',
      list
    );
  }

  remove(id) {
    const list =
      this.getAll().filter(
        p => p.id !== id
      );

    this.storage.set(
      this.key,
      list
    );

    this.bus.emit(
      'wishlist:updated',
      list
    );
  }
}

/* =========================================================
   SECTION 50 — SAVED CART UI
========================================================= */

class SavedCartUI {
  constructor({
    selector,
    manager
  }) {
    this.el =
      document.querySelector(
        selector
      );

    this.manager =
      manager;

    this.render();
  }

  render() {
    const carts =
      this.manager.getAll();

    this.el.innerHTML =
      carts
        .map(
          cart => `
      <div class="saved-cart">
        <h4>${cart.name}</h4>
        <small>
          ${new Date(
            cart.createdAt
          ).toLocaleString()}
        </small>
      </div>
    `
        )
        .join('');
  }
}

/* =========================================================
   SECTION 51 — CUSTOMER DASHBOARD
========================================================= */

class CustomerDashboard {
  constructor({
    selector,
    orderRepository
  }) {
    this.el =
      document.querySelector(
        selector
      );

    this.orders =
      orderRepository;

    this.render();
  }

  render() {
    const orders =
      this.orders.getAll();

    const revenue =
      orders.reduce(
        (sum, o) =>
          sum +
          o.pricing.total,
        0
      );

    this.el.innerHTML = `
      <div class="dashboard">
        <div>
          Orders:
          ${orders.length}
        </div>
        <div>
          Spend:
          $${revenue.toFixed(
            2
          )}
        </div>
      </div>
    `;
  }
}

/* =========================================================
   SECTION 52 — ACCESSIBILITY MANAGER
========================================================= */

class AccessibilityManager {
  constructor() {
    this.enableFocusTrap();
    this.enableEscClose();
  }

  enableFocusTrap() {
    document.addEventListener(
      'keydown',
      event => {
        if (
          event.key !== 'Tab'
        )
          return;

        const modal =
          document.querySelector(
            '.modal.is-open'
          );

        if (!modal)
          return;

        const focusable =
          modal.querySelectorAll(
            'button,input,select,textarea,a'
          );

        if (
          !focusable.length
        )
          return;

        const first =
          focusable[0];

        const last =
          focusable[
            focusable.length -
              1
          ];

        if (
          event.shiftKey &&
          document.activeElement ===
            first
        ) {
          event.preventDefault();
          last.focus();
        }

        if (
          !event.shiftKey &&
          document.activeElement ===
            last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    );
  }

  enableEscClose() {
    document.addEventListener(
      'keydown',
      e => {
        if (
          e.key === 'Escape'
        ) {
          document
            .querySelectorAll(
              '.modal.is-open'
            )
            .forEach(
              modal =>
                modal.classList.remove(
                  'is-open'
                )
            );
        }
      }
    );
  }
}

/* =========================================================
   SECTION 53 — KEYBOARD SHORTCUTS
========================================================= */

class KeyboardShortcuts {
  constructor() {
    this.bind();
  }

  bind() {
    document.addEventListener(
      'keydown',
      e => {
        if (
          (e.ctrlKey ||
            e.metaKey) &&
          e.key.toLowerCase() ===
            'k'
        ) {
          e.preventDefault();

          document
            .querySelector(
              '#searchInput'
            )
            ?.focus();
        }

        if (
          (e.ctrlKey ||
            e.metaKey) &&
          e.key.toLowerCase() ===
            'b'
        ) {
          e.preventDefault();

          document
            .querySelector(
              '#openCart'
            )
            ?.click();
        }
      }
    );
  }
}

/* =========================================================
   SECTION 54 — IMAGE LAZY LOADER
========================================================= */

class LazyImageLoader {
  constructor() {
    this.observer =
      new IntersectionObserver(
        entries => {
          entries.forEach(
            entry => {
              if (
                entry.isIntersecting
              ) {
                const img =
                  entry.target;

                img.src =
                  img.dataset.src;

                this.observer.unobserve(
                  img
                );
              }
            }
          );
        }
      );
  }

  observe(img) {
    this.observer.observe(
      img
    );
  }
}

/* =========================================================
   SECTION 55 — PERFORMANCE MONITOR
========================================================= */

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
  }

  start(name) {
    this.metrics[name] =
      performance.now();
  }

  end(name) {
    if (
      !this.metrics[name]
    )
      return;

    const duration =
      performance.now() -
      this.metrics[name];

    Logger.info(
      `[Performance] ${name}`,
      duration.toFixed(2) +
        'ms'
    );

    delete this.metrics[
      name
    ];

    return duration;
  }
}

/* =========================================================
   SECTION 56 — TOAST NOTIFICATION SYSTEM
========================================================= */

class ToastManager {
  constructor() {
    this.container =
      document.createElement(
        'div'
      );

    this.container.className =
      'toast-container';

    document.body.appendChild(
      this.container
    );
  }

  show(
    message,
    type = 'info'
  ) {
    const toast =
      document.createElement(
        'div'
      );

    toast.className =
      `toast toast-${type}`;

    toast.textContent =
      message;

    this.container.appendChild(
      toast
    );

    setTimeout(() => {
      toast.remove();
    }, 3500);
  }
}

/* =========================================================
   SECTION 57 — GLOBAL UI CONTROLLER
========================================================= */

class EnterpriseUIController {
  constructor(config) {
    Object.assign(
      this,
      config
    );

    this.initialize();
  }

  initialize() {
    Logger.info(
      'Enterprise UI initialized'
    );

    this.performance.start(
      'ui_boot'
    );

    this.accessibility =
      new AccessibilityManager();

    this.shortcuts =
      new KeyboardShortcuts();

    this.performance.end(
      'ui_boot'
    );
  }
}

/* =========================================================
   SECTION 58 — APPLICATION BOOTSTRAPPER
========================================================= */

class EnterpriseCartApplication {
  constructor(config) {
    this.config =
      config;
  }

  boot() {
    Logger.info(
      'Enterprise Cart Booting...'
    );

    this.performance =
      new PerformanceMonitor();

    this.performance.start(
      'application_boot'
    );

    this.ui =
      new EnterpriseUIController(
        {
          performance:
            this.performance
        }
      );

    this.performance.end(
      'application_boot'
    );

    Logger.info(
      'Enterprise Cart Ready'
    );
  }
}

/* =========================================================
   SECTION 59 — GLOBAL EXPORTS
========================================================= */

window.ReactiveStore =
  ReactiveStore;

window.DOMCache =
  DOMCache;

window.TemplateEngine =
  TemplateEngine;

window.UIComponent =
  UIComponent;

window.MiniCart =
  MiniCart;

window.CartDrawer =
  CartDrawer;

window.CartCounter =
  CartCounter;

window.WishlistSynchronizer =
  WishlistSynchronizer;

window.SavedCartUI =
  SavedCartUI;

window.CustomerDashboard =
  CustomerDashboard;

window.AccessibilityManager =
  AccessibilityManager;

window.KeyboardShortcuts =
  KeyboardShortcuts;

window.LazyImageLoader =
  LazyImageLoader;

window.PerformanceMonitor =
  PerformanceMonitor;

window.ToastManager =
  ToastManager;

window.EnterpriseUIController =
  EnterpriseUIController;

window.EnterpriseCartApplication =
  EnterpriseCartApplication;

/* =========================================================
   END OF PART 4

   NEXT:
   PART 5 (Final Enterprise Core ~1500+ lines)

   - Multi-Currency Engine
   - Internationalization (i18n)
   - Advanced Inventory Reservation
   - Real-Time WebSocket Cart Sync
   - Offline Cart Queue
   - Service Worker Integration
   - Audit Logs
   - Security Layer (CSRF/XSS)
   - Rate Limiting
   - Enterprise Reporting
   - Admin Cart Dashboard
   - A/B Testing Framework
   - AI Product Recommendation Engine
   - Event Sourcing
   - Disaster Recovery
   - Monitoring & Health Checks
   - Plugin Architecture
   - Enterprise Bootstrap Kernel
========================================================= */
