const OrganisationPartnerModel = require("../models/organisationPartner");

const canDeleteOrEditOrganisationPartnerRemark = async (param) => {
  const { partnerId, remarkId, userId } = param;
  let canPerformAction = false;
  const partner = await OrganisationPartnerModel.findOne({
    _id: partnerId,
  });
  if (partner.remarks?.length > 0) {
    const remark = partner.remarks.find(
      (remark) => remark._id.toString() === remarkId
    );
    if (remark) {
      canPerformAction = remark.userId.toString() === userId;
    }
  }
  return canPerformAction;
};

module.exports = {
  canDeleteOrEditOrganisationPartnerRemark,
};
