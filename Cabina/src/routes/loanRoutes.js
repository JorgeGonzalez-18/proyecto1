const express = require("express");
const router = express.Router();
const loanController = require("../controllers/loanController");

router.get("/", loanController.getLoans);
router.get("/:id", loanController.getLoanById);

module.exports = router;
