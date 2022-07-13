const AutoGeneratorModel = require("../models/autoGenerator/index");


const getNewInvoiceNo = async (req, res) => {
    try {
        const organisationId = req.query.organisationId;
        if (!organisationId)
        return res.status(400).send({ message: "organisationId is required" });
        const autoGenerator = await AutoGeneratorModel.find({ organisationId });
        if (!autoGenerator) return res.status(400).send({ message: "autoGenerator not found" });
        const lastAutoInvoiceNo = autoGenerator[0].lastAutoInvoiceNo;
        if (!lastAutoInvoiceNo) return res.status(400).send({ message: "cants fetch invoice no. if this persisit, plaease contact administrator" });
        const newAutoInvoiceNo = lastAutoInvoiceNo + 1;
        const invoiceNo = `INV-${newAutoInvoiceNo}`;
        return res.status(200).send(newAutoInvoiceNo);
    } catch (error) {
        return res.status(500).send(error.message);
    }
    }
