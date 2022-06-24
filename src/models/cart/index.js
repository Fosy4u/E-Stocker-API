"use strict";
const mongoose = require("mongoose");
const timestamp = require("mongoose-timestamp");
//const mongooseLogs = require('mongoose-activitylogs');

const CartSchema = new mongoose.Schema(
  {
    cart: { type: String },
    priceList: { type: String },
    cartList: { type: String },
    customerId: { type: String },
    organisationId: { type: String, required: true },
    products: { type: String, required: true },
    status: { type: String, required: true },
    user: { type: String, required: true },
  },

  { timestamps: true }
);

const CartModel = mongoose.model("cart", CartSchema, "cart");

module.exports = CartModel;
