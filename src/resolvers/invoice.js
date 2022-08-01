const InvoiceModel = require("../models/invoice");

const getAllInvoice = async (req, res) => {
  try {
    const organisationId = req.query.organisationId;
    if (!organisationId)
      return res.status(400).send({ message: "organisationId is required" });
    const invoices = await InvoiceModel.find({ organisationId }).lean();
    return res.status(200).send(invoices);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const getInvoice = async (req, res) => {
  try {
    if (!req.query._id)
      return res.status(400).send({ message: "no invoiceId provided" });
    const invoice = await InvoiceModel.findById(req.query._id).lean();
    if (!invoice) return res.status(400).send({ message: "invoice not found" });
    return res.status(200).send(invoice);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const createInvoice = async (req, res) => {
  try {
    const organisationId = req.body.organisationId;
    if (!organisationId)
      return res.status(400).send({ message: "organisationId is required" });
    const invoice = await InvoiceModel.create(req.body);
    if (!invoice)
      return res.status(400).send({ message: "invoice not created" });
    return res.status(200).send({ message: "invoice", invoice: invoice });
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const editInvoice = async (req, res) => {
  try {
    const { _id } = req.body;
    if (!_id)
      return res.status(400).send({ message: "invoice_id is required" });
    const update = await InvoiceModel.findByIdAndUpdate(
      _id,
      { ...req.body },
      { new: true }
    );
    if (update) {
      return res.status(200).send({ message: "invoice", invoice: update });
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const deleteInvoice = async (req, res) => {
  try {
    const { _id } = req.body;
    if (!_id)
      return res.status(400).send({ message: "invoice_id is required" });
    const disabled = await InvoiceModel.findByIdAndUpdate(
      _id,
      { disabled: "true" },
      { new: true }
    );
    if (disabled) {
      return res.status(200).send({ message: "invoice", invoice: disabled });
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const validateInvoiceNo = async (req, res) => {
  try {
    const { invoiceNo, organisationId } = req.body;
    if (!invoiceNo) return res.status(400).send("invoiceNo is required");
    if (!organisationId)
      return res.status(400).send("organisationId is required");
    const invoice = await InvoiceModel.findOne({ invoiceNo, organisationId });
    if (invoice) {
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
  getAllInvoice,
  getInvoice,
  createInvoice,
  editInvoice,
  deleteInvoice,
  validateInvoiceNo,
};
