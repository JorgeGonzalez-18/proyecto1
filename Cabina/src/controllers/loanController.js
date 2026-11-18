const Loan = require("../models/Loan");
const { paginate } = require("../middlewares/queryHelper");
const { createError } = require("../middlewares/errorHandler");

const getLoans = async (req, res) => {
  const baseFilter = {};

  if (req.query.status) {
    baseFilter.status = req.query.status;
  }
  if (req.query.booking) {
    baseFilter.booking = req.query.booking;
  }
  if (req.query.equipment) {
    baseFilter.equipment = req.query.equipment;
  }

  const result = await paginate(Loan, req.query, {
    allowedSort: ["units", "createdAt"],
    defaultSort: { createdAt: -1 },
    searchFields: ["status"],
    baseFilter,
    populate: [
      { path: "booking", select: "room band date startHour endHour status" },
      { path: "equipment", select: "name category" },
    ],
  });

  return res.status(200).json(result);
};

const getLoanById = async (req, res) => {
  const loan = await Loan.findById(req.params.id)
    .populate({
      path: "booking",
      select: "room band date startHour endHour status",
    })
    .populate({
      path: "equipment",
      select: "name category",
    });

  if (!loan) {
    throw createError(404, "Prestamo no encontrado");
  }

  return res.status(200).json(loan);
};

module.exports = {
  getLoans,
  getLoanById,
};
