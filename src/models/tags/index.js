"use strict";
const mongoose = require("mongoose");
const timestamp = require("mongoose-timestamp");

const TagSchema = new mongoose.Schema(
  {
    address: { type: String, required: false },
    organisationId: { type: String, required: true },
    name: { type: String, required: true },
    contactNo: { type: String, required: false },
    productCode: { type: String, required: true },
    status: { type: String, default: "unused" },
    createdDate: { type: Date, default: "unused" },
  },
  { timestamps: true }
);

const TagModel = mongoose.model("tags", TagSchema, "tags");

module.exports = TagModel;
