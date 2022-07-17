const AutoGeneratorModel = require("../models/autoGenerator/index");
const OrganisationProfileModel = require("../models/organisationProfile");

const getNewInvoiceNo = async (req, res) => {
  try {
    const organisationId = req.query.organisationId;
    if (!organisationId)
      return res.status(400).send("organisationId is required");
    const autoGenerator = await AutoGeneratorModel.findOne({ organisationId });
    if (!autoGenerator) return res.status(400).send("autoGenerator not found");
    const invoiceNo = autoGenerator.nextAutoInvoiceNo;
    const prefix = autoGenerator.invoicePrefix;
    const next = prefix + invoiceNo;
    // const newAutoInvoiceNo = lastAutoInvoiceNo + 1;
    // const invoiceNo = `INV-${newAutoInvoiceNo}`;
    return res.status(200).send({ invoiceNo: next });
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const getCurrentConfig = async (req, res) => {
  try {
    const organisationId = req.query.organisationId;
    if (!organisationId)
      return res.status(400).send("organisationId is required");
    const autoGenerator = await AutoGeneratorModel.findOne({ organisationId });
    if (!autoGenerator) return res.status(400).send("autoGenerator not found");
    const organisation = await OrganisationProfileModel.findOne({
      _id: organisationId,
    });
    const autoInvoiceNo = organisation.autoInvoiceNo;
    const config = {
      autoInvoiceNo,
      autoGenerator,
    };
    return res.status(200).send(config);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const updateAutoGenerator = async (req, res) => {
  try {
    const organisationId = req.body.organisationId;
    if (!organisationId)
      return res.status(400).send("organisationId is required");
    const updatedOrganisation = await OrganisationProfileModel.findOneAndUpdate(
      {
        _id: organisationId,
      },
      { autoInvoiceNo: req.body.autoInvoiceNo }
    );
    console.log(
      "🚀 ~ file: autoGenerator.js ~ line 74 ~ updateAutoGenerator ~ updatedOrganisation",
      updatedOrganisation
    );

    if (!updatedOrganisation)
      return res.status(400).send("autoGenerator not found");
    return res.status(200).send(updatedOrganisation);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const setDefaultInvoicePolicy = async (req, res) => {
  try {
    const { organisationId, defaultId } = req.body;

    if (!organisationId)
      return res.status(400).send("organisationId is required");
    if (!defaultId)
      return res.status(400).send({ message: "defaultId is required" });

    const autoGenerator = await AutoGeneratorModel.find({ organisationId });
    if (!autoGenerator)
      return res
        .status(400)
        .send("autoGenerator for the organisation not found");

    // const removeDefaultPolicy = await removeDefault(
    //   organisationId,
    //   autoGenerator
    // );
    // if (removeDefaultPolicy.length === 0) {
    //   return res
    //     .status(400)
    //     .send(
    //       "error in removing default policy,  if this continue, contact admin"
    //     );
    // }
    const removeDefaultPolicy = await AutoGeneratorModel.findOneAndUpdate(
      {
        organisationId,
        invoiceDuePolicy: { $elemMatch: { default: true } },
      },

      { $set: { "invoiceDuePolicy.$.default": false } },
      { new: true }
    );
    if (!removeDefaultPolicy) {
      return res
        .status(400)
        .send(
          "error in removing default policy,  if this continue, contact admin"
        );
    }
    const updateDefaultPolicy = await AutoGeneratorModel.findOneAndUpdate(
      {
        organisationId,
        invoiceDuePolicy: { $elemMatch: { _id: defaultId } },
      },

      { $set: { "invoiceDuePolicy.$.default": true } },
      { new: true }
    );
    if (!updateDefaultPolicy) {
      return res
        .status(400)
        .send(
          "error in updating default policy, if this continue, contact admin"
        );
    }
    return res.status(200).send(updateDefaultPolicy);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const deleteInvoicePolicy = async (req, res) => {
  try {
    const { organisationId, _id } = req.body;

    if (!organisationId)
      return res.status(400).send("organisationId is required");
    if (!_id)
      return res.status(400).send("policy id to be deleted is required");
    const policy = await AutoGeneratorModel.findOne({
      organisationId,
      invoiceDuePolicy: { $elemMatch: { _id: _id } },
    });
    if (!policy) return res.status(400).send("policy not found");
    if (policy.core) {
      return res.status(400).send("cannot delete core policy");
    }
    console.log("reached here");
    const removePolicy = await AutoGeneratorModel.findOneAndUpdate(
      {
        organisationId,
      },

      { $pull: { invoiceDuePolicy: { _id: _id } } },
      { new: true }
    );
    console.log("removePolicy", removePolicy);
    if (!removePolicy) {
      return res
        .status(400)
        .send(
          "error in removing default policy,  if this continue, contact admin"
        );
    }

    return res.status(200).send(removePolicy);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const updatePolicy = async (organisationId, data, res) => {
  return await data.reduce(async (acc, curr) => {
    console.log("acc", acc);
    let result = await acc;
    const { name, value, _id, newPolicy } = curr;
    if (_id && !newPolicy) {
      const updatePolicy = await AutoGeneratorModel.findOneAndUpdate(
        {
          organisationId,
          invoiceDuePolicy: { $elemMatch: { _id } },
        },
        {
          $set: { "invoiceDuePolicy.$.name": name },
          $set: { "invoiceDuePolicy.$.value": value },
        },
        { new: true }
      );
      if (!updatePolicy) {
        return res
          .status(400)
          .send("error in updating  policy, if this continue, contact admin");
      }
      result.push(updatePolicy);
    } else {
      const addPolicy = await AutoGeneratorModel.findOneAndUpdate(
        {
          organisationId,
        },
        {
          $push: {
            invoiceDuePolicy: {
              name: name,
              value: Number(value) || 0,
              default: false,
              core: false,
            },
          },
        },
        { new: true }
      );
      if (!addPolicy) {
        return res
          .status(400)
          .send("error in adding new policy, if this continue, contact admin");
      }
      result.push(addPolicy);
    }

    return result;
  }, []);
};

const updateInvoicePolicy = async (req, res) => {
  try {
    const { organisationId, invoiceDuePolicy } = req.body;
    if (!organisationId)
      return res.status(400).send("organisationId is required");
    if (!invoiceDuePolicy)
      return res.status(400).send("invoiceDuePoilcy is required");
    if (!Array.isArray(invoiceDuePolicy))
      return res.status(400).send("invoiceDuePolicy must be an array");
    let valid = true;
    const validatePolicy = invoiceDuePolicy.map((policy) => {
      const { name, value, _id, newPolicy } = policy;
      if (name === " ") valid = false;
      if (typeof value !== "number") valid = false;
      if (value !== 0 && !value) valid = false;
      if (!_id && !newPolicy) valid = false;
      if (newPolicy && _id) valid = false;
    });
    if (!valid) return res.status(400).send("invalid parameters");

    const result = await updatePolicy(organisationId, invoiceDuePolicy, res);
    if (result.length === 0) {
      return res
        .status(400)
        .send("error in updating  policy, if this continue, contact admin");
    }
    return res.status(200).send(result);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

module.exports = {
  getNewInvoiceNo,
  getCurrentConfig,
  updateAutoGenerator,
  setDefaultInvoicePolicy,
  deleteInvoicePolicy,
  updateInvoicePolicy,
};
