const jobRequest = require("./jobRequest");

function getRandomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

const generateUniqueCode = async (organisationId) => {
  console.log("generating code");
  let code;
  let found = true;

  do {
    const randomVal = getRandomInt(1000000, 9999999);
    code = `${randomVal}`;
    const exist = await jobRequest.findOne({
      organisationId,
      requestId: code,
    });
    if (exist) {
      found = true;
    } else {
      found = false;
    }
    // product = await TagModel.countDocumentsWithDeleted({
    //   productCode: productCode,
    //   organisationId: organisationId,
    // });
  } while (!found);

  return code.toString();
};

const createJobRequest = async (req, res) => {
  try {
    const {
      customer,
      weight,
      truckType,
      pickUpDate,
      pickUpAddress,
      dropOffAddress,
      price,
      organisationId,
    } = req.body;
    if (!customer) {
      return res
        .status(400)
        .send({ error: "Customer is required. Please provide customer" });
    }
    if (!weight) {
      return res
        .status(400)
        .send({ error: "Weight is required. Please provide weight" });
    }
    if (!truckType) {
      return res
        .status(400)
        .send({ error: "Truck type is required. Please provide truck type" });
    }
    if (!pickUpDate) {
      return res.status(400).send({
        error: "Pick up date is required. Please provide pick up date",
      });
    }
    if (!pickUpAddress) {
      return res.status(400).send({
        error: "Pick up address is required. Please provide pick up address",
      });
    }
    if (!dropOffAddress) {
      return res.status(400).send({
        error: "Drop off address is required. Please provide drop off address",
      });
    }
    if (!price) {
      return res
        .status(400)
        .send({ error: "Price is required. Please provide price" });
    }
    if (!organisationId) {
      return res.status(400).send({
        error: "Organisation id is required. Please provide organisation id",
      });
    }
    const requestId = await generateUniqueCode(organisationId);
    const createdJobRequest = await jobRequest.create({
      customer,
      weight,
      truckType,
      pickUpDate,
      pickUpAddress,
      dropOffAddress,
      price,
      organisationId,
      requestId,
    });
    if (!createdJobRequest) {
      return res.status(400).send({
        error:
          "Could not create job request. Please try again later or contact support",
      });
    }
    return res.status(200).send({ data: createdJobRequest });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

const getJobRequests = async (req, res) => {
  try {
    const { organisationId, disabled } = req.query;
    if (!organisationId) {
      return res.status(400).send({
        error: "Organisation id is required. Please provide organisation id",
      });
    }
    const jobRequests = await jobRequest.find({
      organisationId,
      disabled: disabled || false,
    });
    if (!jobRequests) {
      return res.status(400).send({
        error: "Could not get job requests. Please try again later",
      });
    }
    return res.status(200).send({ data: jobRequests });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

const getJobRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    if (!requestId) {
      return res.status(400).send({
        error: "Request id is required. Please provide request id",
      });
    }
    const jobRequest = await jobRequest.findOne({
      requestId,
    });
    if (!jobRequest) {
      return res.status(400).send({
        error: "job request not found",
      });
    }
    return res.status(200).send({ data: jobRequest });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

const editJobRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      return res
        .status(400)
        .send({ error: "Request id is required. Please provide request id" });
    }
    const jobRequest = await jobRequest.findOneAndUpdate(
      { requestId },
      req.body,
      { new: true }
    );
    return res.status(200).send({ data: jobRequest });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};
const deleteAndRestoreJobRequest = async (req, res) => {
  try {
    const { requestId, disabled } = req.params;

    if (!requestId) {
      return res
        .status(400)
        .send({ error: "Request id is required. Please provide request id" });
    }
    const jobRequest = await jobRequest.findOneAndUpdate(
      { requestId },
      { disabled: disabled || false },
      { new: true }
    );
    return res.status(200).send({ data: jobRequest });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

module.exports = {
    createJobRequest,
    getJobRequests,
    getJobRequest,
    editJobRequest,
    deleteAndRestoreJobRequest,
};