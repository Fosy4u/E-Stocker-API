"use strict";
const mongoose = require("mongoose");
const timestamp = require("mongoose-timestamp");

const SocialSchema = new mongoose.Schema({
    twitter: String,
    facebook: String,
    instagram: String,
    website: String,
  });

const OrganisationContactSchema = new mongoose.Schema({
  organisationId: { type: String, required: true },
  contactType: { type: String, required: true },
  salutation: { type: String, required: false },
  status: { type: String, default:'active' },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  gender: { type: String, required: false },
  companyName: { type: String, required: false },
  email: { type: String, required: false },
  phoneNo: { type: String, required: false },
  address: { type: String, required: false },
  city: { type: String, required: false },
  country: { type: String, required: false },
  Region: { type: String, required: false },
  PostCode: { type: String, required: false },
  Remark: { type: String, required: false },
  localGovernmentArea: { type: String, required: false },
  createdBy: { type: String, required: true },
  customerType: { type: String, required: false },
  customerGroups: { type: [String], required: false },
  enableCustomerPortal: { type: Boolean, default: false },
  social: SocialSchema,
  logs: [
    {
      date: Date,
      user: String,
      userId: String,
      action: String,
      details: String,
      comment: String,
      difference: [{ _id: false, field: String, old: String, new: String }],
      reason: String,
      customerPortal: { type: Boolean, default: false },
    },
  ],
});

OrganisationContactSchema.plugin(timestamp);

const OrganisationContactModel = mongoose.model(
  "organisationContact",
  OrganisationContactSchema,
  "organisationContact"
);

module.exports = OrganisationContactModel;
