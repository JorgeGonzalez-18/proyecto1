const express = require("express");
const router = express.Router();
const bandController = require("../controllers/bandController");

router.get("/", bandController.getBands);
router.post("/", bandController.createBand);

router.get("/:id", bandController.getBandById);
router.put("/:id", bandController.updateBand);
router.delete("/:id", bandController.deleteBand);

// Subrecursos
router.get("/:id/musicians", bandController.getBandMusicians);
router.get("/:id/bookings", bandController.getBandBookings);

module.exports = router;
