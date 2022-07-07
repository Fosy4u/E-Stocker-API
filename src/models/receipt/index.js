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
    salesRemark: { type: String, required: false },
  },
  { _id: false }
);

const RecieptSchema = new mongoose.Schema(
  {
    customerId: { type: String },
    summary: { type: Map, of: SummarySchema, required: true },
    currency: { type: String },
    organisation: {
      name: { type: String, required: true },
      imageUrl: {
        link: { type: String, required: false },
        name: { type: String, required: false },
      },
    
    },
    organisationId: { type: String, required: true },
    recieptNo: { type: Number, required: true },
    paymentMethod: { type: String, value: "reciept" },
    recieptDate: { type: String, required: true },
    balance: { type: Number, required: false },
    amountPaid: { type: String },
    branch: {
      name: { type: String, required: false },
      address: { type: String, required: false },
      email: { type: String, required: false },
      phoneNo: { type: String, required: false },
      branchId: { type: String, required: false },
    },
    customerNote: { type: String },
    status: { type: String, default: "active" },
    customerDetail: {
      firstName: { type: String, required: false },
      lastName: { type: String, required: false },
      email: { type: String, required: false },
      phoneNumber: { type: String, required: false },
      address: { type: String, required: false },
      salutation: { type: String, required: false },
    },

    salesPerson: { type: String, required: true },
  },

  { timestamps: true }
);

const RecieptModel = mongoose.model("reciept", RecieptSchema, "reciept");

module.exports = RecieptModel;
