const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Room = require("../models/Room");
const Band = require("../models/Band");
const Musician = require("../models/Musician");
const Equipment = require("../models/Equipment");
const Loan = require("../models/Loan");
const { paginate } = require("../middlewares/queryHelper");
const { createError } = require("../middlewares/errorHandler");

// Crea reserva ACID
const createBooking = async (req, res) => {
  const {
    room: roomId,
    band: bandId,
    date,
    startHour,
    endHour,
    notes,
    equipment = [],
  } = req.body;

  if (endHour <= startHour) {
    throw createError(400, "endHour debe ser mayor que startHour");
  }
  if (endHour - startHour > 3) {
    throw createError(400, "La reserva puede durar como maximo 3 horas");
  }

  const todayStr = new Date().toISOString().split("T")[0];
  if (date < todayStr) {
    throw createError(
      400,
      "La fecha de reserva debe ser hoy o un dia posterior",
    );
  }

  // validar si existe y disponible
  const room = await Room.findById(roomId);
  if (!room) throw createError(404, "Sala no encontrada");
  if (room.status !== "disponible") {
    throw createError(
      409,
      "La sala no esta disponible (se encuentra en mantenimiento)",
    );
  }
  //banda y musicos activos
  const band = await Band.findById(bandId);
  if (!band) throw createError(404, "Banda no encontrada");
  if (!band.active) {
    throw createError(409, "La banda no esta activa");
  }

  const activeMusiciansCount = await Musician.countDocuments({
    band: bandId,
    active: true,
  });
  if (activeMusiciansCount === 0) {
    throw createError(409, "La banda debe tener al menos un musico activo");
  }
  if (activeMusiciansCount > room.capacity) {
    throw createError(
      409,
      "La cantidad de musicos activos supera la capacidad de la sala",
    );
  }

  // validar que no pidan el mismo equipo repetido en el array
  const equipmentIds = equipment.map((e) => e.equipmentId);
  const uniqueEquipmentIds = new Set(equipmentIds);
  if (equipmentIds.length !== uniqueEquipmentIds.size) {
    throw createError(400, "No se pueden pedir dos lineas del mismo equipo");
  }

  // INICIO DE TRANSACCION ACID
  const session = await mongoose.startSession();
  let createdBookingId = null;

  try {
    await session.withTransaction(async () => {
      // verificar traslape dentro de la transacción
      const overlap = await Booking.findOne({
        room: roomId,
        date: date,
        status: { $in: ["apartada", "confirmada"] },
        startHour: { $lt: endHour },
        endHour: { $gt: startHour },
      }).session(session);

      if (overlap) {
        throw createError(
          409,
          "Existe un conflicto de horario con otra reserva activa en esta sala",
        );
      }

      // verificar inventario y descontar
      for (const item of equipment) {
        const eq = await Equipment.findById(item.equipmentId).session(session);
        if (!eq) {
          throw createError(404, `Equipo no encontrado: ${item.equipmentId}`);
        }
        if (item.units <= 0 || !Number.isInteger(item.units)) {
          throw createError(
            400,
            "Las unidades de equipo deben ser un entero mayor que 0",
          );
        }
        if (item.units > eq.availableUnits) {
          throw createError(
            409,
            `No hay suficientes unidades disponibles de ${eq.name}. Disponibles: ${eq.availableUnits}, solicitadas: ${item.units}`,
          );
        }

        // Descontar inventario
        await Equipment.findByIdAndUpdate(
          item.equipmentId,
          { $inc: { availableUnits: -item.units } },
          { session },
        );
      }

      // crear la Reserva
      const [newBooking] = await Booking.create(
        [
          {
            room: roomId,
            band: bandId,
            date,
            startHour,
            endHour,
            status: "apartada",
            notes: notes || "",
          },
        ],
        { session },
      );

      createdBookingId = newBooking._id;

      // crear prestamos
      if (equipment.length > 0) {
        const loansToCreate = equipment.map((item) => ({
          booking: newBooking._id,
          equipment: item.equipmentId,
          units: item.units,
          status: "prestado",
        }));

        await Loan.insertMany(loansToCreate, { session });
      }
    });
  } finally {
    await session.endSession();
  }

  //  detalle de la reserva creada
  const result = await Booking.findById(createdBookingId);
  return res.status(201).json(result);
};

// cancelar reserva con transaccion ACID
const cancelBooking = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const booking = await Booking.findById(req.params.id).session(session);
      if (!booking) {
        throw createError(404, "Reserva no encontrada");
      }
      if (booking.status === "cancelada") {
        throw createError(409, "La reserva ya se encuentra cancelada");
      }

      // cambiar estado de la reserva
      booking.status = "cancelada";
      await booking.save({ session });

      // buscar prestamos activos
      const loans = await Loan.find({
        booking: booking._id,
        status: "prestado",
      }).session(session);

      // marcar prestamos como devuelto y regresar unidades
      for (const loan of loans) {
        loan.status = "devuelto";
        await loan.save({ session });

        await Equipment.findByIdAndUpdate(
          loan.equipment,
          { $inc: { availableUnits: loan.units } },
          { session },
        );
      }
    });
  } finally {
    await session.endSession();
  }

  const updatedBooking = await Booking.findById(req.params.id);
  return res.status(200).json({
    message: "Reserva cancelada exitosamente",
    booking: updatedBooking,
  });
};

// listar reservas con paginación, filtros avanzados y orden
const getBookings = async (req, res) => {
  const baseFilter = {};

  if (req.query.status) baseFilter.status = req.query.status;
  if (req.query.room) baseFilter.room = req.query.room;
  if (req.query.band) baseFilter.band = req.query.band;
  if (req.query.date) baseFilter.date = req.query.date;
  if (req.query.from || req.query.to) {
    baseFilter.date = {};
    if (req.query.from) baseFilter.date.$gte = req.query.from;
    if (req.query.to) baseFilter.date.$lte = req.query.to;
  }

  const result = await paginate(Booking, req.query, {
    allowedSort: ["date", "startHour", "createdAt"],
    defaultSort: { date: 1, startHour: 1 },
    searchFields: ["notes"],
    baseFilter,
  });

  return res.status(200).json(result);
};

const getBookingById = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate({
      path: "room",
      select: "name capacity status",
    })
    .populate({
      path: "band",
      select: "name genre",
    });

  if (!booking) {
    throw createError(404, "Reserva no encontrada");
  }

  // obtener musicos activos de la banda
  const activeMusicians = await Musician.find({
    band: booking.band._id,
    active: true,
  }).select("name instrument email");

  // obtener prestamos con el detalle de equipo
  const loans = await Loan.find({ booking: booking._id }).populate(
    "equipment",
    "name category",
  );

  const responseData = booking.toObject();
  responseData.band.activeMusicians = activeMusicians;
  responseData.loans = loans;

  return res.status(200).json(responseData);
};

const updateBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    throw createError(404, "Reserva no encontrada");
  }

  // reglas de cambio de estado
  if (req.body.status) {
    const currentStatus = booking.status;
    const newStatus = req.body.status;

    if (currentStatus === "cancelada") {
      throw createError(
        409,
        "Una reserva cancelada no puede cambiar de estado",
      );
    }
    if (currentStatus === "confirmada" && newStatus === "apartada") {
      throw createError(
        409,
        "Una reserva confirmada no puede volver a estar apartada",
      );
    }
    if (newStatus === "cancelada") {
      throw createError(
        400,
        "Para cancelar una reserva utilice el endpoint PATCH /api/bookings/:id/cancel",
      );
    }
  }

  const roomId = req.body.room || booking.room;
  const bandId = req.body.band || booking.band;
  const date = req.body.date || booking.date;
  const startHour =
    req.body.startHour !== undefined ? req.body.startHour : booking.startHour;
  const endHour =
    req.body.endHour !== undefined ? req.body.endHour : booking.endHour;

  if (endHour <= startHour) {
    throw createError(400, "endHour debe ser mayor que startHour");
  }
  if (endHour - startHour > 3) {
    throw createError(400, "La reserva puede durar como maximo 3 horas");
  }

  // Verificar traslape
  const overlap = await Booking.findOne({
    _id: { $ne: booking._id },
    room: roomId,
    date: date,
    status: { $in: ["apartada", "confirmada"] },
    startHour: { $lt: endHour },
    endHour: { $gt: startHour },
  });

  if (overlap) {
    throw createError(
      409,
      "Existe conflicto de horario con otra reserva activa en esta sala",
    );
  }

  const updatedBooking = await Booking.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    },
  );

  return res.status(200).json(updatedBooking);
};

const getBookingStats = async (req, res) => {
  const stats = await Booking.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        status: "$_id",
        count: 1,
      },
    },
  ]);

  return res.status(200).json(stats);
};

module.exports = {
  createBooking,
  cancelBooking,
  getBookings,
  getBookingById,
  updateBooking,
  getBookingStats,
};
