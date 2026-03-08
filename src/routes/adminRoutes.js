const express = require("express");
const BarangModel = require("../models/Barang.js");
const router = express.Router();
const { getInputPage, postInventory, getInventoryPage, getItemDetailPage, getEditItemPage, putItemEdit, deleteItem, downloadQR, bulkDelete, bulkDownloadQR, uploadMiddleware } = require("../controller/adminControllers.js");
const { upload } = require("../config/upload.js");
const { isLoggedIn } = require("../controller/userController.js");
const { validate, inventorySchema } = require("../validation_sanitize/validator.js");

// base url: admin/...
router.route("/input-inventory").get(isLoggedIn, getInputPage).post(isLoggedIn, uploadMiddleware, validate(inventorySchema), postInventory);

router.route("/check-inventory").get(getInventoryPage);

router.route("/check-inventory/bulk-delete").post(isLoggedIn, bulkDelete);

router.route("/check-inventory/bulk-qr").get(isLoggedIn, bulkDownloadQR);

router.route("/item-detail/:id_barang").get(getItemDetailPage).put(isLoggedIn, uploadMiddleware, validate(inventorySchema), putItemEdit).delete(isLoggedIn, deleteItem);

router.route("/item-detail/:id_barang/qr-code").get(isLoggedIn, downloadQR);

router.route("/item-detail/:id_barang/edit").get(isLoggedIn, getEditItemPage);

// polling
router.get("/api/status-barang/:id_barang", async (req, res) => {
   const barang = await BarangModel.findOne({ id_barang: req.params.id_barang });
   return res.json({ status: barang.status_upload });
});

module.exports = router;
