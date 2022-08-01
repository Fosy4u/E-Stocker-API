const SaleModel = require("../models/sales");
const RecieptModel = require("../models/receipt");
const InvoiceModel = require("../models/invoice");
const ProductModel = require("../models/products");
const AutoGeneratorModel = require("../models/autoGenerator/index");
const TagModel = require("../models/tags");
const QRCode = require("qrcode");

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
    const { nextAutoRecieptNo, recieptPrefix } = autoGenerator;
    const recieptNo = recieptPrefix + nextAutoRecieptNo;

    const exist = await RecieptModel.findOne({ organisationId, recieptNo });
    if (!exist) {
      result = { newAutoGenerator: { ...autoGenerator }, recieptNo };

      if (result !== undefined) {
        return result;
      }
    } else {
      const newAutoGenerator = autoGenerator;
      newAutoGenerator.nextAutoRecieptNo = nextAutoRecieptNo + 1;

      return (recursion = await getReceiptNo(organisationId, newAutoGenerator));
    }
  } catch (error) {
    return false;
  }
};

const generateReceipt = async (data, sale_id) => {
  console.log("generating receipt");
  try {
    const { organisationId, customerDetail, organisation, totalSellingPrice } =
      data;
    const autoGenerator = await AutoGeneratorModel.findOne({ organisationId });
    if (!autoGenerator) return false;
    const nextAutoRecieptNo = await getReceiptNo(organisationId, autoGenerator);
    const { newAutoGenerator, recieptNo } = nextAutoRecieptNo;
    if (newAutoGenerator) {
      const update = await AutoGeneratorModel.findOneAndUpdate(
        { organisationId },
        { ...newAutoGenerator },
        { new: true }
      );
    }

    if (recieptNo === undefined) {
      return false;
    }
    const { firstName, lastName } = customerDetail;
    const stringData = `${organisation?.name} ${
      recieptNo || 1 + "-" + firstName
    } ${lastName + "-total-" + totalSellingPrice.toFixed(2)}`;
    const QrCode = await generateQRCode(stringData);

    const recieptDate = new Date();

    const receipt = await RecieptModel.create({
      ...data,
      //  recieptNo: lastReceipt?.recieptNo + 1 || 1,
      recieptNo,
      recieptDate,
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
    const sale = await SaleModel.create({ ...req.body, saleIndex });
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

    const params = { ...req.body };
    if (paymentMethod !== "invoice") {
      const sale_id = sale._id;
      const receipt = await generateReceipt(params, sale_id);
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
    if (!req.query._id)
      return res.status(400).send({ message: "no saleId provided" });
    const sale = await SaleModel.findById(req.query._id);
    if (!sale) return res.status(400).send({ message: "sale not found" });
    return res.status(200).send({ message: "sale", sale: sale });
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const getAllSales = async (req, res) => {
  try {
    const organisationId = req.query.organisationId;
    if (!organisationId)
      return res.status(400).send({ message: "organisationId is required" });
    const sales = await SaleModel.find({ organisationId });
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
 
    } = req.body;

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
    };
    if (!_id) return res.status(400).send({ message: "sale_id is required" });
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
    const sale = await SaleModel.findByIdAndUpdate(
      req.body._id,
      { ...params },
      { new: true }
    );
    if (!sale) return res.status(400).send({ message: "sale not found" });
    const paymentMethod = sale.paymentMethod;
    if (paymentMethod === "invoice") {
      const invoice = await InvoiceModel.findOne({ sale_id: sale._id });
      const updatedInvoice = await InvoiceModel.findByIdAndUpdate(
        { _id: invoice._id },
        {
          ...params,
        }
      );
      if (!updatedInvoice) return res.status(400).send("invoice not updated");
      return res.status(200).send(updatedInvoice);
    }
    const updatedReceipt = await RecieptModel.findOneAndUpdate(
      { sale_id: _id },
      {
        ...params,
      }
    );
    if (!updatedReceipt) return res.status(400).send("receipt not updated");
    return res.status(200).send(updatedReceipt);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const deleteSale = async (req, res) => {
  try {
    const { _id } = req.body;
    if (!_id) return res.status(400).send({ message: "sale_id is required" });
    const disabled = await SaleModel.findByIdAndUpdate(
      _id,
      { status: "disabled" },
      { new: true }
    );
    if (!disabled) return res.status(400).send({ message: "sale not found" });
    return res.status(200).send({ message: "sale", sale: disabled });
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
module.exports = { createSale, getSale, getAllSales, editSale, deleteSale };
