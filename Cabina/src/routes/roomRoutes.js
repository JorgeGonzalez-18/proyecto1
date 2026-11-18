const express = require("express");
const router = express.Router();
const roomController = require("../controllers/roomController");
//estadistica
router.get("/stats", roomController.getRoomStats);

router.get("/", roomController.getRooms);
router.post("/", roomController.createRoom);

router.get("/:id", roomController.getRoomById);
router.put("/:id", roomController.updateRoom);
router.delete("/:id", roomController.deleteRoom);

// hrario del dia
router.get("/:id/schedule", roomController.getRoomSchedule);

module.exports = router;
