"use strict";
const mongoose = require("mongoose");
const timestamp = require("mongoose-timestamp");

const ProductSchema = new mongoose.Schema(
  {
    // productCode: {
    //   code: { type: String, required: true },
    //   expiryDate: { type: String, required: false },
    //   startExpiryReminderDate: { type: String, required: false },
    // },
    productCode: { type: String, required: true },
    organisationId: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    costPrice: { type: Number, required: false },
    sellingPrice: { type: Number, required: false },
    unitCostPrice: { type: Number, required: false },
    unitSellingPrice: { type: Number, required: false },
    quantity: { type: Number, required: false },
    vat: { type: Boolean, required: true, default: "false" },
    unit: { type: String, required: false },
    businessLine: { type: String, required: false },
    brand: { type: String, required: false },
    manufacturer: { type: String, required: false },
    branch: { type: String, required: false },
    type: { type: String, required: true },
    description: { type: String, required: false },
    weight: { type: String, required: false },
    //  imageUrl: { type: String, required: false },
    imageUrl: {
      link: { type: String, required: false },
      name: { type: String, required: false },
    },
  },
  { timestamps: true }
);

const ProductModel = mongoose.model("products", ProductSchema, "products");

module.exports = ProductModel;
