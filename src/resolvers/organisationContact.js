const OrganisationContactModel = require("../models/organisationContact");

const createOrganisationContact = async (req, res) => {
  const { email, organisationId } = req.body;
  try {
    if (!email) return res.status(400).send({ message: "email is required" });
    if (!organisationId)
      return res.status(400).send({ message: "organisationId is required" });
    console.log("email", email);
    const contact = await OrganisationContactModel.findOne({
      email,
      organisationId,
    });
    console.log("contact", contact);
    if (contact) {
      return res
        .status(400)
        .send("oops! A contact with same email address is already existing.");
    }

    const params = {
      ...req.body,
      isAdmin: true,
    };
    const createContact = new OrganisationContactModel({ ...params });
    const newContact = await createContact.save();
    if (newContact) {
  
      const log = req.body.log;

      const updateLog = await OrganisationContactModel.findByIdAndUpdate(
        newContact._id,
        // { name, category, price },

        { $push: { logs: log } },
        { new: true }
      );
      return res.status(200).send(newContact);
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const getOrganisationContact = async (req, res) => {
  try {
    const { _id } = req.query;
    if (!_id)
      return res.status(400).send({ message: "contact_id is required" });
    const contact = await OrganisationContactModel.findById({ _id });
    if (!contact) return res.status(400).send({ message: "contact not found" });
    return res.status(200).send(contact);
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
          (invoice) => invoice?.invoiceId === _id.toString()
        );
        if (found) {
          amountpaid += Number(found.appliedAmount);
        }
      }
    })
  );
  return amountpaid;
}

const getOutstandingDebt = async (customerId,  organisationId) => {
  let outstandingDebt = 0
  const invoice = await InvoiceModel.find({
    customerId,
    organisationId,
    stage: { $eq: "sent" },
    status: { $eq: "active" },
  }).lean();
  if (!invoice) return outstandingDebt;

  let collection = [];
  await Promise.all(
    invoice.map(async (invoice) => {
      const newInvoice = { ...invoice };
      const { linkedReceiptList, _id, amountDue } = newInvoice;
      let amountPaid = 0;
      if (linkedReceiptList?.length > 0) {
        amountPaid = await calcAmountPaid(linkedReceiptList, _id);
      }
      newInvoice.amountPaid = Number(amountPaid);
      newInvoice.balance = Number(Number(amountDue) - Number(amountPaid));
      if (newInvoice.balance > 0) {
        collection.push(newInvoice);
      }
    })
  );

  return res.status(200).send(collection);
}

const getAllOrganisationContacts = async (req, res) => {
  try {
    const { organisationId, contactType, status } = req.query;
    if (!organisationId)
      return res.status(400).send({ message: "organisationId is required" });
    if (contactType === "customer" && status) {
      const contacts = await OrganisationContactModel.find({
        organisationId,
        status,
        contactType,
      });

      return res.status(200).send(contacts);
    }
    if (contactType && status) {
      const contacts = await OrganisationContactModel.find({
        organisationId,
        contactType,
        status,
      });

      return res.status(200).send(contacts);
    }

    if (contactType && !status) {
      const contacts = await OrganisationContactModel.find({ organisationId })
        .where("contactType")
        .equals(contactType);
      return res.status(200).send(contacts);
    }
    if (!contactType && status) {
      const contacts = await OrganisationContactModel.find({ organisationId })
        .where("status")
        .equals(status);
      return res.status(200).send(contacts);
    }
    const contacts = await OrganisationContactModel.find({ organisationId });
    return res.status(200).send(contacts);
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const editOrganisationContact = async (req, res) => {
  try {
    console.log("starting edit", req.body);

    const { _id } = req.body;
    if (!_id)
      return res.status(400).send({ message: "contact_id is required" });
    const update = await OrganisationContactModel.findByIdAndUpdate(
      _id,
      { ...req.body },
      { new: true }
    );
    if (update) {
      const log = req.body.log;
      const updateLog = await OrganisationContactModel.findByIdAndUpdate(
        update._id,
        // { name, category, price },

        { $push: { logs: log } },
        { new: true }
      );
      return res.status(200).send(update);
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

const deleteContact = async (contacts) => {
  console.log("starting del");
  return contacts.reduce(async (acc, contact) => {
    const { _id } = contact;
    const result = await acc;
    const existingContact = await OrganisationContactModel.findById(_id);
    const disabled = await OrganisationContactModel.findByIdAndUpdate(
      _id,
      { status: "disabled" },
      { new: true }
    );
    if (disabled) {
      const log = contact.log;
      const updateLog = await OrganisationContactModel.findByIdAndUpdate(
        disabled._id,

        { $push: { logs: log } },
        { new: true }
      );
      result.push(contact);
    }

    return result;
  }, []);
};

const deleteOrganisationContact = async (req, res) => {
  try {
    console.log("starting edit", req.body);

    const disabledContacts = await deleteContact(req.body);
    if (disabledContacts.length > 0) {
      console.log("update", disabledContacts);
      return res.status(200).send(disabledContacts);
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};
const restoreContact = async (contacts) => {
  console.log("starting del");
  return contacts.reduce(async (acc, contact) => {
    const { _id } = contact;
    const result = await acc;
    const existingContact = await OrganisationContactModel.findById(_id);
    const restored = await OrganisationContactModel.findByIdAndUpdate(
      _id,
      { status: "active" },
      { new: true }
    );
    if (restored) {
      const log = contact.log;
      const updateLog = await OrganisationContactModel.findByIdAndUpdate(
        restored._id,
        // { name, category, price },

        { $push: { logs: log } },
        { new: true }
      );
      result.push(contact);
    }

    return result;
  }, []);
};

const restoreOrganisationContact = async (req, res) => {
  try {
    console.log("starting edit", req.body);

    const restoredContacts = await restoreContact(req.body);
    if (restoredContacts.length > 0) {
      return res.status(200).send(restoredContacts);
    }
  } catch (error) {
    return res.status(500).send(error.message);
  }
};

module.exports = {
  createOrganisationContact,
  getAllOrganisationContacts,
  getOrganisationContact,
  editOrganisationContact,
  deleteOrganisationContact,
  restoreOrganisationContact,
};
