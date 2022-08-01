const express = require("express");
const router = express.Router();
const homeResolver = require("../resolvers/home");
const uploadController = require("../resolvers/upload");
const pictureController = require("../resolvers/uploadImages");
const productsResolver = require("../resolvers/product");
const deletedProductsResolver = require("../resolvers/deletedProducts");
const cartResolver = require("../resolvers/cart");
const saleResolver = require("../resolvers/sales");
const invoiceResolver = require("../resolvers/invoice");
const receiptResolver = require("../resolvers/receipt");
const organisationUsersResolver = require("../resolvers/organisationUsers");
const organisationProfileResolver = require("../resolvers/organisationProfile");
const organisationContactResolver = require("../resolvers/organisationContact");
const OrganisationBranchResolver = require("../resolvers/organisationBranch");
const autoGeneratorResolver = require("../resolvers/autoGenerator");
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

  router.get("/sales", authMiddleware, saleResolver.getAllSales);
  router.get("/sale", authMiddleware, saleResolver.getSale);
  router.post("/sale/create", authMiddleware, saleResolver.createSale);
  router.delete("/sale/delete", authMiddleware, saleResolver.deleteSale);
  router.put("/sale/edit", authMiddleware, saleResolver.editSale);

  router.get("/invoices", authMiddleware, invoiceResolver.getAllInvoice);
  router.get("/invoice", authMiddleware, invoiceResolver.getInvoice);
  router.post("/invoice/create", authMiddleware, invoiceResolver.createInvoice);
  router.delete(
    "/invoice/delete",
    authMiddleware,
    invoiceResolver.deleteInvoice
  );
  router.put("/invoice/edit", authMiddleware, invoiceResolver.editInvoice);
  router.put(
    "/invoice/validate/invoiceno",
    authMiddleware,
    invoiceResolver.validateInvoiceNo
  );

  router.get(
    "/autogenerator/invoice",
    authMiddleware,
    autoGeneratorResolver.getNewInvoiceNo
  );




  router.put(
    "/receipt/validate/receiptno",
    authMiddleware,
    receiptResolver.validateReceiptNo
  );




  router.get(
    "/autogenerator/currentconfig",
    authMiddleware,
    autoGeneratorResolver.getCurrentConfig
  );
  router.put(
    "/autogenerator/updateconfig",
    authMiddleware,
    autoGeneratorResolver.updateAutoGenerator
  );
  router.put(
    "/autogenerator/setDefaultInvoicePolicy",
    authMiddleware,
    autoGeneratorResolver.setDefaultInvoicePolicy
  );
  router.put(
    "/autogenerator/deleteInvoicePolicy",
    authMiddleware,
    autoGeneratorResolver.deleteInvoicePolicy
  );
  router.put(
    "/autogenerator/updateInvoicePolicy",
    authMiddleware,
    autoGeneratorResolver.updateInvoicePolicy
  );

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
  router.get(
    "/organisationContact/Contact",
    authMiddleware,
    organisationContactResolver.getOrganisationContact
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
