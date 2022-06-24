const CartModel = require("../models/cart");

const createCart = async (req, res) => {
  try {
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
    const cart = await CartModel.findByIdAndDelete(req.params.id);
    if (cart) {
      return res.status(200).send(cart);
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

module.exports = { getCart, createCart, deleteCart };
