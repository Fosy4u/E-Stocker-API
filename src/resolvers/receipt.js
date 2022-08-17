const ReceiptModel = require("../models/receipt");
const OrganisationContactModel = require("../models/organisationContact");
const InvoiceModel = require("../models/invoice");
const QRCode = require("qrcode");
const _ = require("mongoose-sequence");

const calcOverPaymentAmount = (linkedInvoiceList, amountPaid) => {
  let overPaymentAmount = 0;
  let sum = 0;
  if (linkedInvoiceList?.length === 0) {
    return overPaymentAmount;
  }
  linkedInvoiceList?.map((invoice) => {
    sum += Number(invoice.appliedAmount);
  });
  overPaymentAmount = amountPaid - sum;
  if (overPaymentAmount === 0) {
    overPaymentAmount = 0;
  }
  return overPaymentAmount;
};

const calcSumCustomerOverPaymentAmount = (receipts) => {
  let sum = 0;
  receipts.forEach((receipt) => {
    const { overPayment } = receipt;
    sum += overPayment;
  }),
    (err) => {
      if (err) return err;
    };
  return sum;
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
    if (!receipts) return res.status(200).send([{}]);
    let newReceipts = [];
    Promise.resolve(
      receipts.map((receipt) => {
        const newReceipt = { ...receipt };
        const { _id, receiptNo, amountPaid, linkedInvoiceList } = newReceipt;
        if (!linkedInvoiceList || linkedInvoiceList?.length === 0) {
          newReceipt.overPayment = 0;
          newReceipts.push(newReceipt);
        } else {
          const overPayment = calcOverPaymentAmount(
            linkedInvoiceList,
            amountPaid
          );
          newReceipt.overPayment = overPayment;
          newReceipts.push(newReceipt);
        }
      })
    );
    const addedCustomerDetails = [];
    await Promise.all(
      newReceipts.map(async (receipt) => {
        const { customerId } = receipt;
        if (customerId) {
          const addedCustomer = await addCustomerDetail(receipt);
          addedCustomerDetails.push(addedCustomer);
        } else {
          addedCustomerDetails.push(receipt);
        }
      })
    );
    return res.status(200).send(addedCustomerDetails);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const getAllCustomerOverPayment = async (req, res) => {
  try {
    const { customerId } = req.query;

    const organisationId = req.query.organisationId;
    if (!organisationId)
      return res.status(400).send("organisationId is required");
    if (!customerId) return res.status(400).send("customerId is required");
    const receipts = await ReceiptModel.find({ organisationId, customerId })
      .where("status")
      .equals("active")
      .lean();
    if (!receipts) return res.status(200).send([{}]);
    let newReceipts = [];
    Promise.resolve(
      receipts.map((receipt) => {
        const newReceipt = { ...receipt };

        const { _id, receiptNo, amountPaid, linkedInvoiceList } = newReceipt;
        if (!linkedInvoiceList || linkedInvoiceList?.length === 0) {
          newReceipt.overPayment = 0;
        } else {
          const overPayment = calcOverPaymentAmount(
            linkedInvoiceList,
            amountPaid
          );
          newReceipt.overPayment = overPayment;
          if (overPayment > 0) {
            newReceipts.push(newReceipt);
          }
        }
      })
    );
    const sumOverPayment = calcSumCustomerOverPaymentAmount(newReceipts);
    const customerOverPayment = {
      customerId,
      sumOverPayment,
      receipts: newReceipts,
    };
    return res.status(200).send(customerOverPayment);
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
    const newReceipt = { ...receipt };
    const { _id, receiptNo, amountPaid, linkedInvoiceList } = newReceipt;
    const overPayment = calcOverPaymentAmount(linkedInvoiceList, amountPaid);
    newReceipt.overPayment = overPayment;
    const addedCustomerReceipt = await addCustomerDetail(newReceipt);
    return res.status(200).send(addedCustomerReceipt);
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
const verifyReceipt = async (receipts) => {
  let isValid = true;

  await Promise.resolve(
    receipts?.map(async (item) => {
      const { _id, linkedInvoice } = item;

      if (
        !_id ||
        !linkedInvoice?.invoiceId ||
        !linkedInvoice?.invoiceNo ||
        !linkedInvoice?.appliedAmount
      ) {
        isValid = false;
        return isValid;
      }
      const receipt = await ReceiptModel.findById(_id);
      if (!receipt) {
        isValid = false;
      }
    })
  );

  return isValid;
};

const updateInvoiceLinkedReceipt = async (req, res) => {
  try {
    const { receipts, salesPerson, customerId } = req.body;
    if (receipts?.length === 0)
      return res.status(400).send("no receipts provided");
    if (!salesPerson) return res.status(400).send("no salesPerson provided");
    if (!customerId) return res.status(400).send("no customerId provided");
    const verified = await verifyReceipt(receipts);
    if (!verified) {
      return res
        .status(400)
        .send("one of the supplied receipt(s) data is invalid");
    }

    let invalidUpdates = [];
    await Promise.resolve(
      receipts.map(async (receipt) => {
        const { _id, linkedInvoice } = receipt;
        const updatedReceipt = await ReceiptModel.findByIdAndUpdate(
          _id,
          { $push: { linkedInvoiceList: { ...linkedInvoice } } },
          { new: true }
        );
        if (!receipt) {
          invalidUpdates.push(_id);
        }
        if (updatedReceipt) {
          const { invoiceId, invoiceNo, appliedAmount } = linkedInvoice;
          const invoiceLog = {
            date: new Date(),
            user: salesPerson?.name,
            userId: salesPerson?.id,
            action: "payment",
            details: `added ${appliedAmount} from ${updatedReceipt?.receiptNo}`,
            reason:
              `applied unused payment receieved from ` +
              updatedReceipt?.receiptNo,
          };
          const linkedReceipt = {
            receiptId: updatedReceipt?._id,
            receiptNo: updatedReceipt?.receiptNo,
          };
          await InvoiceModel.findByIdAndUpdate(
            invoiceId,
            {
              $push: { logs: invoiceLog, linkedReceiptList: linkedReceipt },
            },
            { new: true }
          );
        }
      })
    );
    if (invalidUpdates.length > 0) {
      return res
        .status(400)
        .send(
          `couldnt apply payment from receipt(s) with id(s) ${invalidUpdates}`
        );
    }
    return res
      .status(200)
      .send({ message: "successfully applied payment from receipt(s)" });
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
};

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
};

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
};

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

const calcOverPayment = (linkedInvoiceList, amountPaid) => {
  let overPayment = 0;
  let sum = 0;
  linkedInvoiceList.forEach((invoice) => {
    const { appliedAmount } = invoice;
    sum += appliedAmount;
  });
  const remainder = amountPaid - sum;
  if (remainder > 0) {
    overPayment = remainder;
  }
  return overPayment;
};

const generateQRCode = async (stringData) => {
  const code = QRCode.toDataURL(stringData);
  return code;
};

const generateReceipt = async (data) => {
  console.log("generating receipt");
  try {
    const {
      organisationId,
      customerDetail,
      organisation,
      receiptNo,
      amountPaid,
    } = data;

    const { firstName, lastName } = customerDetail;
    const stringData = `${organisation?.name} ${
      receiptNo || 1 + "-" + firstName
    } ${lastName + "-total-" + amountPaid}`;
    const QrCode = await generateQRCode(stringData);

    const receiptDate = new Date();

    const receipt = await ReceiptModel.create({
      ...data,
      receiptDate,
      QrCode,
    });
    return receipt;
  } catch (error) {
    console.log("error", error);
  }
};

const createInvoiceLinkedPayment = async (req, res) => {
  console.log("started");
  try {
    const {
      organisationId,
      paymentMethod,
      salesPerson,
      amountPaid,
      receiptDate,
      customerId,
      branch,
      receiptNo,
      linkedInvoiceList,
      organisation,
    } = req.body;
    const logs = [
      {
        date: new Date(),
        user: salesPerson?.name,
        userId: salesPerson?.id,
        action: "create",
        details: `added ${amountPaid} in ${receiptNo}`,
        reason:
          `applied payment receieved via ` + paymentMethod + ` to invoice(s)`,
      },
    ];

    if (!organisationId)
      return res.status(400).send("organisationId is required");
    if (!paymentMethod)
      return res.status(400).send("paymentMethod is required");
    if (!organisation) return res.status(400).send("organisation is required");

    if (!salesPerson) return res.status(400).send("salesPerson is required");
    if (!amountPaid || amountPaid <= 0)
      return res.status(400).send("amountPaid is required");
    if (!receiptDate) return res.status(400).send("receiptDate is required");
    if (!customerId) return res.status(400).send("customerId is required");
    if (!branch) return res.status(400).send("branch is required");
    if (!receiptNo) return res.status(400).send("receiptNo is required");
    if (!linkedInvoiceList || linkedInvoiceList.length === 0)
      return res.status(400).send("linkedInvoiceList is required");
    const isValid = true;

    linkedInvoiceList.forEach((invoice) => {
      const { invoiceId, invoiceNo, appliedAmount } = invoice;
      if (!invoiceId || !invoiceNo || !appliedAmount) {
        isValid = false;
      }
    });
    if (!isValid) {
      return res.status(400).send("linkedInvoice list validation failed");
    }

    const overPayment = calcOverPayment(linkedInvoiceList, amountPaid);
    const isInvoicePayment = true;
    const subTotal = amountPaid;

    const params = {
      ...req.body,
      logs,
      overPayment,
      isInvoicePayment,
      subTotal,
    };
    if (paymentMethod !== "invoice") {
      const receipt = await generateReceipt(params);
      if (!receipt) {
        return res.status(400).send("payment failed");
      }
      const log = {
        date: new Date(),
        user: salesPerson?.name,
        userId: salesPerson?.id,
        action: "payment",
        details: `added ${amountPaid} from ${receiptNo}`,
        reason:
          `applied payment receieved via ` + paymentMethod + ` to invoice(s)`,
      };
      console.log("comlpete", receipt);
      const updateCustomer = await OrganisationContactModel.findByIdAndUpdate(
        { _id: customerId },
        { $push: { logs: log } },
        { new: true }
      );

      await Promise.resolve(
        linkedInvoiceList.forEach(async (invoice) => {
          const { invoiceId } = invoice;
          const linkedInv = {
            receiptId: receipt._id,
            receiptNo: receipt.receiptNo,
          };

          const updateIvoice = await InvoiceModel.findByIdAndUpdate(
            { _id: invoiceId },
            { $push: { linkedReceiptList: linkedInv, logs: log } },
            { new: true }
          );
          if (!updateIvoice) {
            return res.status(400).send("payment failed");
          }
          console.log("done", updateIvoice);
        })
      );

      return res.status(200).send(receipt);
    }

    res.status(400).send("wrong payment method");
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
  getReceiptByParam,
  createInvoiceLinkedPayment,
  updateInvoiceLinkedReceipt,
  getAllCustomerOverPayment,
};
