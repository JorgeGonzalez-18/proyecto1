const express = require("express");
const router = express.Router();
const musicianController = require("../controllers/musicianController");

router.get("/", musicianController.getMusicians);
router.post("/", musicianController.createMusician);

router.get("/:id", musicianController.getMusicianById);
router.put("/:id", musicianController.updateMusician);
router.delete("/:id", musicianController.deleteMusician);

module.exports = router;
