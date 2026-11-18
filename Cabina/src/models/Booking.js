const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "La sala es obligatoria"],
    },
    band: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Band",
      required: [true, "La banda es obligatoria"],
    },
    date: {
      type: String,
      required: [true, "La fecha de reserva es obligatoria"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "El formato de fecha debe ser YYYY-MM-DD"],
    },
    startHour: {
      type: Number,
      required: [true, "La hora de inicio es obligatoria"],
      min: [8, "startHour debe ser entre 8 y 21"],
      max: [21, "startHour debe ser entre 8 y 21"],
      validate: {
        validator: Number.isInteger,
        message: "startHour debe ser un entero",
      },
    },
    endHour: {
      type: Number,
      required: [true, "La hora de fin es obligatoria"],
      min: [9, "endHour debe ser entre 9 y 22"],
      max: [22, "endHour debe ser entre 9 y 22"],
      validate: {
        validator: Number.isInteger,
        message: "endHour debe ser un entero",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["apartada", "confirmada", "cancelada"],
        message: "El estado debe ser apartada, confirmada o cancelada",
      },
      default: "apartada",
    },
    notes: {
      type: String,
      maxlength: [200, "Las notas no pueden exceder 200 caracteres"],
      default: "",
    },
  },
  {
    timestamps: true,
    // Permite que el virtual aparezca al convertir a JSON (res.json)
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual durationHours = hora de finalizacion - hora de inicio
bookingSchema.virtual("durationHours").get(function () {
  return this.endHour - this.startHour;
});

// Indice compuesto
bookingSchema.index({ room: 1, date: 1, startHour: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
