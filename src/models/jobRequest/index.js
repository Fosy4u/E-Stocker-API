"use strict";
const mongoose = require("mongoose");
const timestamp = require("mongoose-timestamp");

const JobRequestSchema = new mongoose.Schema({
  organisationId: { type: String, required: true },
  requestId: { type: String, required: true, unique: true },
  disabled: { type: Boolean, default: false },
  customer: { type: String, required: true },
  weight: { type: String, required: true },
  truckType: { type: String, required: true },
  pickUpDate: { type: String, required: true },
  pickUpAddress: { type: String, required: true },
  dropOffAddress: { type: String, required: true },
  price: { type: Number, required: true },
  status: { type: String, default: "pending" },
});

JobRequestSchema.plugin(timestamp);

const JobRequestModel = mongoose.model(
  "jobRequest",
  JobRequestSchema,
  "jobRequest"
);

module.exports = JobRequestModel;
