"use strict";
const mongoose = require("mongoose");
const timestamp = require("mongoose-timestamp");
//const mongooseLogs = require('mongoose-activitylogs');

const AutoGeneratorSchema = new mongoose.Schema(
  {
    organisationId: { type: String, required: true },
    lastAutoInvoiceNo: { type: Number, default: 0 },
    lastAutoRecieptNo: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const AutoGeneratorModel = mongoose.model(
  "autoGenerator",
  AutoGeneratorSchema,
  "autoGenerator"
);

module.exports = AutoGeneratorModel;
