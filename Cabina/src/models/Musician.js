const mongoose = require("mongoose");

const musicianSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre del musico es obligatorio"],
      trim: true,
    },
    instrument: {
      type: String,
      required: [true, "El instrumento es obligatorio"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "El correo electronico es obligatorio"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    band: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Band",
      required: [true, "La banda es obligatoria"],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Musico tiene un indice por banda
musicianSchema.index({ band: 1 });

module.exports = mongoose.model("Musician", musicianSchema);
