const GridFSBucket = require("mongodb").GridFSBucket;
const ProductModel = require("../models/products");
const TagModel = require("../models/tags");
const { ServerApiVersion } = require("mongodb");
const mongoose = require("mongoose");
var fs = require("fs");
const console = require("console");
const ImageModel = require("../models/images");
const DeletedProductModel = require("../models/deletedProducts");
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

const getProductStatusAndExpiry = async (data, organisationId) => {
  return data.reduce(async (acc, item) => {
    const newItem = { ...item };
    let products = await acc;
    const found = await TagModel.find({
      productCode: item.productCode,
      organisationId,
    });
    if (found) {
      newItem._doc.status = found[0].status;
      newItem._doc.expiryDate = item.productExpiry.expiryDate || "";
      newItem._doc.startExpiryReminderDate =
        item.productExpiry.startExpiryReminderDate || "";
    }
    products.push(newItem._doc);

    return products;
  }, []);
};

const getProducts = async (req, res) => {
  try {
    const organisationId = req.query.organisationId;
    const products = await ProductModel.find({ organisationId });
    if (products) {
      const finalProducts = await getProductStatusAndExpiry(
        products,
        organisationId
      );
      if (finalProducts) {
        return res.status(200).send(finalProducts);
      }

      return res.status(200).send(finalProducts);
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const getOneProduct = async (req, res) => {
  try {
    const { organisationId, _id } = req.query;
    const products = await ProductModel.find({ organisationId, _id });
    if (products) {
      const finalProducts = await getProductStatusAndExpiry(
        products,
        organisationId
      );
      if (finalProducts) {
        return res.status(200).send(finalProducts);
      }

      return res.status(200).send(finalProducts);
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const getGallery = async (req, res) => {
  try {
    const organisationId = req.query.organisationId;
    const gallery = await ProductModel.find({ organisationId }).select(
      "imageUrl"
    );
    if (gallery) {
      return res.status(200).send(gallery);
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const getBulkProductTemplate = async (req, res) => {
  try {
    const products = await ProductModel.find({});
    console.log("data is", products);
    if (products) {
      return res.status(200).send(products);
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const checkExisting = async (productCodes) => {
  const reduce = await productCodes.reduce(async (acc, item) => {
    let exist = await acc;
    const productCode = item;
    const found = await ProductModel.findOne({ productCode: productCode });
    if (found) {
      exist.push(productCode);
    }

    return exist;
  }, []);

  return reduce;
};
const checkUnusedTag = async (productCodes, organisationId) => {
  console.log("starting check");
  const reduce = await productCodes.reduce(async (acc, item) => {
    let invalid = await acc;
    const productCode = item;
    const found = await TagModel.findOne({
      productCode: productCode,
      organisationId,
    });
    if (found.status !== "unused") {
      invalid.push(productCode);
    }

    return invalid;
  }, []);

  console.log("reduce is", reduce);
  return reduce;
};
const validateProductCode = async (productCodes, organisationId) => {
  console.log("validate product code ", organisationId);
  return productCodes.reduce(async (acc, item) => {
    let inValid = await acc;
    const productCode = item;
    const found = await TagModel.find({ productCode: item, organisationId });
    console.log("found", found);
    if (found.length === 0) {
      inValid.push(productCode);
    }
    console.log("reduce is", inValid);
    return inValid;
  }, []);
};
const updateTagStatus = async (newProducts, organisationId, status) => {
  console.log("changing status", newProducts);
  return newProducts.reduce(async (acc, item) => {
    let updatedTags = await acc;
    const productCode = item.productCode;
    const filter = { productCode, organisationId };
    console.log("filter", filter);
    const updatedTagStatus = await TagModel.findOneAndUpdate(
      {
        productCode: productCode,
        organisationId,
      },
      {
        $set: status,
      }
    );
    doc = await TagModel.findOne(filter);
    console.log("updated: ", doc);
    if (updatedTagStatus?.length > 0) {
      updatedTags.push(productCode);
    }
    console.log("reduce", updatedTags);
    return updatedTags;
  }, []);
};
const addExpiryAndSave = (productExpiryList, productCode) => {
  console.log("starting expir", productCode);
  const found = productExpiryList.find(
    (expiry) => expiry.productCode === productCode
  );
  console.log(
    "???? ~ file: product.js ~ line 165 ~ addExpiryAndSave ~ found",
    found
  );
  return found;
};
const saveProduct = async (productCodes, log, productExpiryList, params) => {
  console.log("starting check");
  const save = await productCodes.reduce(async (acc, item) => {
    const createdProducts = await acc;
    const productCode = item;
    const productExpiry = addExpiryAndSave(productExpiryList, productCode);
    console.log("productExpiry", productExpiry);
    const product = new ProductModel({
      ...params,
      productCode,
      productExpiry,
    });
    const newProduct = await product.save();
    if (newProduct) {
      log.action = "created";
      const updateLog = await ProductModel.findByIdAndUpdate(
        newProduct._id,
        // { name, category, price },

        { $push: { logs: log } },
        { new: true }
      );
      console.log(
        "???? ~ file: product.js ~ line 193 ~ returnproductCodes.reduce ~ newProduct",
        newProduct
      );
      createdProducts.push(newProduct);
    }
    return createdProducts;
  }, []);
  console.log("saveeee", save);
  return save;
};

const createProduct = async (req, res) => {
  console.log("creating product");
  console.log("creating product", req.body);
  const {
    type,
    name,
    organisationId,
    costPrice,
    sellingPrice,
    category,
    unitCostPrice,
    unitSellingPrice,
    quantity,
    brand,
    branch,
    manufacturer,
    weight,
    vat,
    unit,
    description,
    businessLine,
  } = req.body;

  const productCodes = JSON.parse(req.body.productCodes);
  const createdProducts = [];
  console.log("prodCode", productCodes);
  try {
    if (!name || !productCodes || !organisationId || !category || !type) {
      return res.status(400).send(`error - incomplete required data`);
    }
    if (
      (type === "Single Product" && !sellingPrice) ||
      (type === "Single Product" && !costPrice) ||
      (type === "Collective Product" && !unitSellingPrice) ||
      (type === "Collective Product" && !unitCostPrice) ||
      (type === "Collective Product" && !quantity)
    ) {
      return res.status(400).send(`error - incomplete required data`);
    }
    const duplicateProducts = await checkExisting(productCodes);
    if (duplicateProducts.length > 0) {
      console.log("found", duplicateProducts);
      return res
        .status(400)
        .send(
          `request failed as the following product ${
            duplicateProducts.length > 1 ? "codes are" : "code is"
          }  existing already. Please change or remove ${
            duplicateProducts.length > 1 ? "them" : "it"
          } from store and redo this request. Product Code : [${duplicateProducts}]`
        );
    }
    const check = await validateProductCode(productCodes, organisationId);
    console.log("invalid isss", check);
    if (check?.length > 0) {
      return res
        .status(400)
        .send(
          `request failed as the following product ${
            duplicateProducts.length > 1 ? "codes are" : "code is"
          }  invalid. Please ensure the product ${
            duplicateProducts.length > 1 ? "codes" : "code"
          } has been generated already before this action.  Product Code : [${check}]`
        );
    }
    const invalidTags = await checkUnusedTag(productCodes, organisationId);
    if (invalidTags.length > 0) {
      console.log("found", invalidTags);
      return res.status(400).send(
        `request failed as the following product ${
          duplicateProducts.length > 1 ? "codes have" : "code has"
        }  been used before by another existing or previously deleted product. 
           Product Code : [${invalidTags}]`
      );
    }
    let imageUrl = {};
    if (req.file) {
      const filename = req.file.filename;
      imageUrl = await addImage(req, filename);
    }
    const productExpiry = req.body.productExpiry
      ? JSON.parse(req.body.productExpiry)
      : [];
    const log = req.body.log && JSON.parse(req.body.log);
    const newProducts = await saveProduct(
      productCodes,
      log,
      productExpiry,
      (params = {
        type,
        name,
        organisationId,
        costPrice,
        sellingPrice,
        category,
        unitCostPrice,
        unitSellingPrice,
        quantity,
        brand,
        branch,
        manufacturer,
        weight,
        businessLine,
        vat,
        unit,
        description,
        imageUrl: imageUrl || "",
      })
    );

    if (newProducts.length > 0) {
      const status = { status: "in-stock" };
      console.log("new products :", newProducts);
      const updateProductStatus = await updateTagStatus(
        newProducts,
        organisationId,
        status
      );
      console.log("updated tag status", updateProductStatus);
      return res.status(200).send(newProducts);
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const saveBulkProduct = async (products) => {
  return products.reduce(async (acc, item) => {
    const createdProducts = await acc;
    const product = new ProductModel(item);
    console.log("item", item);
    const newProduct = await product.save();
    if (newProduct) {
      log.action = "created";
      const updateLog = await ProductModel.findByIdAndUpdate(
        newProduct._id,
        // { name, category, price },

        { $push: { logs: item.log } },
        { new: true }
      );
    }
    console.log("saved");
    createdProducts.push(newProduct);

    return createdProducts;
  }, []);
};
const createBulkProduct = async (req, res) => {
  try {
    let productCodes = [];
    let error = false;

    req.body.map((product) => {
      const {
        type,
        name,
        organisationId,
        costPrice,
        sellingPrice,
        category,
        unitCostPrice,
        unitSellingPrice,
        quantity,
        brand,
        branch,
        manufacturer,
        weight,
        businessLine,
        vat,
        unit,
        description,
        productCode,
        productExpiry,
        log,
      } = product;
      console.log("passed here entrance ", organisationId);
      if (!name || !productCode || !organisationId || !category) {
        error = true;
      }
      if (
        (type === "Single Product" && !sellingPrice) ||
        (type === "Single Product" && !costPrice) ||
        (type === "Collective Product" && !unitSellingPrice) ||
        (type === "Collective Product" && !unitCostPrice) ||
        (type === "Collective Product" && !quantity)
      ) {
        error = true;
      }
    });
    if (error) {
      return res
        .status(400)
        .send(
          `error - incomplete data , please check the imported file and ensure it complies with our template. You can contact us for help`
        );
    }

    req.body.map((product) => {
      productCodes.push(product.productCode);
    });
    const duplicateProducts = await checkExisting(productCodes);
    if (duplicateProducts.length > 0) {
      console.log("found", duplicateProducts);
      return res
        .status(400)
        .send(
          `request failed as the following product ${
            duplicateProducts.length > 1 ? "codes are" : "code is"
          }  existing already. Please change or remove ${
            duplicateProducts.length > 1 ? "them" : "it"
          } from store and redo this request. Product Code : [${duplicateProducts}]`
        );
    }

    const check = await validateProductCode(
      productCodes,
      req.body[0].organisationId
    );
    console.log("invalid isss", check);
    if (check?.length > 0) {
      return res
        .status(400)
        .send(
          `request failed as the following product ${
            duplicateProducts.length > 1 ? "codes are" : "code is"
          }  invalid. Please ensure the product ${
            duplicateProducts.length > 1 ? "codes" : "code"
          } has been generated already before this action.  Product Code : [${check}]`
        );
    }

    const createBulkProduct = await saveBulkProduct(req.body);
    if (createBulkProduct.length > 0) {
      console.log(createBulkProduct, "new products");
      const status = { status: "in-stock" };
      const updateProductStatus = await updateTagStatus(
        createBulkProduct,
        req.body[0].organisationId,
        status
      );
      return res.status(200).send(createBulkProduct);
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const downloadProductTemplate = async (req, res) => {
  console.log("req is ", req.params);
  try {
    const gridfsbucket = new mongoose.mongo.GridFSBucket(
      mongoose.connection.db,
      {
        chunkSizeBytes: 1024,
        bucketName: "fs",
      }
    );
    let downloadStream = gridfsbucket.openDownloadStreamByName(
      "productTemplate.csv"
    );

    downloadStream.on("data", function (data) {
      return res.status(200).write(data);
    });

    downloadStream.on("error", function (err) {
      return res.status(404).send({ message: "Cannot download the Image!" });
    });

    downloadStream.on("end", () => {
      return res.end();
    });
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const validateProduct = async (ids) => {
  const invalidProducts = await ids.reduce(async (acc, item) => {
    let invalid = await acc;
    const id = item;

    const found = await ProductModel.findById(id);

    if (!found) {
      invalid.push(id);
    }

    return invalid;
  }, []);

  return invalidProducts;
};

const deleteProductModel = async (ids, reason, deletedBy) => {
  console.log("starting del");
  return ids.reduce(async (acc, _id) => {
    const result = await acc;
    const existingProduct = await ProductModel.findById(_id);
    const deleted = await ProductModel.findByIdAndRemove(_id);
    // const delteImage = await storageRef
    //   .file("/uploads/e-stocker/" + "2022-05-14T22-48-59.812Z-IMG_E9128.JPG")
    //   .delete();
    // console.log("del is", deleted);
    console.log("id", _id);
    const deletedProduct = { ...existingProduct._doc };
    console.log("deleted prod", deletedProduct);
    if (deletedProduct) {
      delete deletedProduct._id;
      deletedProduct.reason = reason;
      deletedProduct.deletedBy = deletedBy;
      const newDeletedproduct = new DeletedProductModel(deletedProduct);
      const saveDeletedProduct = await newDeletedproduct.save();
    }
    if (deleted?.length === 0) {
      result.push(deleted[0]);
    }

    return result;
  }, []);
};
const deleteProductImageFirebase = async (images) => {
  jsonObject = images.map(JSON.stringify);

  console.log("json Object", jsonObject);

  uniqueSet = new Set(jsonObject);
  uniqueImageArray = Array.from(uniqueSet).map(JSON.parse);

  console.log("starting image del");
  return uniqueImageArray.reduce(async (acc, image) => {
    const result = await acc;
    if (image.name) {
      const inUse = await ProductModel.find({})
        .where("imageUrl.name")
        .equals(image.name);
      if (inUse.length === 0) {
        const deleteImage = await storageRef.file(
          "/uploads/e-stocker/" + image.name
        );
        if (deleteImage) {
          deleteImage.delete().then(() => {
            result.push(image.name);
            console.log("del is", image.name);
          });
        }
      }
    }

    return result;
  }, []);
};

const deleteProduct = async (req, res) => {
  const { ids, productCode, organisationId, images, reason, deletedBy } =
    req.body;
  try {
    const invalidProducts = await validateProduct(ids);
    if (invalidProducts.length > 0) {
      console.log("invalid", invalidProducts);
      return res
        .status(400)
        .send(
          `request failed as the following product  ${
            invalidProducts.length > 1 ? " do" : " does"
          } not exist. Please contact FosyTech support if this error persist unexpectedly : [${invalidProducts}]`
        );
    }

    const deletedProduct = await deleteProductModel(ids, reason, deletedBy);
    const deleteImage = await deleteProductImageFirebase(images);
    if (deletedProduct.length > 0) {
      console.log("failed deleted tags", usedTags);
      return res
        .status(400)
        .send(
          `request failed. Please ensure you have good internet. if error persists, contact FosyTech`
        );
    }
    const status = { status: "deleted" };
    const productCodes = [
      {
        productCode,
      },
    ];
    const updateProductStatus = await updateTagStatus(
      productCodes,
      organisationId,
      status
    );
    console.log("deleted products successful");
    return res.status(200).send(ids);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const editProduct = async (req, res) => {
  try {
    console.log("starting edit", req.body);

    if (!req.body.imageUrl && req.file) {
      const { _id } = req.body;
      const filename = req.file.filename;
      const imageUrl = await addImage(req, filename);

      const update = await ProductModel.findByIdAndUpdate(
        _id,
        // { name, category, price },
        { ...req.body, imageUrl },
        { new: true }
      );
      if (update) {
        const log = req.body.log && JSON.parse(req.body.log);
        log.action = "edit";
        const updateLog = await ProductModel.findByIdAndUpdate(
          update._id,
          // { name, category, price },

          { $push: { logs: log } },
          { new: true }
        );

        return res.status(200).send(update);
      }
    } else {
      const { _id, log } = req.body;
      const update = await ProductModel.findByIdAndUpdate(
        _id,
        // { name, category, price },
        { ...req.body },
        { new: true }
      );
      if (update) {
        log.action = "edit";
        const updateLog = await ProductModel.findByIdAndUpdate(
          update._id,
          // { name, category, price },
          { $push: { logs: log } },
          { new: true }
        );
        console.log("update", update);
        return res.status(200).send(update);
      }
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const cloneProduct = async (req, res) => {
  try {
    console.log("starting clone", req.body);
    const { _id, productCode, organisationId, log } = req.body;
    const check = await validateProductCode([productCode], organisationId);
    console.log("invalid isss", check);
    if (check?.length > 0) {
      return res
        .status(400)
        .send(
          `request failed as the following product ${
            duplicateProducts.length > 1 ? "codes are" : "code is"
          }  invalid. Please ensure the product ${
            duplicateProducts.length > 1 ? "codes" : "code"
          } has been generated already before this action.  Product Code : [${check}]`
        );
    }
    const invalidTags = await checkUnusedTag([productCode], organisationId);
    if (invalidTags.length > 0) {
      console.log("found", invalidTags);
      return res.status(400).send(
        `request failed as the following product ${
          duplicateProducts.length > 1 ? "codes have" : "code has"
        }  been used before by another existing or previously deleted product. 
           Product Code : [${invalidTags}]`
      );
    }
    if (_id && productCode) {
      const existingProduct = await ProductModel.findById(_id);
      const clonedProduct = { ...existingProduct._doc };
      console.log("cloned prod", clonedProduct);
      if (clonedProduct) {
        delete clonedProduct._id;
        delete clonedProduct.logs;
        clonedProduct.productCode = productCode;

        const product = new ProductModel(clonedProduct);
        const newProduct = await product.save();
        log.action = "create";
        if (newProduct) {
          const update = await ProductModel.findByIdAndUpdate(
            newProduct._id,
            // { name, category, price },
            { $push: { logs: log } },
            { new: true }
          );

          const status = { status: "in-stock" };
          const updateProductStatus = await updateTagStatus(
            [newProduct],
            organisationId,
            status
          );
          console.log("updated tag status", updateProductStatus);
          return res.status(200).send(newProduct);
        }
      }
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

module.exports = {
  getProducts,
  getOneProduct,
  getGallery,
  createProduct,
  createBulkProduct,
  downloadProductTemplate,
  deleteProduct,
  editProduct,
  cloneProduct,
};
