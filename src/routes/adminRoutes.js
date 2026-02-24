const express = require("express");
const BarangModel = require("../models/Barang.js");
const router = express.Router();
const { getInputPage, postInventory, getInventoryPage, getItemDetailPage, getEditItemPage, putItemEdit, deleteItem } = require("../controller/adminControllers.js");
const { upload } = require("../config/upload.js");

// base url: admin/...
router.route("/input-inventory").get(getInputPage).post(upload.single("foto_barang"), postInventory);

router.route("/check-inventory").get(getInventoryPage);

router.route("/item-detail/:id_barang").get(getItemDetailPage).put(upload.single("foto_barang"), putItemEdit).delete(deleteItem);

router.route("/item-detail/:id_barang/edit").get(getEditItemPage);

// polling
router.get("/api/status-barang/:id_barang", async (req, res) => {
   const barang = await BarangModel.findOne({ id_barang: req.params.id_barang });
   return res.json({ status: barang.status_upload });
});

module.exports = router;
