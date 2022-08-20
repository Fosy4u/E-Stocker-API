const ReceiptModel = require("../models/receipt");
const OrganisationContactModel = require("../models/organisationContact");
const InvoiceModel = require("../models/invoice");
const QRCode = require("qrcode");
const _ = require("mongoose-sequence");
const { find } = require("../models/receipt");

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
  if (!customerId) return invoice;
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

const getLinkedInvoiceList = async (linkedInvoiceList) => {
  return linkedInvoiceList.reduce(async (acc, invoice) => {
    const collect = await acc;
    const { invoiceId, appliedAmount } = invoice;
    if (invoiceId && appliedAmount > 0) {
      const invoice = await InvoiceModel.findById({ _id: invoiceId })
        .where("status")
        .equals("active")
        .lean();
      if (invoice) {
        const newInvoice = { ...invoice };
        const { linkedReceiptList, _id, amountDue } = newInvoice;
        const amountPaid = await calcAmountPaid(linkedReceiptList, _id);
        newInvoice.appliedAmount = appliedAmount;
        // amounts before applying this receipt
        newInvoice.amountPaid = Number(amountPaid) - Number(appliedAmount);
        newInvoice.balance =
          Number(Number(amountDue) - Number(amountPaid)) +
          Number(appliedAmount);
        const found = collect.find((inv) => inv?._id.toString() === invoiceId);
        if (!found) {
          collect.push(newInvoice);
        } else {
          const newFound = { ...found };

          newFound.appliedAmount =
            Number(found.appliedAmount) + Number(appliedAmount);
          newFound.balance = Number(found.balance) + Number(appliedAmount);
          newFound.amountPaid =
            Number(found.amountPaid) - Number(appliedAmount);
          const foundIndex = collect.findIndex(
            (inv) => inv?._id.toString() === invoiceId
          );
          collect[foundIndex] = newFound;
        }
      }
    }
    return collect;
  }, []);
};
const getReceiptLinkedInvoices = async (req, res) => {
  try {
    if (!req.query._id) return res.status(400).send("no receiptId provided");
    const receipt = await ReceiptModel.findById(req.query._id)
      .where("status")
      .equals("active")
      .lean();
    if (!receipt) return res.status(200).send({});
    const newReceipt = { ...receipt };
    const { linkedInvoiceList } = newReceipt;

    const invoiceList = await getLinkedInvoiceList(linkedInvoiceList);

    return res.status(200).send(invoiceList);
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
    const newReceipt = { ...receipt };
    const { _id, receiptNo, amountPaid, linkedInvoiceList } = newReceipt;
    const overPayment = calcOverPaymentAmount(linkedInvoiceList, amountPaid);
    newReceipt.overPayment = overPayment;
    const addedCustomerReceipt = await addCustomerDetail(newReceipt);
    return res.status(200).send(addedCustomerReceipt);
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

      if (!_id || !linkedInvoice?.invoiceId || !linkedInvoice?.invoiceNo) {
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
        if (linkedInvoice?.appliedAmount) {
          const receiptLog = {
            date: new Date(),
            user: salesPerson?.name,
            userId: salesPerson?.id,
            action: "payment",
            details: `applied ${linkedInvoice?.appliedAmount} to ${linkedInvoice?.invoiceNo}`,
            reason: `applied unused payment in the receipt`,
          };
          const updatedReceipt = await ReceiptModel.findByIdAndUpdate(
            _id,
            {
              $push: {
                linkedInvoiceList: { ...linkedInvoice },
                logs: receiptLog,
              },
            },
            { new: true }
          );
          if (!updatedReceipt || !updatedReceipt?._id) {
            invalidUpdates.push(_id);
          }

          if (updatedReceipt) {
            const { invoiceId, invoiceNo, appliedAmount, _id } = linkedInvoice;
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
            const linkedInvoiceLength =
              updatedReceipt?.linkedInvoiceList?.length;
            const paymentId =
              updatedReceipt?.linkedInvoiceList?.[linkedInvoiceLength - 1]?._id;

            const linkedReceipt = {
              receiptId: updatedReceipt?._id,
              receiptNo: updatedReceipt?.receiptNo,
              paymentId,
            };
            await InvoiceModel.findByIdAndUpdate(
              invoiceId,
              {
                $push: { logs: invoiceLog, linkedReceiptList: linkedReceipt },
              },
              { new: true }
            );
          }
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

      const updateCustomer = await OrganisationContactModel.findByIdAndUpdate(
        { _id: customerId },
        { $push: { logs: log } },
        { new: true }
      );

      await Promise.resolve(
        linkedInvoiceList.forEach(async (invoice) => {
          const { invoiceId } = invoice;
          const payment = receipt.linkedInvoiceList?.find(
            (invoice) => invoice?.invoiceId === invoiceId
          );
          const linkedInv = {
            receiptId: receipt._id,
            receiptNo: receipt.receiptNo,
            paymentId: payment?._id,
          };
          const receiptLog = {
            date: new Date(),
            user: salesPerson?.name,
            userId: salesPerson?.id,
            action: "payment",
            details: ` applied ${payment?.appliedAmount} to ${payment?.invoiceNo}`,
            reason:
              `applied payment receieved via ` +
              paymentMethod +
              ` to invoice(s)`,
          };
          const updateReceiptLog = await ReceiptModel.findByIdAndUpdate(
            { _id: receipt._id },
            { $push: { logs: receiptLog } },
            { new: true }
          );

          const invoiceLog = {
            date: new Date(),
            user: salesPerson?.name,
            userId: salesPerson?.id,
            action: "payment",
            details: ` applied ${payment?.appliedAmount} to this invoice from the total payment of ${amountPaid}  in ${receiptNo}`,
            reason:
              `applied payment receieved via ` +
              paymentMethod +
              ` to invoice(s)`,
          };

          const updateIvoice = await InvoiceModel.findByIdAndUpdate(
            { _id: invoiceId },
            { $push: { linkedReceiptList: linkedInv, logs: invoiceLog } },
            { new: true }
          );
          if (!updateIvoice) {
            return res.status(400).send("payment failed");
          }
        })
      );

      return res.status(200).send(receipt);
    }

    res.status(400).send("wrong payment method");
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const editInvoiceLinkedPayment = async (req, res) => {
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
      reason,
    } = req.body;

    if (!organisationId)
      return res.status(400).send("organisationId is required");
    if (!paymentMethod)
      return res.status(400).send("paymentMethod is required");
    if (!reason)
      return res.status(400).send("reason for modification is required");
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
    const currentReceipt = await ReceiptModel.findOne({ receiptNo });
    if (!currentReceipt) {
      return res.status(400).send("receipt to be updated not found");
    }
    const overPayment = calcOverPayment(linkedInvoiceList, amountPaid);
    const difference = [];
    if (amountPaid && amountPaid !== currentReceipt?.amountPaid) {
      difference.push({
        field: "amount paid",
        old: currentReceipt?.amountPaid,
        new: amountPaid,
      });
    }
    if (receiptDate && receiptDate !== currentReceipt?.receiptDate) {
      difference.push({
        field: "payment date",
        old: currentReceipt?.receiptDate,
        new: receiptDate,
      });
    }
    if (overPayment !== currentReceipt?.overPayment) {
      difference.push({
        field: "unused amount / over payment",
        old: currentReceipt?.overPayment,
        new: overPayment,
      });
    }

    await Promise.resolve(
      linkedInvoiceList.forEach(async (invoice) => {
        const { invoiceId, invoiceNo, appliedAmount } = invoice;
        const payment = currentReceipt.linkedInvoiceList?.filter(
          (invoice) => invoice?.invoiceId === invoiceId
        );
        let sum = 0;
        payment.forEach((payment) => {
          sum += payment.appliedAmount;
        });
        const substract =
          Number(sum).toFixed(2) - Number(appliedAmount).toFixed(2);
        if (
          substract !== 0 ||
          Number(sum).toFixed(2) !== Number(appliedAmount).toFixed(2)
        ) {
          difference.push({
            field: "total amount currently applied to " + invoiceNo,
            old: Number(sum).toFixed(2),
            new: Number(appliedAmount).toFixed(2),
          });
        }
        if (!payment) {
          difference.push({
            field: "amount applied to " + invoiceNo,
            old: 0,
            new: Number(appliedAmount).toFixed(2),
          });
        }
      })
    );
    if (difference.length === 0) {
      return res.status(200).send({ message: "no changes to update" });
    }
    const log = [
      {
        date: new Date(),
        user: salesPerson?.name,
        userId: salesPerson?.id,
        action: "edit",
        details: `modified ${receiptNo}`,
        reason: reason,
        difference: difference,
      },
    ];

    const subTotal = amountPaid;

    if (paymentMethod !== "invoice") {
      const updatedReceipt = await ReceiptModel.findByIdAndUpdate(
        { _id: currentReceipt._id },
        {
          amountPaid,
          receiptDate,
          overPayment,
          linkedInvoiceList,
          subTotal,
          branch,
          $push: { logs: log },
        },
        { new: true }
      );
      if (!updatedReceipt) {
        return res.status(400).send("updating receipt failed");
      }

      const updateCustomer = await OrganisationContactModel.findByIdAndUpdate(
        { _id: customerId },
        { $push: { logs: log } },
        { new: true }
      );
      const failedlist = [];
      await Promise.resolve(
        linkedInvoiceList.forEach(async (invoice) => {
          const { invoiceId } = invoice;
          const exist = currentReceipt.linkedInvoiceList?.find(
            (invoice) => invoice?.invoiceId === invoiceId
          );
          if (exist) {
            const newPayment = updatedReceipt.linkedInvoiceList?.find(
              (invoice) => invoice?.invoiceId === invoiceId
            );

            const { _id } = newPayment;

            const linkedInv = {
              receiptId: updatedReceipt._id,
              receiptNo: updatedReceipt.receiptNo,
              paymentId: _id,
            };

            const invoiceDifference = difference.find(
              (diff) =>
                diff.field ===
                "total amount currently applied to " + invoice.invoiceNo
            );
            const newDifference = { ...invoiceDifference };
            newDifference.field =
              "total amount applied currently from " + linkedInv?.receiptNo;
            const invoiceLog = {
              date: new Date(),
              user: salesPerson?.name,
              userId: salesPerson?.id,
              action: "edit",
              details: ` modified applied payments so far from ${receiptNo}`,
              reason: reason,
              difference: [newDifference],
            };

            const currentInvoice = await InvoiceModel.findById({
              _id: invoiceId,
            })
              .where("status")
              .equals("active")
              .lean();
            if (!currentInvoice) {
              failedlist.push(invoiceId);
            }
            const { linkedReceiptList } = currentInvoice;
            const newLinkedReceiptList = [...linkedReceiptList];
            const filtered = newLinkedReceiptList.filter(
              (invoice) =>
                invoice?.receiptId.toString() !== updatedReceipt._id.toString()
            );

            const linkedReceipts = [...filtered, linkedInv];
            const updateInvoiceLinkedReceipt =
              await InvoiceModel.findByIdAndUpdate(
                { _id: invoiceId },
                {
                  $push: { logs: invoiceLog },
                  linkedReceiptList: linkedReceipts,
                },
                { new: true }
              );
            if (!updateInvoiceLinkedReceipt) {
              failedlist.push(invoiceId);
            }
          }

          if (!exist) {
            const newPayment = updatedReceipt.linkedInvoiceList?.find(
              (invoice) => invoice?.invoiceId === invoiceId
            );
            const linkedInv = {
              receiptId: updatedReceipt._id,
              receiptNo: updatedReceipt.receiptNo,
              paymentId: newPayment?._id,
            };

            const invoiceLog = {
              date: new Date(),
              user: salesPerson?.name,
              userId: salesPerson?.id,
              action: "payment",
              details: ` applied ${newPayment?.appliedAmount} to this invoice from the total payment of ${amountPaid}  in ${receiptNo}`,
              reason:
                `applied payment receieved via ` +
                paymentMethod +
                ` to invoice(s)`,
            };

            const updateIvoice = await InvoiceModel.findByIdAndUpdate(
              { _id: invoiceId },
              { $push: { linkedReceiptList: linkedInv, logs: invoiceLog } },
              { new: true }
            );
            if (!updateIvoice) {
              failedlist.push(invoiceId);
            }
          }
        })
      );
      if (failedlist.length > 0) {
        return res.status(400).send(failedlist);
      }
      return res.status(200).send(updatedReceipt);
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
  getReceiptLinkedInvoices,
  editInvoiceLinkedPayment,
};
