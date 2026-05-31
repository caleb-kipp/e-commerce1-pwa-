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
