const InvoiceModel = require("../models/invoice");
const SaleModel = require("../models/sales");
const ReceiptModel = require("../models/receipt");
const OrganisationContactModel = require("../models/organisationContact");
const OrganisationUserModel = require("../models/organisationUsers");

const calcAmountPaid = async (linkedReceiptList, _id) => {
  let amountpaid = 0;
  if (linkedReceiptList.length === 0) {
    return amountpaid;
  }

  await Promise.all(
    linkedReceiptList.map(async (receipt) => {
      const payment = await ReceiptModel.findById({
        _id: receipt?.receiptId,
      })
        .where("status")
        .equals("active")
        .lean();
      if (payment?._id) {
        const found = payment?.linkedInvoiceList.find(
          (pay) => pay?._id.toString() === receipt?.paymentId
        );
        if (found) {
          amountpaid += Number(found.appliedAmount);
        }
      }
    })
  );
  return amountpaid;
};

const checkAmountPaid = async (invoices) => {
  let collection = [];
  await Promise.all(
    invoices.map(async (invoice) => {
      const newInvoice = { ...invoice };
      const { linkedReceiptList, _id, amountDue } = newInvoice;
      let amountPaid = 0;
      if (linkedReceiptList?.length > 0) {
        amountPaid = await calcAmountPaid(linkedReceiptList, _id);
      }

      newInvoice.amountPaid = Number(amountPaid);
      newInvoice.balance = Number(Number(amountDue) - Number(amountPaid));
      collection.push(newInvoice);
    })
  );
  return collection;
};
const addCustomerDetail = async (invoice) => {
  const { customerId } = invoice;
  const customer = await OrganisationContactModel.findById({ _id: customerId })
    .where("status")
    .equals("active")
    .lean();
  if (customer?._id) {
    const newcustomer = { ...customer };
    const { firstName, lastName, email, phoneNumber, address, salutation } =
      newcustomer || {};
    invoice.customerDetail = {
      firstName,
      lastName,
      email,
      phoneNumber,
      address,
      salutation,
    };
    return invoice;
  }
  return invoice;
};

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
    if (!invoices) return res.status(200).send([]);
    const invoicesWithBalance = await checkAmountPaid(invoices);
    let addedCustomerDetails = [];
    await Promise.all(
      invoicesWithBalance.map(async (invoice) => {
        const addCustomer = await addCustomerDetail(invoice);
        addedCustomerDetails.push(addCustomer);
      })
    );
    return res.status(200).send(addedCustomerDetails);
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
    const newInvoice = { ...invoice };
    const { linkedReceiptList, _id } = newInvoice;
    let amountPaid = 0;
    if (linkedReceiptList?.length > 0) {
      amountPaid = await calcAmountPaid(linkedReceiptList, _id);
    }
    newInvoice.amountPaid = Number(amountPaid);
    newInvoice.balance = Number(newInvoice.amountDue) - Number(amountPaid);
    const addedCustomerDetail = await addCustomerDetail(newInvoice);
    return res.status(200).send(addedCustomerDetail);
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
    const invoices = await InvoiceModel.find({ ...param })
      .where("status")
      .equals("active")
      .lean();
    if (!invoices)
      return res.status(400).send("invoice with matching param not found");
    const invoicesWithBalance = await checkAmountPaid(invoices);
    let addedCustomerDetails = [];
    await Promise.all(
      invoicesWithBalance.map(async (invoice) => {
        const addCustomer = await addCustomerDetail(invoice);
        addedCustomerDetails.push(addCustomer);
      })
    );
    return res.status(200).send(addedCustomerDetails);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const getInvoiceLogs = async (req, res) => {
  try {
    const { _id } = req.query;
    if (!_id)
      return res.status(400).send({ message: "contact_id is required" });
    const invoice = await InvoiceModel.findById({ _id })
      .select("logs")
      .lean();
    const logs = invoice?.logs;

    if (!logs || logs?.length === 0) return res.status(200).send([]);
    const clonedLogs = [];
    const myPromise = logs.map(async (item) => {
      const newItem = { ...item };
      const { userId } = newItem;
      if (userId) {
        const user = await OrganisationUserModel.findById({
          _id: userId,
        }).lean();
        if (user) {
          newItem.user = user;
        }
      }
      clonedLogs.push(newItem);
    });
    await Promise.all(myPromise);
    return res.status(200).send(
      clonedLogs.sort(function (a, b) {
        return new Date(b?.date) - new Date(a?.date);
      })
    );
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const getInvoiceReceipts = async (req, res) => {
  try {
    const { _id } = req.query;
    if (!_id) return res.status(400).send("_id is required");
    const invoice = await InvoiceModel.findOne({
      _id,
      linkedReceiptList: { $exists: true },
    })
      .where("status")
      .equals("active")
      .lean();
    if (!invoice) return res.status(200).send([]);

    const { linkedReceiptList } = invoice;
    if (linkedReceiptList?.length === 0) return res.status(200).send([]);
    // if (!linkedReceiptList) return res.status(200).send([]);

    const collectReceipts = [];
    await Promise.all(
      linkedReceiptList.map(async (receipt) => {
        const { paymentId, receiptId } = receipt;
        if (receiptId && paymentId) {
          const receiptData = await ReceiptModel.findById({
            _id: receipt?.receiptId,
          })
            .where("status")
            .equals("active")
            .lean();
          if (receiptData?._id) {
            collectReceipts.push(receiptData);
          }
        }
      })
    );

    return res.status(200).send(collectReceipts);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const getCustomerInvoice = async (req, res) => {
  try {
    const { customerId, outstanding } = req.query;
    const organisationId = req.query.organisationId;
    if (!organisationId)
      return res.status(400).send("organisationId is required");
    if (!customerId) return res.status(400).send("customerId is required");
    const invoices = await InvoiceModel.find({
      customerId,
      organisationId,
      stage: { $eq: "sent" },
      status: { $eq: "active" },
    }).lean();
    if (!invoices) return res.status(200).send([]);

    const invoicesWithBalance = await checkAmountPaid(invoices);
    let addedCustomerDetails = [];
    await Promise.all(
      invoicesWithBalance.map(async (invoice) => {
        const addCustomer = await addCustomerDetail(invoice);
        addedCustomerDetails.push(addCustomer);
      })
    );

    if (!outstanding) return res.status(200).send(addedCustomerDetails);

    let collection = [];
    await Promise.all(
      addedCustomerDetails.map(async (invoice) => {
        const newInvoice = { ...invoice };
        const { linkedReceiptList, _id, amountDue } = newInvoice;
        let amountPaid = 0;
        if (linkedReceiptList?.length > 0) {
          amountPaid = await calcAmountPaid(linkedReceiptList, _id);
        }
        newInvoice.amountPaid = Number(amountPaid);
        newInvoice.balance = Number(Number(amountDue) - Number(amountPaid));
        if (newInvoice.balance > 0) {
          collection.push(newInvoice);
        }
      })
    );
    const customer = await OrganisationContactModel.findById({
      _id: customerId,
    }).lean();
    if (!customer) res.status(400).send("customer not found");

    return res.status(200).send({ customer, invoices: collection });
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
  getInvoiceReceipts,
  getInvoiceLogs,
};
