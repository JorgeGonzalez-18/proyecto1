const Room = require("../models/Room");
const Booking = require("../models/Booking");
const { paginate } = require("../middlewares/queryHelper");
const { createError } = require("../middlewares/errorHandler");

exports.createRoom = async (req, res) => {
  const room = await Room.create(req.body);
  if (!room) {
    throw createError(400, "Error al crear la sala");
  }
  return res.status(201).json(room);
};

exports.getRooms = async (req, res) => {
  const result = await paginate(Room, req.query, {
    allowedSort: ["name", "capacity", "floor", "createdAt"],
    defaultSort: { name: 1 },
    searchFields: ["name"],
  });
  if (!result) {
    throw createError(404, "No se encontraron salas");
  }
  return res.status(200).json(result);
};

exports.getRoomById = async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) {
    throw createError(404, "Sala no encontrada");
  }
  return res.status(200).json(room);
};

exports.updateRoom = async (req, res) => {
  const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!room) {
    throw createError(404, "Sala no encontrada");
  }
  return res.status(200).json(room);
};

//borrado protegido
exports.deleteRoom = async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) {
    throw createError(404, "Sala no encontrada");
  }

  const activeBookings = await Booking.findOne({
    room: room._id,
    status: { $in: ["apartada", "confirmada"] },
  });

  if (activeBookings) {
    return res.status(409).json({
      error:
        "No se puede eliminar la sala porque tiene reservas apartadas o confirmadas",
    });
  }

  await Room.findByIdAndDelete(req.params.id);
  return res.status(200).json({ message: "Sala eliminada exitosamente" });
};

// reservas del dia ordenadas por startHour con la banda
exports.getRoomSchedule = async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res
      .status(400)
      .json({ error: "El parametro date es obligatorio (YYYY-MM-DD)" });
  }
  const room = await Room.findById(req.params.id);
  if (!room) {
    throw createError(404, "Sala no encontrada");
  }

  const bookings = await Booking.find({
    room: room._id,
    date: date,
    status: { $ne: "cancelada" },
  })
    .sort({ startHour: 1 })
    .populate("band");

  return res.status(200).json(bookings);
};

// estadisticas con aggregate ,devuelve por sala cuantas reservas activas tiene
exports.getRoomStats = async (req, res) => {
  const stats = await Room.aggregate([
    {
      $lookup: {
        from: "bookings",
        localField: "_id",
        foreignField: "room",
        as: "bookings",
      },
    },
    {
      $project: {
        name: 1,
        capacity: 1,
        activeBookingsCount: {
          $size: {
            $filter: {
              input: "$bookings",
              as: "b",
              cond: { $in: ["$$b.status", ["apartada", "confirmada"]] },
            },
          },
        },
      },
    },
  ]);
  if (!stats) {
    throw createError(404, "No se encontraron estadisticas");
  }
  return res.status(200).json(stats);
};
