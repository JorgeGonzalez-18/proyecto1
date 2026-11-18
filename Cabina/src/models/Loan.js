const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "La reserva es obligatoria"],
    },
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      required: [true, "El equipo es obligatorio"],
    },
    units: {
      type: Number,
      required: [true, "La cantidad de unidades es obligatoria"],
      min: [1, "units debe ser mayor que 0"],
      validate: {
        validator: Number.isInteger,
        message: "units debe ser un entero",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["prestado", "devuelto"],
        message: "El estado del prestamo debe ser prestado o devuelto",
      },
      default: "prestado",
    },
  },
  {
    timestamps: true,
  },
);

//indices
loanSchema.index({ booking: 1 });
loanSchema.index({ equipment: 1, status: 1 });

module.exports = mongoose.model("Loan", loanSchema);
