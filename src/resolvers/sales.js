const SaleModel = require("../models/sales");
const RecieptModel = require("../models/receipt");
const InvoiceModel = require("../models/invoice");
const ProductModel = require("../models/products");
const TagModel = require("../models/tags");

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

const generateReceipt = async (data) => {
  console.log("generating receipt");
  try {
    const { organisationId } = data;
  
    recieptDate = new Date();
    const lastReceipt = await RecieptModel.findOne({ organisationId }).sort({
      createdAt: -1,
    });
    const receipt = await RecieptModel.create({
      ...data,
      recieptNo: lastReceipt?.recieptNo + 1 || 1,
      recieptDate,
    });
    return receipt;
  } catch (error) {
    console.log("error", error);
  }
};
const generateInvoice = async (data) => {
  console.log("generating receipt");
  try {
    const { organisationId } = data;
  
    invoiceDate = new Date();
    const lastInvoice = await InvoiceModel.findOne({ organisationId }).sort({
      createdAt: -1,
    });
    const invoice = await InvoiceModel.create({
      ...data,
      invoiceNo: lastInvoice?.invoiceNo + 1 || 1,
      invoiceDate,
    });
    return invoice;
  } catch (error) {
    console.log("error", error);
  }
};

const updateProducts = async (summary, sale_id, salesPerson) => {
  try {
    let updatedProducts = 0;
   const myPromise =  Object.entries(summary).map(
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
    )
    await Promise.all(myPromise)
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
      return res.status(400).send({ message: "organisationId is required" });
    const invalidProducts = await verifyProducts(Object.keys(summary));
    if (invalidProducts?.length > 0) {
      return res.status(400).send({
        message:
          " Error! one or more of the products are not existing in the system",
      });
    }
    const sale = await SaleModel.create(req.body);
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

    if (paymentMethod !== "invoice") {
      const receipt = await generateReceipt(req.body);
      if (!receipt) {
        return res
          .status(400)
          .send({ message: "sales recored but couldnt generate receipt" });
      }
      return res.status(200).send(receipt);
    }
    const invoice = await generateInvoice(req.body);
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
    const { _id } = req.body;
    if (!_id) return res.status(400).send({ message: "sale_id is required" });
    const sale = await SaleModel.findByIdAndUpdate(
      req.body._id,
      { ...req.body },
      { new: true }
    );
    if (!sale) return res.status(400).send({ message: "sale not found" });
    return res.status(200).send({ message: "sale", sale: sale });
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
