"use strict";
const mongoose = require("mongoose");
const timestamp = require("mongoose-timestamp");

const SocialSchema = new mongoose.Schema({
  twitter: String,
  linkedIn: String,
  tikTok: String,
  facebook: String,
  instagram: String,
  youtube: String,
});
const RegionalSettings = new mongoose.Schema({
  language: String,
  currency: String,
  timeZone: {
    label: { type: String, required: false },
    name: { type: String, required: false },
    tzCode: { type: String, required: false },
    utc: { type: String, required: false },
  },
  inventoryStartDate: String,
  fiscalYear: {
    fiscalYearDay: { type: String, required: false },
    fiscalYearMonth: { type: String, required: false },
  },
});

const OrganisationProfileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  industry: { type: String, required: false },
  tradingName: { type: String, required: false },
  companyRegNo: { type: String, required: false },
  websiteURL: { type: String, required: false },
  logoUrl: {
    link: { type: String, required: false },
    name: { type: String, required: false },
  },
  contactEmail: { type: String, required: true },
  phoneNo: { type: String, required: true },
  foundedAt: Date,
  country: { type: String, required: true },
  region: { type: String, required: true },
  social: SocialSchema,
  regionalSettings: RegionalSettings,
  active: { type: Boolean, required: true, default: true },
  deletionReasons: {
    type: Array,
    default: [
      "stolen product",
      "product on fire",
      "product written off",
      "damaged product",
      'stock re-evaluation'
    ],
  },
});

OrganisationProfileSchema.plugin(timestamp);

const OrganisationProfileModel = mongoose.model(
  "organisationProfiles",
  OrganisationProfileSchema,
  "organisationProfiles"
);

module.exports = OrganisationProfileModel;
