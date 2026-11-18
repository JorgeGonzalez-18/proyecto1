const Band = require("../models/Band");
const Musician = require("../models/Musician");
const Booking = require("../models/Booking");

const { paginate } = require("../middlewares/queryHelper");
const { createError } = require("../middlewares/errorHandler");

const createBand = async (req, res) => {
  const band = await Band.create(req.body);
  if (!band) {
    throw createError(404, "Banda no encontrada");
  }
  return res
    .status(201)
    .json({ message: "Banda creada exitosamente", data: band });
};

const getBands = async (req, res) => {
  const result = await paginate(Band, req.query, {
    allowedSort: ["name", "createdAt"],
    defaultSort: { name: 1 },
    searchFields: ["name"],
  });
  if (!result) {
    throw createError(404, "No se encontraron bandas");
  }
  return res.status(200).json(result);
};

const getBandById = async (req, res) => {
  const band = await Band.findById(req.params.id).populate("musicians");
  if (!band) {
    throw createError(404, "Banda no encontrada");
  }
  return res.status(200).json(band);
};

const updateBand = async (req, res) => {
  const band = await Band.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!band) {
    throw createError(404, "Banda no encontrada");
  }
  return res.status(200).json(band);
};

const deleteBand = async (req, res) => {
  const band = await Band.findById(req.params.id);
  if (!band) {
    throw createError(404, "Banda no encontrada");
  }

  //no borra si tiene reservas
  const activeBooking = await Booking.findOne({
    band: band._id,
    status: { $in: ["apartada", "confirmada"] },
  });
  if (activeBooking) {
    return res.status(409).json({
      error: "La banda tiene reservas activas y no puede ser eliminada",
    });
  }

  //no borra si tiene musicos
  const hasMusicians = await Musician.exists({ band: band._id });
  if (hasMusicians) {
    return res.status(409).json({
      error: "La banda tiene musicos y no puede ser eliminada",
    });
  }

  await Band.findByIdAndDelete(band._id);
  res.status(200).json({ message: "Banda eliminada exitosamente" });
};

//listar todas las reservas de una banda
const getBandBookings = async (req, res) => {
  const band = await Band.findById(req.params.id);
  if (!band) {
    throw createError(404, "Banda no encontrada");
  }
  const bookings = await Booking.find({ band: band._id }).populate("room");
  return res.status(200).json(bookings);
};
// Subrecurso: Listar los musicos de una banda
const getBandMusicians = async (req, res, next) => {
  const band = await Band.findById(req.params.id);
  if (!band) {
    throw createError(404, "Banda no encontrada");
  }
  const musicians = await Musician.find({ band: band._id });
  return res.status(200).json(musicians);
};

module.exports = {
  createBand,
  getBands,
  getBandById,
  updateBand,
  deleteBand,
  getBandBookings,
  getBandMusicians,
};
