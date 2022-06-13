const OrganisationProfileModel = require("../models/organisationProfile");
const OrganisationUserModel = require("../models/organisationUsers");

const createOrganisationUsers = async (req, res) => {
  const { email, firstName, lastName, password } = req.body;
  try {
    const user = OrganisationUserModel.find({ email });
    if (user) {
      return res
        .status(400)
        .send("An account with same email address is already existing.");
    }

    const params = {
      firstName,
      lastName,
      password,
      organisationId: newOrganisation._id,
      isAdmin: true,
    };
    const createUser = new OrganisationUserModel({ ...params });
    const newUser = createUser.save();
    if (newUser) {
      console.log("new user successful", newUser);
      return res.status(200).send(newUser);
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const getOrganisationUser = async (req, res) => {
  try {
    const { userId } = req.query;
    const user = await OrganisationUserModel.find({ userId });
    if (!user) return res.status(400).send({ message: "user not found" });
    return res.status(200).send({ message: "current user", user: user });
  } catch (error) {
    return res.status(500).send(error.message);
  }
};



module.exports = {
  createOrganisationUsers,
  getOrganisationUser,
};
