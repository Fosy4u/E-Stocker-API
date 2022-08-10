const SaleModel = require("../models/sales");
const ReceiptModel = require("../models/receipt");
const InvoiceModel = require("../models/invoice");
const ProductModel = require("../models/products");
const AutoGeneratorModel = require("../models/autoGenerator/index");
const TagModel = require("../models/tags");
const QRCode = require("qrcode");

const adjustDate = (data) => {
  if (data < 10) {
    return `0${data}`;
  }
  return data;
};

const displayDate = (date) => {
  const parsedDate = new Date(date);
  const month = new Intl.DateTimeFormat("en-US", {
    month: "long",
  }).format(parsedDate);
  const parsedDateValue = adjustDate(parsedDate.getFullYear());
  const parsedDateDay = adjustDate(parsedDate.getDate());

  return `${parsedDateDay} ${month} ${parsedDateValue} `;
};

const generateQRCode = async (stringData) => {
  const code = QRCode.toDataURL(stringData);
  return code;
};

const checkIndex = (arr) => {
  arr.map((item) => {
    const { index } = item;
    if (index === undefined || index === null) {
      return false;
    }
  });
  var tmpArr = [];
  for (var obj in arr) {
    if (tmpArr.indexOf(arr[obj].index) < 0) {
      tmpArr.push(arr[obj].index);
    } else {
      return false; // Duplicate value for property1 found
    }
  }
  return true; // No duplicate values found for property1
};

const verifyProducts = async (data) => {
  return data.reduce(async (acc, curr) => {
    const result = await acc;
    const valid = await ProductModel.findById(curr);
    if (!valid) {
      result.push(curr);
    }
    return result;
  }, []);
};

const getReceiptNo = async (organisationId, autoGenerator) => {
  try {
    let result;
    const { nextAutoReceiptNo, receiptPrefix } = autoGenerator;
    const receiptNo = receiptPrefix + nextAutoReceiptNo;

    const exist = await ReceiptModel.findOne({ organisationId, receiptNo });
    if (!exist) {
      result = { newAutoGenerator: { ...autoGenerator }, receiptNo };

      if (result !== undefined) {
        return result;
      }
    } else {
      const newAutoGenerator = autoGenerator;
      newAutoGenerator.nextAutoReceiptNo = nextAutoReceiptNo + 1;

      return (recursion = await getReceiptNo(organisationId, newAutoGenerator));
    }
  } catch (error) {
    return false;
  }
};

const generateReceipt = async (data, sale_id) => {
  console.log("generating receipt");
  try {
    const {
      organisationId,
      customerDetail,
      organisation,
      amountDue,
      receiptNo,
    } = data;

    const { firstName, lastName } = customerDetail;
    const stringData = `${organisation?.name} ${
      receiptNo || 1 + "-" + firstName
    } ${lastName + "-total-" + amountDue}`;
    const QrCode = await generateQRCode(stringData);

    const receiptDate = new Date();

    const receipt = await ReceiptModel.create({
      ...data,
      receiptDate,
      QrCode,
      sale_id,
    });
    return receipt;
  } catch (error) {
    console.log("error", error);
  }
};
const generateInvoice = async (data, sale_id) => {
  try {
    const {
      organisationId,
      customerDetail,
      organisation,
      amountDue,
      invoiceNo,
    } = data;
    const { firstName, lastName } = customerDetail;
    const stringData = `${organisation?.name} ${invoiceNo + "-" + firstName} ${
      lastName + "-total-" + amountDue.toFixed(2)
    }`;
    const QrCode = await generateQRCode(stringData);

    invoiceDate = new Date();

    const invoice = await InvoiceModel.create({
      ...data,
      QrCode,
      sale_id,
    });
    return invoice;
  } catch (error) {
    console.log("error", error);
  }
};

const updateProducts = async (summary, sale_id, salesPerson) => {
  try {
    let updatedProducts = 0;
    const myPromise = Object.entries(summary).map(
      async ([productId, detail]) => {
        const log = {
          action: "sold",
          date: new Date(),
          user: salesPerson?.firstName + " " + salesPerson.lastName,
          details: sale_id,
        };
        const sale = {};
        const saleDetails = {
          sale_id,
          ...detail,
        };
        sale[sale_id] = saleDetails;
        const product = await ProductModel.findByIdAndUpdate(
          productId,
          {
            saleDetails: { ...sale },
            $inc: { quantity: -detail.quantity },
            $push: { logs: log },
          },
          { new: true }
        );
        if (product.type === "Single Product") {
          const status = { status: "sold" };
          const updateProductCode = await TagModel.findOneAndUpdate(
            {
              productCode: product.productCode,
              organisationId: product.organisationId,
            },
            {
              $set: status,
            }
          );
        }

        if (product.type === "Collective Product" && product.quantity === 0) {
          const status = { status: "sold - out of stock" };
          const updateProductCode = await TagModel.findOneAndUpdate(
            {
              productCode: product.productCode,
              organisationId: product.organisationId,
            },
            {
              $set: status,
            }
          );
          console.log("updated productcode", updateProductCode);
        }
        if (product.type === "Collective Product" && product.quantity > 0) {
          const status = { status: `${product.quantity} in-stock` };
          const updateProductCode = await TagModel.findOneAndUpdate(
            {
              productCode: product.productCode,
              organisationId: product.organisationId,
            },
            {
              $set: status,
            }
          );
          console.log("updated productcode", updateProductCode);
        }
        if (product) {
          updatedProducts += 1;
        }
        console.log("product updated", updatedProducts);
      }
    );
    await Promise.all(myPromise);
    return updatedProducts;
  } catch (error) {
    console.log(error);
  }
};

const createSale = async (req, res) => {
  console.log("started");
  try {
    const { organisationId, paymentMethod, summary, salesPerson } = req.body;
    const logs = [
      {
        date: new Date(),
        user: salesPerson?.name,
        userId: salesPerson?.id,
        action: "create",
        details: `created ${req.body?.invoiceNo || req.body?.receiptNo}`,
        reason: `sold product via ` + paymentMethod,
      },
    ];

    if (!organisationId)
      return res.status(400).send("organisationId is required");
    const invalidProducts = await verifyProducts(Object.keys(summary));
    if (invalidProducts?.length > 0) {
      return res.status(400).send({
        message:
          " Error! one or more of the products are not existing in the system",
      });
    }
    const verifyIndex = await checkIndex(Object.values(summary));
    if (!verifyIndex) {
      return res
        .status(400)
        .send(
          " Error! can't verify index of selected products for sale. Please check the product index and ensure they are unique"
        );
    }
    const lastSale = await SaleModel.findOne({ organisationId }).sort({
      createdAt: -1,
    });
    const saleIndex = lastSale?.saleIndex + 1 || 1;
    const sale = await SaleModel.create({ ...req.body, saleIndex, logs });
    if (!sale) return res.status(400).send({ message: "sale not recorded" });
    console.log("sale generated");
    const updatedProducts = await updateProducts(
      summary,
      sale._id,
      salesPerson
    );
    console.log("updated productssss", updatedProducts);
    if (updatedProducts === 0 || updatedProducts === undefined) {
      return res.status(400).send({
        message:
          "sales recored but couldnt update the product status. If this persist, please contact administrator",
      });
    }

    const params = { ...req.body, logs };
    if (paymentMethod !== "invoice") {
      const receipt = await generateReceipt(params, sale._id);
      if (!receipt) {
        return res
          .status(400)
          .send({ message: "sales recored but couldnt generate receipt" });
      }
      return res.status(200).send(receipt);
    }

    const invoice = await generateInvoice(params, sale._id);
    if (!invoice) {
      return res
        .status(400)
        .send({ message: "sales recored but couldnt generate invoice" });
    }
    return res.status(200).send(invoice);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const getSale = async (req, res) => {
  try {
    const { status } = req.query;
    if (!status) return res.status(400).send("no status provided");
    if (!req.query._id) return res.status(400).send("no saleId provided");
    const sale = await SaleModel.findById(req.query._id)
      .where("status")
      .equals(status)
      .lean();
    if (!sale) return res.status(400).send({ message: "sale not found" });
    return res.status(200).send({ message: "sale", sale: sale });
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const getAllSales = async (req, res) => {
  try {
    const { status } = req.query;
    if (!status) return res.status(400).send("no status provided");
    const organisationId = req.query.organisationId;
    if (!organisationId)
      return res.status(400).send("organisationId is required");
    const sales = await SaleModel.find({ organisationId })
      .where("status")
      .equals(status)
      .lean();
    return res.status(200).send(sales);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const editSale = async (req, res) => {
  try {
    const {
      _id,
      bankDetails,
      invoiceDate,
      branch,
      dueDate,
      summary,
      customerNote,
      deliveryCharge,
      subTotal,
      customerDetail,
      index,
      amountDue,
      salesNote,
      customerId,
      currency,
      totalSellingPrice,
      paymentMethod,
      user,
      reason,
    } = req.body;

    if (!_id) return res.status(400).send("sale_id is required");
    const invalidProducts = await verifyProducts(Object.keys(summary));
    if (invalidProducts?.length > 0) {
      return res.status(400).send({
        message:
          " Error! one or more of the products are not existing in the system",
      });
    }
    if (!user) return res.status(400).send("editing user is required");
    if (!reason)
      return res.status(400).send("reason for modification is required");
    const verifyIndex = await checkIndex(Object.values(summary));
    if (!verifyIndex) {
      return res
        .status(400)
        .send(
          " Error! can't verify index of selected products for sale. Please check the product index and ensure they are unique"
        );
    }
    console.log("_id", _id);
    const currentSales = await SaleModel.findById(_id);
    if (!currentSales) return res.status(400).send("Error!, sale not found");
    let currentInvoice = {};
    let currentReceipt = {};
    if (paymentMethod === "invoice") {
      currentInvoice = await InvoiceModel.findOne({ sale_id: _id });
    }
    if (paymentMethod === "receipt") {
      currentReceipt = await ReceiptModel.findOne({ sale_id: _id });
    }
    const difference = [];
    if (
      bankDetails?.bankName &&
      bankDetails?.bankName !== currentSales.bankDetails?.bankName
    ) {
      difference.push({
        field: "bank Details",
        old: currentSales.bankDetails?.bankName,
        new: bankDetails?.bankName,
      });
    }
    if (invoiceDate !== "undefined") {
      if (
        new Date(invoiceDate)?.setHours(0, 0, 0, 0) !==
        new Date(currentInvoice.invoiceDate)?.setHours(0, 0, 0, 0)
      ) {
        difference.push({
          field: "invoice date",
          old: displayDate(new Date(currentInvoice?.invoiceDate)),
          new: displayDate(new Date(invoiceDate)),
        });
      }
    }
    if (
      branch?.name &&
      currentSales.branch?.name &&
      branch?.name !== currentSales.branch?.name
    ) {
      difference.push({
        field: "branch",
        old: currentSales?.branch?.name,
        new: branch?.name,
      });
    }
    if (
      dueDate &&
      new Date(dueDate)?.setHours(0, 0, 0, 0) !==
        new Date(currentSales.dueDate)?.setHours(0, 0, 0, 0)
    ) {
      difference.push({
        field: "due date",
        old: displayDate(new Date(currentSales?.dueDate)),
        new: displayDate(new Date(dueDate)),
      });
    }
    if (customerNote && customerNote !== currentSales.customerNote) {
      difference.push({
        field: "customer note",
        old: currentSales?.customerNote,
        new: customerNote,
      });
    }
    if (deliveryCharge && deliveryCharge !== currentSales.deliveryCharge) {
      difference.push({
        field: "delivery charge",
        old: currentSales?.deliveryCharge,
        new: deliveryCharge,
      });
    }
    if (`${subTotal}` != currentSales.subTotal) {
      difference.push({
        field: "sub total",
        old: currentSales?.subTotal,
        new: subTotal,
      });
    }
    if (
      customerDetail?.firstName !== currentSales.customerDetail?.firstName ||
      customerDetail?.lastName !== currentSales.customerDetail?.lastName ||
      customerDetail?.phone !== currentSales.customerDetail?.phone ||
      customerDetail?.email !== currentSales.customerDetail?.email
    ) {
      difference.push({
        field: "customer detail",
        old:
          currentSales?.customerDetail?.firstName +
          " " +
          currentSales?.customerDetail?.lastName,
        new: customerDetail?.firstName + " " + customerDetail?.lastName,
      });
    }
    if (`${amountDue}` != currentSales?.amountDue) {
      difference.push({
        field: "amount due",
        old: currentSales.amountDue,
        new: amountDue,
      });
    }
    if (salesNote !== currentSales?.salesNote) {
      difference.push({
        field: "sales note",
        old: currentSales?.salesNote,
        new: salesNote,
      });
    }
    if (currency !== currentSales.currency) {
      difference.push({
        field: "currency",
        old: currentSales?.currency,
        new: currency,
      });
    }
    if (deliveryCharge !== currentSales.deliveryCharge) {
      difference.push({
        field: "delivery charge",
        old: currentSales?.deliveryCharge,
        new: deliveryCharge,
      });
    }
    if (paymentMethod !== currentSales.paymentMethod) {
      difference.push({
        field: "payment method",
        old: currentSales?.paymentMethod,
        new: paymentMethod,
      });
    }
    const log = {
      date: new Date(),
      user: user?.name,
      action: "edit",
      reason: reason,
      difference: difference,
    };

    const params = {
      bankDetails,
      invoiceDate,
      branch,
      dueDate,
      customerNote,
      deliveryCharge,
      subTotal,
      customerDetail,
      index,
      summary,
      amountDue,
      salesNote,
      customerId,
      currency,
      totalSellingPrice,
      paymentMethod,
    };

    const sale = await SaleModel.findByIdAndUpdate(
      req.body._id,
      { ...params },
      { new: true }
    );
    if (!sale && difference?.length === 0)
      return res.status(200).send("No changes made to the sale");
    if (!sale && difference?.length > 0)
      return res.status(400).send("Error! could not update sale");

    if (sale.paymentMethod === "invoice") {
      const invoice = await InvoiceModel.findOne({ sale_id: sale._id });
      const updatedInvoice = await InvoiceModel.findByIdAndUpdate(
        { _id: invoice._id },
        {
          ...params,
        }
      );
      if (!updatedInvoice) return res.status(400).send("invoice not updated");
      if (difference.length > 0) {
        const updateLog = await SaleModel.findByIdAndUpdate(
          sale._id,
          { $push: { logs: log } },
          { new: true }
        );
        if (!updateLog)
          return res.status(400).send("invoice updated but couldnt update log");
        const updateIvoiceLog = await InvoiceModel.findByIdAndUpdate(
          invoice._id,
          { $push: { logs: log } },
          { new: true }
        );
        if (!updateIvoiceLog)
          return res.status(400).send(" invoice modified but failed to update");
        return res.status(200).send(updateIvoiceLog);
      }
      return res.status(200).send(updatedInvoice);
    }
    const updatedReceipt = await ReceiptModel.findOneAndUpdate(
      { sale_id: _id },
      {
        ...params,
      }
    );
    if (!updatedReceipt) return res.status(400).send("receipt not updated");
    if (difference.length > 0) {
      const updateLog = await SaleModel.findByIdAndUpdate(
        sale._id,
        { $push: { logs: log } },
        { new: true }
      );
      if (!updateIvoiceLog)
        return res.status(400).send(" receipt modified but failed to update");
      const updateReceiptLog = await ReceiptModel.findByIdAndUpdate(
        updatedReceipt._id,
        { $push: { logs: log } },
        { new: true }
      );
      if (!updateReceiptLog)
        return res.status(400).send(" Receipt modified but failed to update");
      return res.status(200).send(updateReceiptLog);
    }

    return res.status(200).send(updatedReceipt);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const addComment = async (req, res) => {
  try {
    const { _id, comment, customerPortal, user } = req.body;

    if (!_id) return res.status(400).send("sale_id is required");
    if (!comment) return res.status(400).send("comment is required");
    if (!user?.name) return res.status(400).send("user is required");
    const currentSales = await SaleModel.findById(_id);

    if (!currentSales) return res.status(400).send("Error!, sale not found");
    let currentInvoice = {};
    let currentReceipt = {};
    if (currentSales.paymentMethod === "invoice") {
      currentInvoice = await InvoiceModel.findOne({ sale_id: _id });
    }
    if (currentSales.paymentMethod !== "invoice") {
      currentReceipt = await ReceiptModel.findOne({ sale_id: _id });
    }

    const log = {
      date: new Date(),
      user: user?.name,
      action: "comment",
      comment,
      customerPortal,
    };
    const updateLog = await SaleModel.findByIdAndUpdate(
      _id,
      { $push: { logs: log } },
      { new: true }
    );
    if (!updateLog)
      return res.status(400).send("invoice updated but couldnt update log");
    if (updateLog.paymentMethod === "invoice") {
      const updateIvoiceLog = await InvoiceModel.findByIdAndUpdate(
        currentInvoice._id,
        { $push: { logs: log } },
        { new: true }
      );
      if (!updateIvoiceLog)
        return res.status(400).send(" invoice modified but failed to update");
      return res.status(200).send(updateIvoiceLog);
    }
    console.log("currentReceipt", currentReceipt);
    const updateReceiptLog = await ReceiptModel.findByIdAndUpdate(
      currentReceipt._id,
      { $push: { logs: log } },
      { new: true }
    );
    if (!updateReceiptLog)
      return res.status(400).send(" Receipt modified but failed to update");
    return res.status(200).send(updateReceiptLog);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const deleteComment = async (req, res) => {
  try {
    const { _id, commentId, user, organisationId } = req.body;

    if (!_id) return res.status(400).send("sale_id is required");
    if (!commentId) return res.status(400).send("commentId is required");
    if (!user?.name) return res.status(400).send("user is required");
    if (!organisationId)
      return res.status(400).send("organisationId is required");

    const currentSales = await SaleModel.findOne({
      organisationId,
      _id,
    });
    if (!currentSales) return res.status(400).send("Error!, sale not found");
    let currentInvoice = {};
    let currentReceipt = {};
    if (currentSales.paymentMethod === "invoice") {
      currentInvoice = await InvoiceModel.findOne({
        sale_id: _id,
        organisationId,
        logs: { $elemMatch: { _id: commentId } },
      });
      if (!currentInvoice)
        return res.status(400).send("comment on invoice not found");
    }
    if (currentSales.paymentMethod === "receipt") {
      currentReceipt = await ReceiptModel.findOne({
        sale_id: _id,
        organisationId,
        logs: { $elemMatch: { _id: commentId } },
      });
      if (!currentReceipt)
        return res.status(400).send("comment on receipt not found");
    }

    const updateLog = await SaleModel.findByIdAndUpdate(
      { _id: currentSales._id },
      { $pull: { logs: { _id: commentId } } },
      { new: true }
    );
    if (!updateLog)
      return res.status(400).send("invoice updated but couldnt update log");
    if (updateLog.paymentMethod === "invoice") {
      const updateIvoiceLog = await InvoiceModel.findByIdAndUpdate(
        { _id: currentInvoice._id },
        { $pull: { logs: { _id: commentId } } },
        { new: true }
      );
      if (!updateIvoiceLog)
        return res.status(400).send(" invoice modified but failed to update");
      return res.status(200).send(updateIvoiceLog);
    }

    const updateReceiptLog = await ReceiptModel.findByIdAndUpdate(
      { _id: currentReceipt._id },
      { $pull: { logs: { _id: commentId } } },
      { new: true }
    );
    if (!updateReceiptLog)
      return res.status(400).send(" Receipt modified but failed to update");
    return res.status(200).send(updateReceiptLog);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const deleteSale = async (req, res) => {
  try {
    const { _ids, reason, user } = req.body;

    const log = {
      date: new Date(),
      user: user?.name,
      action: "delete",
      reason: reason,
      details: "deleted sale",
    };

    if (_ids && _ids?.length === 0)
      return res.status(400).send("sale_id is required");
    if (!reason) return res.status(400).send("reason is required");
    if (!user?.name) return res.status(400).send("user is required");
    let invalidSales = [];
    const validate = _ids.map(async (_id) => {
      const currentSales = await SaleModel.findById(_id);
      if (!currentSales) invalidSales.push(_id);
      await Promise.all(validate);
      if (invalidSales?.length > 0)
        return res
          .status(400)
          .send("Error!, cant find sales with ids: " + invalidSales);
    });

    let mutatedSales = [];
    const mutate = _ids.map(async (_id) => {
      const updateLog = await SaleModel.findByIdAndUpdate(
        _id,
        { status: "disabled", $push: { logs: log } },
        { new: true }
      );
      if (!updateLog) mutatedSales.push(_id);
      let currentInvoice = {};
      let currentReceipt = {};
      if (updateLog?.paymentMethod === "invoice") {
        currentInvoice = await InvoiceModel.findOne({ sale_id: _id });
        const updateIvoiceLog = await InvoiceModel.findByIdAndUpdate(
          { _id: currentInvoice?._id },
          { status: "disabled", $push: { logs: log } },
          { new: true }
        );
        if (!updateIvoiceLog) {
          mutatedSales.push(currentInvoice?._id);
        }
      } else {
        currentReceipt = await ReceiptModel.findOne({ sale_id: _id });
        const updateReceiptLog = await ReceiptModel.findByIdAndUpdate(
          { _id: currentReceipt._id },
          { status: "disabled", $push: { logs: log } },
          { new: true }
        );
        if (!updateReceiptLog) {
          mutatedSales.push(currentReceipt?._id);
        }
      }
    });
    await Promise.all(mutate);
    if (mutatedSales.length > 0) {
      return res.status(400).send("Error!, in deleting sales");
    }
    return res.status(200).send({ message: "Successfully deleted sales" });
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const restoreSale = async (req, res) => {
  try {
    const { _ids, reason, user } = req.body;

    const log = {
      date: new Date(),
      user: user?.name,
      action: "restore",
      reason: reason,
      details: "restored sale",
    };

    if (_ids && _ids?.length === 0)
      return res.status(400).send("sale_id is required");
    if (!reason) return res.status(400).send("reason is required");
    if (!user?.name) return res.status(400).send("user is required");
    let invalidSales = [];
    const validate = _ids.map(async (_id) => {
      const currentSales = await SaleModel.findById(_id);
      if (!currentSales) invalidSales.push(_id);
      await Promise.all(validate);
      if (invalidSales?.length > 0)
        return res
          .status(400)
          .send("Error!, cant find sales with ids: " + invalidSales);
    });

    let mutatedSales = [];
    const mutate = _ids.map(async (_id) => {
      const updateLog = await SaleModel.findByIdAndUpdate(
        _id,
        { status: "active", $push: { logs: log } },
        { new: true }
      );
      if (!updateLog) mutatedSales.push(_id);
      let currentInvoice = {};
      let currentReceipt = {};
      if (updateLog?.paymentMethod === "invoice") {
        currentInvoice = await InvoiceModel.findOne({ sale_id: _id });
        const updateIvoiceLog = await InvoiceModel.findByIdAndUpdate(
          { _id: currentInvoice?._id },
          { status: "active", $push: { logs: log } },
          { new: true }
        );
        if (!updateIvoiceLog) {
          mutatedSales.push(currentInvoice?._id);
        }
      } else {
        currentReceipt = await ReceiptModel.findOne({ sale_id: _id });
        const updateReceiptLog = await ReceiptModel.findByIdAndUpdate(
          { _id: currentReceipt._id },
          { status: "active", $push: { logs: log } },
          { new: true }
        );
        if (!updateReceiptLog) {
          mutatedSales.push(currentReceipt?._id);
        }
      }
    });
    await Promise.all(mutate);
    if (mutatedSales.length > 0) {
      return res.status(400).send("Error!, in deleting sales");
    }
    return res.status(200).send({ message: "Successfully deleted sales" });
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

module.exports = {
  createSale,
  getSale,
  getAllSales,
  editSale,
  deleteSale,
  addComment,
  deleteComment,
  restoreSale,
};
