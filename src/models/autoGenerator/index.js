"use strict";
const mongoose = require("mongoose");
const timestamp = require("mongoose-timestamp");
//const mongooseLogs = require('mongoose-activitylogs');

const AutoGeneratorSchema = new mongoose.Schema(
  {
    organisationId: { type: String, required: true },
    invoicePrefix: { type: String, default: "INV-" },
    invoiceDuePolicy: {
      type: [new mongoose.Schema({}, { versionKey: false, strict: false })],
      // type: Array,
      default: [
        {
          name: "Due Today",
          value: 0,
          core: true,
          default: true,
        },
        {
          name: "Due End of month",
          value: 1,
          core: true,
          default: false,
        },
        {
          name: "Due End of Next month",
          value: 2,
          core: true,
          default: false,
        },
        {
          name: "Due End of Next 2 months",
          value: 3,
          core: true,
          default: false,
        },
        {
          name: "Next 10 Days",
          value: 10,
          core: false,
          default: false,
        },
        {
          name: "Next 20 Days",
          value: 20,
          core: false,
          default: false,
        },
        {
          name: "Next 30 Days",
          value: 30,
          core: false,
          default: false,
        },
        {
          name: "Next 40 Days",
          value: 40,
          core: false,
          default: false,
        },
      ],
    },

    receiptPrefix: { type: String, default: "REC-" },
    nextAutoInvoiceNo: { type: Number, default: "0001" },
    nextAutoReceiptNo: { type: Number, default: "0001" },
  },
  { timestamps: true }
);

const AutoGeneratorModel = mongoose.model(
  "autoGenerator",
  AutoGeneratorSchema,
  "autoGenerator"
);

module.exports = AutoGeneratorModel;
