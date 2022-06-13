const OrganisationProfileModel = require("../models/organisationProfile");
const OrganisationUserModel = require("../models/organisationUsers");

const { storageRef } = require("../config/firebase"); // reference to our db
const root = require("../../root");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");

//saving image to firebase storage
const addImage = async (req, filename) => {
  let url = {};
  if (filename) {
    const source = path.join(root + "/uploads/" + filename);
    console.log("receiving file");
    await sharp(source)
      .resize(1024, 1024)
      .jpeg({ quality: 90 })
      .toFile(path.resolve(req.file.destination, "resized", filename));
    const storage = await storageRef.upload(
      path.resolve(req.file.destination, "resized", filename),
      {
        public: true,
        destination: `/uploads/e-stocker/${filename}`,
        metadata: {
          firebaseStorageDownloadTokens: uuidv4(),
        },
      }
    );
    url = { link: storage[0].metadata.mediaLink, name: filename };
    return url;
  }
  return url;
};

const getOrganisationProfile = async (req, res) => {
  try {
    console.log("quer", req.query);
    const params = { ...req.query };
    const organisation = await OrganisationProfileModel.find(params);

    if (organisation) {
      console.log(" org found", organisation);
      return res.status(200).send(organisation);
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const createOrganisationProfile = async (req, res) => {
  const { email, firstName, lastName, password, userId } = req.body;
  try {
    const organisation = new OrganisationProfileModel({ ...req.body });
    const newOrganisation = await organisation.save();
    if (newOrganisation) {
      console.log("new org successful", newOrganisation);
      const params = {
        firstName,
        lastName,
        password,
        userId,
        organisationId: newOrganisation._id,
        isAdmin: true,
      };
      const createUser = new OrganisationUserModel({ ...params });
      const newUser = await createUser.save();
      if (newUser) {
        console.log("new user successful", newUser);
        return res.status(200).send([newOrganisation, newUser]);
      }
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const deleteOrganisationProfileDeletionReason = async (req, res) => {
  try {
    console.log("starting edit", req.body);

    const { _id, element } = req.body;
    if (!_id)
      return res.status(400).send({ error: " - no organisation to update" });
    if (!element)
      return res.status(400).send({ error: " - incomplete required fields" });

    const deleteReason = await OrganisationProfileModel.findByIdAndUpdate(
      _id,
      {
        $pull: {
          deletionReasons: element,
        },
      },
      { new: true }
    );
    if (!deleteReason)
      return res.status(400).send({ message: "organisation not updated" });
    console.log("update", deleteReason);
    return res
      .status(200)
      .send({ message: "organisation updated", data: deleteReason });
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const editOrganisationProfile = async (req, res) => {
  try {
    console.log("starting edit", req.body);
    if (!req.body.logoUrl && req.file) {
      const filename = req.file.filename;
      const logoUrl = await addImage(req, filename);
      const {
        _id,
        companyRegNo,
        industry,
        tradingName,
        websiteUrl,
        deletionReason,
      } = req.body;
      if (!_id)
        return res.status(400).send({ error: " - no organisation to update" });
      const social = req.body.social ? JSON.parse(req.body.social) : [];
      const regionalSettings = req.body.regionalSettings
        ? JSON.parse(req.body.regionalSettings)
        : [];
      const update = await OrganisationProfileModel.findByIdAndUpdate(
        _id,

        {
          companyRegNo,
          industry,
          tradingName,
          websiteUrl,
          social,
          regionalSettings,
          logoUrl,
          $push: { deletionReasons: deletionReason },
        },
        { new: true }
      );
      if (!update)
        return res.status(400).send({ error: "organisation not updated" });
      console.log("update", update);
      return res
        .status(200)
        .send({ message: "organisation updated", data: update });
    } else {
      const {
        _id,
        companyRegNo,
        industry,
        tradingName,
        websiteUrl,
        deletionReason,
      } = req.body;
      if (!_id)
        return res.status(400).send({ error: " - no organisation to update" });
      const social = req.body.social ? JSON.parse(req.body.social) : [];
      const regionalSettings = req.body.regionalSettings
        ? JSON.parse(req.body.regionalSettings)
        : [];
      const update = await OrganisationProfileModel.findByIdAndUpdate(
        _id,
        {
          companyRegNo,
          industry,
          tradingName,
          websiteUrl,
          social,
          regionalSettings,
          $push: { deletionReasons: deletionReason },
        },
        { new: true }
      );
      if (!update)
        return res.status(400).send({ message: "organisation not updated" });
      console.log("update", update);
      return res
        .status(200)
        .send({ message: "organisation updated", data: update });
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

module.exports = {
  createOrganisationProfile,
  getOrganisationProfile,
  editOrganisationProfile,
  deleteOrganisationProfileDeletionReason,
};
