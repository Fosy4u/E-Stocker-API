const InvoiceModel = require("../models/invoice");
const SaleModel = require("../models/sales");

const getAllInvoice = async (req, res) => {
  try {
    const { status } = req.query;
    if (!status) return res.status(400).send("no status provided");
    const organisationId = req.query.organisationId;
    if (!organisationId)
      return res.status(400).send("organisationId is required");
    const invoices = await InvoiceModel.find({ organisationId })
      .where("status")
      .equals(status)
      .lean();
    return res.status(200).send(invoices);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const getInvoice = async (req, res) => {
  try {
    const { status } = req.query;
    if (!status) return res.status(400).send("no status provided");
    if (!req.query._id) return res.status(400).send("no invoiceId provided");
    const invoice = await InvoiceModel.findById(req.query._id)
      .where("status")
      .equals(status)
      .lean();
    if (!invoice) return res.status(200).send({});
    return res.status(200).send(invoice);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const getInvoiceByParam = async (req, res) => {
  try {
    const param = req.query;
    const organisationId = req.query.organisationId;
    if (!organisationId)
      return res.status(400).send("organisationId is required");
    const invoice = await InvoiceModel.find({ ...param })
      .where("status")
      .equals("active")
      .lean();
    if (!invoice)
      return res.status(400).send("invoice with matching param not found");
    return res.status(200).send(invoice);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const calcBalance = (amountDue, paymentList) => {
  console.log("came here");
  let balance = amountDue;
  if (paymentList.length === 0) {
    return balance;
  }
  paymentList.forEach((payment) => {
    balance -= payment.amountPaid;
  });
  return balance;
};

const checkOutstanding = (invoices) => {
  console.log(
    "🚀 ~ file: invoice.js ~ line 61 ~ checkOutstanding ~ invoices",
    invoices?.length
  );
  let outstanding = [];
  invoices?.forEach((invoice) => {
    const { amountDue, paymentList } = invoice;
    const balance = calcBalance(amountDue, paymentList || []);
    if (balance > 0) {
      outstanding.push(invoice);
    }
  });
  return outstanding;
};

const getCustomerInvoice = async (req, res) => {
  try {
    const { customerId, outstanding } = req.query;

    const organisationId = req.query.organisationId;
    if (!organisationId)
      return res.status(400).send("organisationId is required");
    if (!customerId) return res.status(400).send("customerId is required");
    const invoice = await InvoiceModel.find({ customerId, organisationId })
      .where("status")
      .equals("active")
      .lean();
    if (!invoice) return res.status(200).send([]);
    if (!outstanding) return res.status(200).send(invoice);
    const outstandingInvoice = checkOutstanding(invoice);
    return res.status(200).send(outstandingInvoice);
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
const stampInvoice = async (req, res) => {
  try {
    const { _id, stage, user } = req.body;
    const log = {
      date: new Date(),
      user: user?.name,
      action: "stamp",
      reason: "invoice sent to customer",
      details: "stamped ",
    };
    if (!_id)
      return res.status(400).send({ message: "invoice_id is required" });
    if (!user) return res.status(400).send("user is required");
    if (!stage) return res.status(400).send("stage is required");
    const update = await InvoiceModel.findByIdAndUpdate(
      _id,
      { ...req.body },
      { new: true }
    );
    if (update) {
      const log = {
        date: new Date(),
        user: user?.name,
        action: "stamp",
        reason: "invoice sent to customer",
        details: `stamped ${update.invoiceNo} as sent`,
      };
      const sale = await SaleModel.findOne({ invoiceNo: update.invoiceNo });
      const updateLog = await SaleModel.findByIdAndUpdate(
        sale._id,
        { $push: { logs: log } },
        { new: true }
      );
      if (!updateLog)
        return res.status(400).send("invoice stamped but couldnt update log");
      const updateIvoiceLog = await InvoiceModel.findByIdAndUpdate(
        update._id,
        { $push: { logs: log } },
        { new: true }
      );
      if (!updateIvoiceLog)
        return res.status(400).send(" invoice stamped but failed to update");
      return res.status(200).send(updateIvoiceLog);
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
  getInvoiceByParam,
  stampInvoice,
  getCustomerInvoice,
};
