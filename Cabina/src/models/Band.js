const mongoose = require("mongoose");

const bandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre de la banda es obligatorio"],
      unique: true,
      trim: true,
      minlength: [2, "El nombre debe tener al menos 2 caracteres"],
      maxlength: [50, "El nombre no puede exceder 50 caracteres"],
    },
    genre: {
      type: String,
      enum: {
        values: ["rock", "jazz", "coral", "otro"],
        message: "El genero debe ser rock, jazz, coral u otro",
      },
      default: "otro",
    },
    active: {
      type: Boolean,
      default: true,
    },
    contactName: {
      type: String,
      required: [true, "El nombre de contacto es obligatorio"],
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

bandSchema.virtual("musicians", {
  ref: "Musician",
  localField: "_id",
  foreignField: "band",
});

module.exports = mongoose.model("Band", bandSchema);
