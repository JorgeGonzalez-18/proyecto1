const Musician = require("../models/Musician");
const Band = require("../models/Band");

const { paginate } = require("../middlewares/queryHelper");
const { createError } = require("../middlewares/errorHandler");

const createMusician = async (req, res) => {
  if (req.body.band) {
    const band = await Band.findById(req.body.band);
    if (!band) {
      throw createError(404, "Banda no existe");
    }
  }
  const musician = await Musician.create(req.body);
  return res.status(201).json({ message: "Musico creado", data: musician });
};

const getMusicians = async (req, res) => {
  const baseFilter = {};
  if (req.query.band) {
    baseFilter.band = req.query.band;
  }
  if (req.query.active !== undefined) {
    baseFilter.active = req.query.active === "true";
  }
  const result = await paginate(Musician, req.query, {
    allowedSort: ["name", "instrument", "createdAt"],
    defaultSort: { name: 1 },
    searchFields: ["name", "email"],
    baseFilter,
    populate: "band",
  });
  return res.status(200).json(result);
};

const getMusicianById = async (req, res) => {
  const musician = await Musician.findById(req.params.id).populate("band");
  if (!musician) {
    throw createError(404, "Musico no existe");
  }
  return res.status(200).json({
    status: "success",
    message: "Musico obtenido",
    data: musician,
  });
};

const updateMusician = async (req, res) => {
  if (req.body.band) {
    const band = await Band.findById(req.body.band);
    if (!band) {
      throw createError(404, "Banda no existe");
    }
  }
  const musician = await Musician.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("band");

  if (!musician) {
    throw createError(404, "Musico no existe");
  }

  return res.status(200).json({
    status: "success",
    message: "Musico actualizado",
    data: musician,
  });
};

const deleteMusician = async (req, res) => {
  const musician = await Musician.findByIdAndDelete(req.params.id);
  if (!musician) {
    throw createError(404, "Musico no existe");
  }

  return res.status(200).json({
    status: "success",
    message: "Musico eliminado",
    data: musician,
  });
};

module.exports = {
  createMusician,
  getMusicians,
  getMusicianById,
  updateMusician,
  deleteMusician,
};
