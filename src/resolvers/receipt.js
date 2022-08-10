const ReceiptModel = require("../models/receipt");

const getAllReceipt = async (req, res) => {
    try {
      const { status } = req.query;
      if (!status) return res.status(400).send("no status provided");
      const organisationId = req.query.organisationId;
      if (!organisationId)
        return res.status(400).send("organisationId is required");
      const receipts = await ReceiptModel.find({ organisationId })
        .where("status")
        .equals(status)
        .lean();
      return res.status(200).send(receipts);
    } catch (error) {
      return res.status(500).send(error.message);
    }
  };
  const getReceipt = async (req, res) => {
    try {
      const { status } = req.query;
      if (!status) return res.status(400).send("no status provided");
      if (!req.query._id) return res.status(400).send("no receiptId provided");
      const receipt = await ReceiptModel.findById(req.query._id)
        .where("status")
        .equals(status)
        .lean();
      if (!receipt) return res.status(200).send({});
      return res.status(200).send(receipt);
    } catch (error) {
      return res.status(500).send(error.message);
    }
  };

  const getReceiptByParam = async (req, res) => {
    try {
      const param = req.query;
      const organisationId = req.query.organisationId;
      if (!organisationId)
        return res.status(400).send("organisationId is required");
      const receipt = await ReceiptModel.find({ ...param }).lean();
      if (!receipt)
        return res.status(400).send("receipt with matching param not found");
      return res.status(200).send(receipt);
    } catch (error) {
      return res.status(500).send(error.message);
    }
  };

const createReceipt = async (req, res) => {
    try {
        const organisationId = req.body.organisationId;
        if (!organisationId)
        return res.status(400).send({ message: "organisationId is required" });
        const receipt = await ReceiptModel.create(req.body);
        if (!receipt)
        return res.status(400).send({ message: "receipt not created" });
        return res.status(200).send({ message: "receipt", receipt: receipt });
    } catch (error) {
        return res.status(500).send(error.message);
    }
}

const editReceipt = async (req, res) => {
    try {
        const { _id } = req.body;
        if (!_id)
        return res.status(400).send({ message: "receipt_id is required" });
        const update = await ReceiptModel.findByIdAndUpdate(
            _id,
            { ...req.body },
            { new: true }
        );
        if (update) {
            return res.status(200).send({ message: "receipt", receipt: update });
        }
    } catch (error) {
        return res.status(500).send(error.message);
    }
}

const deleteReceipt = async (req, res) => {
    try {
        const { _id } = req.body;
        if (!_id)
        return res.status(400).send({ message: "receipt_id is required" });
        const receipt = await ReceiptModel.findByIdAndUpdate(
            _id,
            { disabled: "true" },
            { new: true }
          );
        if (!receipt)
        return res.status(400).send({ message: "receipt not deleted" });
        return res.status(200).send({ message: "receipt", receipt: receipt });
    } catch (error) {
        return res.status(500).send(error.message);
    }
}

const validateReceiptNo = async (req, res) => {
    try {
      const { receiptNo, organisationId } = req.body;
      if (!receiptNo) return res.status(400).send("receiptNo is required");
      if (!organisationId)
        return res.status(400).send("organisationId is required");
      const receipt = await ReceiptModel.findOne({ receiptNo, organisationId });
      if (receipt) {
        const valid = false;
        return res.status(200).send({ valid });
      }
      const valid = true;
      return res.status(200).send({ valid });
    } catch (error) {
      return res.status(500).send(error.message);
    }
  };

module.exports = {
    getAllReceipt,
    getReceipt,
    createReceipt,
    editReceipt,
    deleteReceipt,
    validateReceiptNo,
    getReceiptByParam
}
