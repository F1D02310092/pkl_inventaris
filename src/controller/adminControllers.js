const BarangModel = require("../models/Barang.js");
const { getChannel } = require("../config/mq.js");
const { v4: uuidv4 } = require("uuid");

const getInputPage = (req, res) => {
   return res.render("admin/input-inventory.ejs");
};

const postInventory = async (req, res) => {
   const { nama_barang, nomor_seri, detailKey, detailValue } = req.body;
   const foto_barang = req.file;

   if (!nama_barang || !nomor_seri || !foto_barang) {
      return res.status(400).json({ message: "Missing critical values" });
   }

   try {
      let detailObj = {};

      if (detailKey) {
         // convert "paksa" menjadi array
         const keys = Array.isArray(detailKey) ? detailKey : [detailKey];
         const values = Array.isArray(detailValue) ? detailValue : [detailValue];

         for (let i = 0; i < keys.length; i++) {
            const key = keys[i].trim();
            const val = values[i].trim();

            if (key !== "") {
               detailObj[key] = val;
            }
         }
      }

      const id_barang = uuidv4();
      const newBarang = {
         id_barang,
         nama_barang,
         nomor_seri,
         detail: detailObj,
      };

      await BarangModel.insertOne(newBarang);

      const channel = getChannel();
      const payload = {
         id_barang: id_barang,
         nomor_seri,
         file_path: foto_barang.path,
         file_name: foto_barang.filename,
         file_mime: foto_barang.mimetype,
      };

      await channel.sendToQueue("image_processing", Buffer.from(JSON.stringify(payload)));

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

const getItemDetailPage = async (req, res) => {
   const barang = await BarangModel.findOne({ id_barang: req.params.id_barang });

   if (!barang) {
      return res.status(404).json({ message: "Item not found" });
   }

   return res.render("admin/detail-item.ejs", { barang });
};

const getEditItemPage = async (req, res) => {
   const barang = await BarangModel.findOne({ id_barang: req.params.id_barang });

   if (!barang) {
      return res.status(404).json({ message: "Item not found" });
   }

   return res.render("admin/edit-item.ejs", { barang });
};

const putItemEdit = async (req, res) => {
   // TODO: handle edit gambar di minio

   const { nama_barang, nomor_seri, detailKey, detailValue } = req.body;

   let detailObj = {};

   if (detailKey) {
      // convert "paksa" menjadi array
      const keys = Array.isArray(detailKey) ? detailKey : [detailKey];
      const values = Array.isArray(detailValue) ? detailValue : [detailValue];

      for (let i = 0; i < keys.length; i++) {
         const key = keys[i].trim();
         const val = values[i].trim();

         if (key !== "") {
            detailObj[key] = val;
         }
      }
   }

   const dataBarang = {
      nama_barang,
      nomor_seri,
      detail: detailObj,
   };

   const item = await BarangModel.findOneAndUpdate({ id_barang: req.params.id_barang }, dataBarang, { runValidators: true, new: true });

   if (!item) {
      return res.status(404).json({ message: "Item not found" });
   }

   return res.redirect(`/admin/item-detail/${req.params.id_barang}`);
};

const deleteItem = async (req, res) => {
   const barang = await BarangModel.findOneAndDelete({ id_barang: req.params.id_barang });

   if (!barang) {
      return res.status(404).json({ message: "Item not found" });
   }

   const channel = getChannel();

   const payload = {
      image_name: barang.image_name,
   };

   await channel.sendToQueue("image_deletion", Buffer.from(JSON.stringify(payload)));

   return res.redirect("/admin/check-inventory");
};

module.exports = {
   getInputPage,
   postInventory,
   getInventoryPage,
   getItemDetailPage,
   getEditItemPage,
   putItemEdit,
   deleteItem,
};
