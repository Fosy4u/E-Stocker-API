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
  router.get(
    "/sales/deleted",
    authMiddleware,
    saleResolver.getAllDeletedInvoiceAndReceipt
  );
  router.post("/sale/create", authMiddleware, saleResolver.createSale);
  router.put("/sale/delete", authMiddleware, saleResolver.deleteSale);
  router.put("/sale/restore", authMiddleware, saleResolver.restoreSale);
  router.put("/sale/edit", authMiddleware, saleResolver.editSale);
  router.put("/sale/addComment", authMiddleware, saleResolver.addComment);
  router.put("/sale/deleteComment", authMiddleware, saleResolver.deleteComment);

  router.get("/invoices", authMiddleware, invoiceResolver.getAllInvoice);
  router.get("/invoice", authMiddleware, invoiceResolver.getInvoice);
  router.get("/invoice/logs", authMiddleware, invoiceResolver.getInvoiceLogs);
  router.get(
    "/invoice/param",
    authMiddleware,
    invoiceResolver.getInvoiceByParam
  );
  router.get(
    "/invoice/customer",
    authMiddleware,
    invoiceResolver.getCustomerInvoice
  );
  router.get(
    "/invoice/receipt",
    authMiddleware,
    invoiceResolver.getInvoiceReceipts
  );
  router.post("/invoice/create", authMiddleware, invoiceResolver.createInvoice);
  router.delete(
    "/invoice/delete",
    authMiddleware,
    invoiceResolver.deleteInvoice
  );
  router.put("/invoice/edit", authMiddleware, invoiceResolver.editInvoice);
  router.put("/invoice/stamp", authMiddleware, invoiceResolver.stampInvoice);
  router.put(
    "/invoice/validate/invoiceno",
    authMiddleware,
    invoiceResolver.validateInvoiceNo
  );

  router.get("/receipts", authMiddleware, receiptResolver.getAllReceipt);
  router.get("/receipt", authMiddleware, receiptResolver.getReceipt);
  router.get("/receipt/logs", authMiddleware, receiptResolver.getReceiptLogs);
  router.get(
    "/receipt/param",
    authMiddleware,
    receiptResolver.getReceiptByParam
  );
  router.get(
    "/receipt/customer/overpayment",
    authMiddleware,
    receiptResolver.getAllCustomerOverPayment
  );
  router.get(
    "/receipt/linkedInvoices",
    authMiddleware,
    receiptResolver.getReceiptLinkedInvoices
  );
  router.put(
    "/receipt/validate/receiptno",
    authMiddleware,
    receiptResolver.validateReceiptNo
  );
  router.post(
    "/receipt/create/invoiceLinkedPayment",
    authMiddleware,
    receiptResolver.createInvoiceLinkedPayment
  );
  router.put(
    "/receipt/edit/invoiceLinkedPayment",
    authMiddleware,
    receiptResolver.editInvoiceLinkedPayment
  );
  router.put(
    "/receipt/update/invoiceLinkedPayment",
    authMiddleware,
    receiptResolver.updateInvoiceLinkedReceipt
  );

  router.get(
    "/autogenerator/invoice",
    authMiddleware,
    autoGeneratorResolver.getNewInvoiceNo
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
