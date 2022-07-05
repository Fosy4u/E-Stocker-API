const express = require("express");
const router = express.Router();
const homeResolver = require("../resolvers/home");
const uploadController = require("../resolvers/upload");
const pictureController = require("../resolvers/uploadImages");
const productsResolver = require("../resolvers/product");
const deletedProductsResolver = require("../resolvers/deletedProducts");
const cartResolver = require("../resolvers/cart");
const organisationUsersResolver = require("../resolvers/organisationUsers");
const organisationProfileResolver = require("../resolvers/organisationProfile");
const organisationContactResolver = require("../resolvers/organisationContact");
const tagsResolver = require("../resolvers/tags");
const firbaseResolver = require("../resolvers/firebaseImageUpload");
const uploadImage = require("../middleware/uploadImage");
const authMiddleware = require("../middleware/firebaseUserAuth");

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


router.get("/cart", authMiddleware, cartResolver.getCart);
router.post("/cart/create", authMiddleware, cartResolver.createCart);
router.delete("/cart/delete", authMiddleware, cartResolver.deleteCart);


  router.get("/tags", authMiddleware, tagsResolver.getTags);
  router.post("/tags/create", authMiddleware, tagsResolver.createProductTag);
  router.delete("/tags/delete", authMiddleware, tagsResolver.deleteTag);

  router.get(
    "/products/template",
    authMiddleware,
    uploadController.getProductTemplate
  );
  router.get("/download", authMiddleware, uploadController.download);




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
  router.put(
    "/organisationContact/editContact",
    authMiddleware,
    organisationContactResolver.editOrganisationContact
    
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
