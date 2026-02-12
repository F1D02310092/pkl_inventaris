const BarangModel = require("../models/Barang.js");

const getInputPage = (req, res) => {
   return res.render("admin/input-inventory.ejs");
};

const postInventory = async (req, res) => {
   const { nama_barang, nomor_seri } = req.body;

   try {
      await BarangModel.insertOne({ nama_barang, nomor_seri });

      return res.redirect("/");
   } catch (error) {
      console.error("Error posting inventory", error);
      return res.redirect("/admin/input-inventory");
   }
};

const getInventoryPage = async (req, res) => {
   try {
      const inventories = await BarangModel.find();

      return res.render("admin/check-inventory.ejs", { inventories });
   } catch (error) {
      console.error("Error while querying inventory", error);
      return res.redirect("/");
   }
};

module.exports = {
   getInputPage,
   postInventory,
   getInventoryPage,
};
