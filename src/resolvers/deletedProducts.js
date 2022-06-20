const DeletedProductModel = require("../models/deletedProducts");

const getProducts = async (req, res) => {
  try {
    const organisationId = req.query.organisationId;
    const products = await DeletedProductModel.find({ organisationId });
    if (products) {
      return res.status(200).send(products);
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
module.exports = { getProducts };
