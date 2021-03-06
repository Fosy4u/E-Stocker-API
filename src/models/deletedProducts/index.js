"use strict";
const mongoose = require("mongoose");
const timestamp = require("mongoose-timestamp");
//const mongooseLogs = require('mongoose-activitylogs');

const DeletedProductSchema = new mongoose.Schema(
  {
    productCode: { type: String, required: true },
    organisationId: { type: String, required: true },
    name: { type: String, required: true },
    reason: { type: String, required: true },
    deletedBy: { type: String, required: true },
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
    imageUrl: {
      link: { type: String, required: false },
      name: { type: String, required: false },
    },
    logs: [{ date: Date, user: String, details: String }],
    productExpiry: {
      productCode: { type: String, required: false },
      expiryDate: { type: String, required: false },
      startExpiryReminderDate: { type: String, required: false },
    },
  },

  { timestamps: true }
);

const DeletedProductModel = mongoose.model(
  "deletedProducts",
  DeletedProductSchema,
  "deletedProducts"
);

module.exports = DeletedProductModel;
