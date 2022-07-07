"use strict";
const mongoose = require("mongoose");
const timestamp = require("mongoose-timestamp");
//const mongooseLogs = require('mongoose-activitylogs');

const SummarySchema = new mongoose.Schema(
  {
    vat: { type: Boolean, required: false },
    discount: { type: Number, required: false },
    finalPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    productId: { type: String, required: true },
    name: { type: String, required: true },
    productCode: { type: String, required: true },
    saleRemark: { type: String, required: false },
    imageUrl: { type: String, required: false },
  },
  { _id: false }
);

const SaleSchema = new mongoose.Schema(
  {
    customerId: { type: String },
    summary: { type: Map, of: SummarySchema, required: true },
    currency: { type: String },
    organisationId: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    salesDate: { type: String, required: true },
    totalSellingPrice: { type: String, required: true },
    salesNote: { type: String },
    inVoiceId: { type: String },
    invoiceNo: { type: String },
    receiptId: { type: String },
    receiptNo: { type: String },
    balance: { type: String },
    amountPaid: { type: String },
    customerNote: { type: String },
    bankTransactionReference: { type: String },
    status: { type: String, default: "active" },
    customerDetail: {
      firstName: { type: String, required: false },
      lastName: { type: String, required: false },
      email: { type: String, required: false },
      phoneNo: { type: String, required: false },
      address: { type: String, required: false },
      salutation: { type: String, required: false },
    },
    organisation: {
      name: { type: String, required: true },
      imageUrl: {
        link: { type: String, required: false },
        name: { type: String, required: false },
      },
    },
    organisationId: { type: String, required: true },
    branch: {
      name: { type: String, required: false },
      address: { type: String, required: false },
      email: { type: String, required: false },
      phoneNo: { type: String, required: false },
      branchId: { type: String, required: false },
    },
    bankDetails: {
      bankName: { type: String, required: false },
      address: { type: String, required: false },
      accountName: { type: String, required: false },
      accountNo: { type: String, required: false },
    },
    salesPerson: { type: String, required: true },
  },

  { timestamps: true }
);

const SaleModel = mongoose.model("sale", SaleSchema, "sale");

module.exports = SaleModel;
