const mongoose = require("mongoose");

const equipmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre del equipo es obligatorio"],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "La categoria es obligatoria"],
      enum: {
        values: ["audio", "cuerdas", "percusion"],
        message: "La categoria debe ser audio, cuerdas o percusion",
      },
    },
    totalUnits: {
      type: Number,
      required: [true, "El total de unidades es obligatorio"],
      min: [1, "totalUnits debe ser mayor que 0"],
      validate: {
        validator: Number.isInteger,
        message: "totalUnits debe ser un entero",
      },
    },
    availableUnits: {
      type: Number,
      min: [0, "availableUnits no puede ser menor a 0"],
      validate: {
        validator: Number.isInteger,
        message: "availableUnits debe ser un entero",
      },
      default: function () {
        return this.totalUnits;
      },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Equipment", equipmentSchema);
