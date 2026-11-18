const express = require("express");
const { errorHandler } = require("./middlewares/errorHandler");

const app = express();

// middlewares globales
app.use(express.json());

// endpoint de prueba
app.get("/api/health", (req, res) => {
  res
    .status(200)
    .json({ status: "OK", message: "API Cabina en funcionamiento" });
});

app.use("/api/rooms", require("./routes/roomRoutes"));
app.use("/api/bands", require("./routes/bandRoutes"));
app.use("/api/musicians", require("./routes/musicianRoutes"));
app.use("/api/equipment", require("./routes/equipmentRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/loans", require("./routes/loanRoutes"));

app.use(errorHandler);

module.exports = app;
