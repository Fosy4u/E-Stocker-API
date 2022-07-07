const CartModel = require("../models/cart");

const createCart = async (req, res) => {
  try {
    const organisationId = req.body.organisationId;
    if (!organisationId)
      return res.status(400).send({ message: "organisationId is required" });
    const cart = await CartModel.create(req.body);
    if (cart) {
      return res.status(200).send(cart);
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const getCart = async (req, res) => {
  try {
    const organisationId = req.query.organisationId;
    const cart = await CartModel.find({ organisationId });
    return res.status(200).send(cart);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const deleteCart = async (req, res) => {
  try {
    console.log('start', req.body)
    const cart = await CartModel.findByIdAndDelete(req.body._id);
    if (cart) {
      return res.status(200).send(cart);
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

module.exports = { getCart, createCart, deleteCart };
