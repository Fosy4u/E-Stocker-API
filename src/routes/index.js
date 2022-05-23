const express = require("express");
const router = express.Router();
const homeResolver = require("../resolvers/home");
const uploadController = require("../resolvers/upload");
const pictureController = require("../resolvers/uploadImages");
const productsResolver = require("../resolvers/product");
const tagsResolver = require("../resolvers/tags");
const firbaseResolver = require("../resolvers/firebaseImageUpload");
const uploadImage = require("../middleware/uploadImage");


let routes = (app) => {
  router.get("/", homeResolver.getHome);
  router.get("/products", productsResolver.getProducts);
  router.get("/product", productsResolver.getOneProduct);
  router.post("/product/create",uploadImage, productsResolver.createProduct);
  router.post("/product/createBulkProduct", productsResolver.createBulkProduct);
  router.delete("/product/deleteProduct", productsResolver.deleteProduct);
  router.put("/product/editProduct", productsResolver.editProduct);
  router.get(
    "/product/download/template",
    productsResolver.downloadProductTemplate
  );
  router.get("/tags", tagsResolver.getTags);
  router.post("/tags/create", tagsResolver.createProductTag);
  router.delete("/tags/delete", tagsResolver.deleteTag);


  // router.post("/upload", uploadController.uploadFiles);
  router.get("/products/template", uploadController.getProductTemplate);
  router.get("/download", uploadController.download);

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
