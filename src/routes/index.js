const express = require("express");
const router = express.Router();
const homeResolver = require("../resolvers/home");
const uploadController = require("../resolvers/upload");
const pictureController = require("../resolvers/uploadImages");
const productsResolver = require("../resolvers/product");
const deletedProductsResolver = require("../resolvers/deletedProducts");
const organisationUsersResolver = require("../resolvers/organisationUsers");
const organisationProfileResolver = require("../resolvers/organisationProfile");
const tagsResolver = require("../resolvers/tags");
const firbaseResolver = require("../resolvers/firebaseImageUpload");
const uploadImage = require("../middleware/uploadImage");
const authMiddleware = require("../middleware/firebaseUserAuth");

let routes = (app) => {
  router.get("/", homeResolver.getHome);

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

  router.get("/user", organisationUsersResolver.getOrganisationUser);

  router.get("/products", authMiddleware, productsResolver.getProducts);
  router.get("/product", authMiddleware, productsResolver.getOneProduct);
  router.get("/gallery", authMiddleware, productsResolver.getGallery);
  router.post(
    "/product/create",
    authMiddleware,
    uploadImage,
    productsResolver.createProduct
  );
  router.post(
    "/product/createBulkProduct",
    authMiddleware,
    productsResolver.createBulkProduct
  );
  router.delete(
    "/product/deleteProduct",
    authMiddleware,
    productsResolver.deleteProduct
  );
  router.put(
    "/product/editProduct",
    authMiddleware,
    uploadImage,
    productsResolver.editProduct
  );
  router.put(
    "/product/cloneProduct",
    authMiddleware,
    uploadImage,
    productsResolver.cloneProduct
  );
  router.get(
    "/product/download/template",
    authMiddleware,
    productsResolver.downloadProductTemplate
  );

  router.get(
    "/deletedProducts",
    authMiddleware,
    deletedProductsResolver.getProducts
  );

  router.get("/tags", authMiddleware, tagsResolver.getTags);
  router.post("/tags/create", authMiddleware, tagsResolver.createProductTag);
  router.delete("/tags/delete", authMiddleware, tagsResolver.deleteTag);

  // router.post("/upload", uploadController.uploadFiles);
  router.get(
    "/products/template",
    authMiddleware,
    uploadController.getProductTemplate
  );
  router.get("/download", authMiddleware, uploadController.download);

  // router.post("/upload", uploadImage.single("file"), async (req, res) => {
  //   try {
  //     console.log("received");
  //     if (req.file === undefined) {
  //       return res.status(400).send({ message: "You must select a file." });
  //     }
  //     // await upload(req, res);
  //     // console.log(req.file);

  //     return res.status(200).send({
  //       message: "File has been uploaded.",
  //     });
  //   } catch (error) {
  //     console.log(error);

  //     if (error.code === "LIMIT_UNEXPECTED_FILE") {
  //       return res.status(400).send({
  //         message: "Too many files to upload.",
  //       });
  //     }
  //     return res.status(500).send({
  //       message: `Error when trying upload file: ${error}`,
  //     });
  //   }
  // });

  return app.use("/", router);
};

module.exports = routes;
