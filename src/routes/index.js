const express = require("express");
const router = express.Router();
const homeResolver = require("../resolvers/home");
const organisationUsersResolver = require("../resolvers/organisationUsers");
const organisationProfileResolver = require("../resolvers/organisationProfile");
const OrganisationBranchResolver = require("../resolvers/organisationBranch");
const uploadImage = require("../middleware/uploadImage");
const authMiddleware = require("../middleware/firebaseUserAuth");
const organisationContactResolver = require("../resolvers/organisationContact");
const truckResolver = require("../resolvers/trucks");
const driverResolver = require("../resolvers/driver");
const organisationpartnerResolver = require("../resolvers/organisationPartner");
const jobRequestResolver = require("../resolvers/jobRequest");

let routes = (app) => {
  router.get("/", homeResolver.getHome);

  //OgranisationProfile
  router.post(
    "/organisationProfile/create",
    organisationProfileResolver.createOrganisationProfile
  );
  router.get(
    "/organisationProfile",
    organisationProfileResolver.getOrganisationProfile
  );
  router.put(
    "/organisation/editOrganisation",
    uploadImage,
    organisationProfileResolver.editOrganisationProfile
  );
  router.delete(
    "/organisation/deletionReason",
    organisationProfileResolver.deleteOrganisationProfileDeletionReason
  );

  router.get(
    "/organisation/bankDetails",
    authMiddleware,
    organisationProfileResolver.getBankDetails
  );
  router.post(
    "/organisation/bankDetails/update",
    authMiddleware,
    organisationProfileResolver.updateBankDetails
  );
  router.put(
    "/organisation/bankDetails/delete",
    authMiddleware,
    organisationProfileResolver.deleteBankDetails
  );

  router.get("/branches", authMiddleware, OrganisationBranchResolver.getBranch);
  router.post(
    "/branches/create",
    authMiddleware,
    OrganisationBranchResolver.createBranch
  );
  router.put(
    "/branch/add",
    authMiddleware,
    OrganisationBranchResolver.addBranch
  );
  router.put(
    "/branch/edit",
    authMiddleware,
    OrganisationBranchResolver.editBranch
  );
  router.put(
    "/branch/delete",
    authMiddleware,
    OrganisationBranchResolver.deleteBranch
  );

  router.get("/user", organisationUsersResolver.getOrganisationUser);

  //Trucks

  router.post("/truck/create", uploadImage, truckResolver.createTruck);
  router.get("/trucks", authMiddleware, truckResolver.getTrucks);
  router.get("/truck", authMiddleware, truckResolver.getTruck);
  router.get("/truck/param", authMiddleware, truckResolver.getTruckByParam);
  router.get("/trucks/partner", authMiddleware, truckResolver.getPartnerTrucks);
  router.put(
    "/truck/edit",
    authMiddleware,
    uploadImage,
    truckResolver.editTruck
  );
  router.put("/truck/delete", authMiddleware, truckResolver.deleteTruck);
  router.put("/truck/restore", authMiddleware, truckResolver.restoreTruck);
  router.put(
    "/truck/assignTruckDriver",
    authMiddleware,
    truckResolver.assignTruckDriver
  );
  router.put(
    "/truck/assignTruckPartner",
    authMiddleware,
    truckResolver.assignPartnerTruck
  );
  router.put(
    "/truck/removeTruckPartner",
    authMiddleware,
    truckResolver.removePartnerTruck
  );
  router.put("/truck/activate", authMiddleware, truckResolver.activateTruck);
  router.put(
    "/truck/uploadTruckDoc",
    authMiddleware,
    uploadImage,
    truckResolver.uploadTruckDoc
  );

  //Driver
  router.post("/driver/create", uploadImage, driverResolver.createDriver);
  router.get("/drivers", authMiddleware, driverResolver.getDrivers);
  router.get("/driver", authMiddleware, driverResolver.getDriver);
  router.get("/driver/param", authMiddleware, driverResolver.getDriverByParam);
  router.put(
    "/driver/edit",
    authMiddleware,
    uploadImage,
    driverResolver.editDriver
  );
  router.put("/driver/activate", authMiddleware, driverResolver.activateDriver);
  router.put("/driver/delete", authMiddleware, driverResolver.deleteDriver);
  router.put("/driver/restore", authMiddleware, driverResolver.restoreDriver);
  router.put(
    "/driver/uploadDriverDoc",
    authMiddleware,
    uploadImage,
    driverResolver.uploadDriverDoc
  );

  //jobRequest
  router.post("/jobRequest/create", jobRequestResolver.createJobRequest);
  router.get("/jobRequests", authMiddleware, jobRequestResolver.getJobRequests);
  router.get("/jobRequest", authMiddleware, jobRequestResolver.getJobRequest);
  router.put(
    "/jobRequest/edit",
    authMiddleware,
    jobRequestResolver.editJobRequest
  );
  router.put(
    "/jobRequest/deleteRestore",
    authMiddleware,
    jobRequestResolver.deleteAndRestoreJobRequest
  );

  //OrganisationPartner
  router.post(
    "/organisationPartner/create",
    authMiddleware,
    uploadImage,
    organisationpartnerResolver.createOrganisationPartner
  );
  router.get(
    "/organisationPartners",
    authMiddleware,
    organisationpartnerResolver.getAllOrganisationPartners
  );
  router.get(
    "/organisationPartner",
    authMiddleware,
    organisationpartnerResolver.getOrganisationPartner
  );
  router.get(
    "/organisationPartner/validate",
    authMiddleware,
    organisationpartnerResolver.validateOrganisationPartner
  );
  router.get(
    "/organisationPartner/remarks",
    authMiddleware,
    organisationpartnerResolver.getOrganisationPartnerRemarks
  );
  router.get(
    "/organisationPartner/logs",
    authMiddleware,
    organisationpartnerResolver.getOrganisationPartnerLogs
  );
  router.put(
    "/organisationPartner/edit",
    authMiddleware,
    uploadImage,
    organisationpartnerResolver.editOrganisationPartner
  );
  router.put(
    "/organisationPartner/delete",
    authMiddleware,
    organisationpartnerResolver.deleteOrganisationPartner
  );
  router.put(
    "/organisationPartner/restore",
    authMiddleware,
    organisationpartnerResolver.restoreOrganisationPartner
  );
  router.put(
    "/organisationPartner/addRemark",
    authMiddleware,
    organisationpartnerResolver.addOrganisationPartnerRemark
  );
  router.put(
    "/organisationPartner/deleteRemark",
    authMiddleware,
    organisationpartnerResolver.deleteOrganisationPartnerRemark
  );
  router.put(
    "/organisationPartner/editRemark",
    authMiddleware,
    organisationpartnerResolver.editOrganisationPartnerRemark
  );

  //OrganisationContact
  router.post(
    "/organisationContact/create",
    authMiddleware,
    organisationContactResolver.createOrganisationContact
  );
  router.get(
    "/organisationContacts",
    authMiddleware,
    organisationContactResolver.getAllOrganisationContacts
  );
  router.get(
    "/organisationContact/Contact",
    authMiddleware,
    organisationContactResolver.getOrganisationContact
  );
  router.get(
    "/organisationContact/ContactRemark",
    authMiddleware,
    organisationContactResolver.getOrganisationContactRemark
  );
  router.get(
    "/organisationContact/ContactLogs",
    authMiddleware,
    organisationContactResolver.getOrganisationContactLogs
  );
  router.get(
    "/organisationContact/CustomerRanking",
    authMiddleware,
    organisationContactResolver.getOrganisationCustomerRanking
  );
  router.get(
    "/organisationContact/CustomerStatement",
    authMiddleware,
    organisationContactResolver.getCustomerStatement
  );
  router.put(
    "/organisationContact/editContact",
    authMiddleware,
    organisationContactResolver.editOrganisationContact
  );
  router.put(
    "/organisationContact/addRemark",
    authMiddleware,
    organisationContactResolver.addOrganisationContactRemark
  );
  router.put(
    "/organisationContact/deleteRemark",
    authMiddleware,
    organisationContactResolver.deleteOrganisationContactRemark
  );
  router.put(
    "/organisationContact/deleteContact",
    authMiddleware,
    organisationContactResolver.deleteOrganisationContact
  );
  router.put(
    "/organisationContact/restoreContact",
    authMiddleware,
    organisationContactResolver.restoreOrganisationContact
  );

  return app.use("/", router);
};

module.exports = routes;
