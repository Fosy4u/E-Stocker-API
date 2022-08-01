"use strict";
const mongoose = require("mongoose");
const timestamp = require("mongoose-timestamp");
//const mongooseLogs = require('mongoose-activitylogs');

const SummarySchema = new mongoose.Schema(
  {
    vat: { type: Boolean, required: false },
    discount: { type: Number, required: false },
    finalPrice: { type: Number, required: true },
    semiFinalPrice: { type: Number, required: false },
    newPrice: { type: Number, required: false },
    quantity: { type: Number, required: true },
    productId: { type: String, required: true },
    name: { type: String, required: true },
    productCode: { type: String, required: true },
    salesRemark: { type: String, required: false },
    index: { type: Number, required: true },
  },
  { _id: false }
);

const BankDetailsSchema = new mongoose.Schema(
  {
    bankId: { type: String, required: true },
    bankName: { type: String, required: false },
    address: { type: String, required: false },
    accountName: { type: String, required: false },
    accountNumber: { type: String, required: false },
  },
  { _id: false }
);

const InvoiceSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true },
    summary: { type: Map, of: SummarySchema, required: true },
    currency: { type: String },
    organisation: {
      name: { type: String, required: true },
      logoUrl: {
        link: { type: String, required: false },
        name: { type: String, required: false },
      },
    },
    organisationId: { type: String, required: true },
    sale_id: { type: String, required: true },
    invoiceNo: { type: String, required: true },
    paymentMethod: { type: String, value: "invoice" },
    invoiceDate: { type: String, required: true },
    dueDate: { type: String, required: true },
    branch: {
      name: { type: String, required: false },
      address: { type: String, required: false },
      email: { type: String, required: false },
      phoneNo: { type: String, required: false },
      branchId: { type: String, required: true },
    },
    bankDetails: BankDetailsSchema,
    customerNote: { type: String },
    salesNote: { type: String },
    status: { type: String, required: true },
    customerDetail: {
      firstName: { type: String, required: false },
      lastName: { type: String, required: false },
      email: { type: String, required: false },
      phoneNumber: { type: String, required: false },
      address: { type: String, required: false },
      salutation: { type: String, required: false },
    },

    salesPerson: { type: String, required: true },
    QrCode: { type: String, required: true },
    disable: { type: String, default: "false" },
    deliveryCharge: { type: String, required: true },
    subTotal: { type: String, required: true },
    amountDue: { type: String, default: "true" },
  },

  { timestamps: true }
);

const InvoiceModel = mongoose.model("invoice", InvoiceSchema, "invoice");

module.exports = InvoiceModel;
