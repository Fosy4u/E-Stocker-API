const TagModel = require("../models/tags");
const mongoose = require("mongoose");

const groupBy = (array, key) => {
  // Return the end result
  return array.reduce((result, currentValue) => {
    // If an array already present for key, push it to the array. Else create an array and push the object
    (result[currentValue[key]] = result[currentValue[key]] || []).push(
      currentValue
    );
    // Return the current iteration `result` value, this will be taken as next iteration `result` value and accumulate
    return result;
  }, {}); // empty object is the initial value for result object
};
const getFormatedTags = (data) => {
  return data.reduce((acc, item, index) => {
    const arr = {};
    arr["createdDate"] = item[0].createdDate;
    arr["body"] = item;
    arr["id"] = index;
    acc.push(arr);
    return acc;
  }, []);
};

const getTags = async (req, res) => {
  const organisationId = req.query.organisationId;
  const format = req.query.format;
  console.log("format : ", format);
  try {
    const params = { organisationId };
    console.log("orgId", organisationId);
    const tags = await TagModel.find(params);

    if (tags && format === "true") {
      console.log("format is  ", format);
      const formatedTags = getFormatedTags(
        Object.values(groupBy(tags, "createdDate"))
      );
      return res.status(200).send(formatedTags);
    }
    console.log("format : ", format);
    return res.status(200).send(tags);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

function getRandomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

const generateUniqueProductCode = async (organisationId) => {
  console.log("generating code");
  let productCode;
  let found = true;

  do {
    const randomVal = getRandomInt(1000000, 9999999);
    productCode = `${randomVal}`;
    const exist = await TagModel.find({
      productCode: productCode,
      organisationId: organisationId,
    });
    if (exist) {
      found = true;
      console.log(" code exist, get new one", productCode);
    } else {
      found = false;
      console.log(" code done", productCode);
    }
    // product = await TagModel.countDocumentsWithDeleted({
    //   productCode: productCode,
    //   organisationId: organisationId,
    // });
  } while (!found);

  return productCode.toString();
};

const saveProductTag = async (quantity, params, organisationId) => {
  console.log("starting save");
  const arrayQuantity = [...Array(parseInt(quantity)).keys()];
  return arrayQuantity.reduce(async (acc, item) => {
    const createdTags = await acc;
    const productCode = await generateUniqueProductCode(organisationId);
    const tag = new TagModel({ ...params, productCode });
    const newTag = await tag.save();
    console.log("saved");
    createdTags.push(newTag);

    return createdTags;
  }, []);
};

const createProductTag = async (req, res) => {
  const { name, organisationId, address, contactNo, quantity } = req.body;

  try {
    const params = {
      name,
      organisationId,
      address,
      contactNo,
      status: "unused",
      createdDate: new Date(),
    };
    const createdTags = await saveProductTag(quantity, params, organisationId);
    if (createdTags.length > 0) {
      console.log(createdTags, "created tags");
      return res.status(200).send(createdTags);
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const deleteTagModel = async (productCodes) => {
  return productCodes.reduce(async (acc, productCode) => {
    const result = await acc;
    const deleted = await TagModel.findOneAndDelete({ productCode });
    if (deleted.length === 0) {
      result.push(deleted[0]);
    }

    return result;
  }, []);
};

const checkUnusedTag = async (productCodes) => {
  return productCodes.reduce(async (acc, productCode) => {
    const result = await acc;
    const found = await TagModel.find({ productCode });
    if (found[0]?.status !== "unused" && found[0]?.productCode) {
      console.log("found: ", found);
      result.push(found[0]?.productCode);
    }

    return result;
  }, []);
};

const deleteTag = async (req, res) => {
  const productCodes = req.body;
  const usedTags = await checkUnusedTag(productCodes);
  if (usedTags.length > 0) {
    console.log("used tags", usedTags);
    return res
      .status(400)
      .send(
        `request failed as the following product ${
          usedTags.length > 1 ? "codes are" : "code is"
        }  currently in use. If you still want to proceed, first delete the product that has the code and retry this request. Please change or remove Product Code : [${usedTags.toString()}]`
      );
  }
  const deletedTag = await deleteTagModel(productCodes);
  if (deletedTag.length > 0) {
    console.log("failed deleted tags", usedTags);
    return res
      .status(400)
      .send(
        `request failed. Please ensure you have good internet. if error persists, contact FosyTech`
      );
  } else {
    console.log("deleted tags successful");
    return res.status(200).send(productCodes);
  }
};

module.exports = {
  getTags,
  createProductTag,
  deleteTag,
};
