const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");

router.get("/stats", bookingController.getBookingStats);

router.get("/", bookingController.getBookings);
router.post("/", bookingController.createBooking);

router.get("/:id", bookingController.getBookingById);
router.put("/:id", bookingController.updateBooking);
router.patch("/:id/cancel", bookingController.cancelBooking);

module.exports = router;
