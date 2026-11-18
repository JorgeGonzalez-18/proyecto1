const Equipment = require("../models/Equipment");
const { paginate } = require("../middlewares/queryHelper");
const { createError } = require("../middlewares/errorHandler");

const createEquipment = async (req, res) => {
  const equipment = await Equipment.create(req.body);
  return res.status(201).json(equipment);
};

const getEquipment = async (req, res) => {
  const baseFilter = {};
  if (req.query.category) {
    baseFilter.category = req.query.category;
  }
  if (req.query.available === "true") {
    baseFilter.availableUnits = { $gt: 0 };
  }
  const result = await paginate(Equipment, req.query, {
    allowedSort: ["name", "availableUnits", "createdAt"],
    defaultSort: { name: 1 },
    searchFields: ["name"],
    baseFilter,
  });
  return res.status(200).json(result);
};

const getEquipmentById = async (req, res) => {
  const equipment = await Equipment.findById(req.params.id);
  if (!equipment) {
    throw createError(404, "Equipo no encontrado");
  }
  return res.status(200).json({ message: "Equipo obtenido", data: equipment });
};

const updateEquipment = async (req, res) => {
  const equipment = await Equipment.findById(req.params.id);
  if (!equipment) {
    throw createError(404, "Equipo no encontrado");
  }
  delete req.body.availableUnits;
  if (req.body.totalUnits !== undefined) {
    const borrowedUnits = equipment.totalUnits - equipment.availableUnits;
    if (req.body.totalUnits < borrowedUnits) {
      throw createError(
        409,
        `totalUnits no puede ser menor a las unidades actualmente prestadas (${borrowedUnits})`,
      );
    }
    req.body.availableUnits = req.body.totalUnits - borrowedUnits;
  }
  const updatedEquipment = await Equipment.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    },
  );
  return res.status(200).json(updatedEquipment);
};

const deleteEquipment = async (req, res) => {
  const equipment = await Equipment.findById(req.params.id);
  if (!equipment) {
    throw createError(404, "Equipo no encontrado");
  }

  if (equipment.availableUnits < equipment.totalUnits) {
    throw createError(409, "Equipo en uso no puede ser eliminado");
  }

  await Equipment.findByIdAndDelete(req.params.id);
  return res.status(200).json({ message: "Equipo eliminado", data: equipment });
};
const getEquipmentStats = async (req, res) => {
  const stats = await Equipment.aggregate([
    {
      $group: {
        _id: "$category",
        totalUnits: { $sum: "$totalUnits" },
        availableUnits: { $sum: "$availableUnits" },
      },
    },
    {
      $project: {
        _id: 0,
        category: "$_id",
        totalUnits: 1,
        availableUnits: 1,
      },
    },
  ]);
  return res.status(200).json(stats);
};

module.exports = {
  createEquipment,
  getEquipment,
  getEquipmentById,
  updateEquipment,
  deleteEquipment,
  getEquipmentStats,
};
