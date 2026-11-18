const express = require("express");
const router = express.Router();
const equipmentController = require("../controllers/equipmentController");

router.get("/stats", equipmentController.getEquipmentStats);

router.get("/", equipmentController.getEquipment);
router.post("/", equipmentController.createEquipment);

router.get("/:id", equipmentController.getEquipmentById);
router.put("/:id", equipmentController.updateEquipment);
router.delete("/:id", equipmentController.deleteEquipment);

module.exports = router;
