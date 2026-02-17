const express = require("express");
const router = express.Router();
const { getInputPage, postInventory, getInventoryPage } = require("../controller/adminControllers.js");
const { upload } = require("../config/upload.js");

// base url: admin/...
router.route("/input-inventory").get(getInputPage).post(upload.none(), postInventory);

router.route("/check-inventory").get(getInventoryPage);

module.exports = router;
