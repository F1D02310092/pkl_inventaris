const BarangModel = require("../models/Barang.js");
const { getChannel } = require("../config/mq.js");
const { v4: uuidv4 } = require("uuid");
const generateQR = require("../config/qrgenerator.js");

const getInputPage = async (req, res) => {
   const daftarKategori = await BarangModel.distinct("kategori");
   const daftarMerek = await BarangModel.distinct("merek");
   const daftarSatuan = await BarangModel.distinct("satuan");
   const daftarRuangan = await BarangModel.distinct("ruangan");

   return res.render("admin/input-inventory.ejs", { daftarKategori, daftarMerek, daftarSatuan, daftarRuangan });
};

const postInventory = async (req, res) => {
   const { nama_barang, kategori, jumlah, satuan, ruangan, merek, detailKey, detailValue } = req.body;
   const foto_barang = req.file;

   if (!nama_barang || !foto_barang || !kategori || !jumlah || !satuan || !ruangan || !merek) {
      return res.status(400).json({ message: "Mohon lengkapi semua data yang ada!" });
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
         kategori,
         jumlah,
         satuan,
         ruangan,
         merek,
         detail: detailObj,
      };

      await BarangModel.insertOne(newBarang);

      const channel = getChannel();
      const payload = {
         id_barang: id_barang,
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

      if (inventories.length === 0) {
         return res.render("admin/check-inventory.ejs", { inventories });
      }

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
   const daftarKategori = await BarangModel.distinct("kategori");
   const daftarMerek = await BarangModel.distinct("merek");
   const daftarSatuan = await BarangModel.distinct("satuan");
   const daftarRuangan = await BarangModel.distinct("ruangan");

   if (!barang) {
      return res.status(404).json({ message: "Item not found" });
   }

   return res.render("admin/edit-item.ejs", { barang, daftarKategori, daftarMerek, daftarSatuan, daftarRuangan });
};

const putItemEdit = async (req, res) => {
   // TODO: handle edit gambar di minio

   const { nama_barang, kategori, jumlah, satuan, ruangan, merek, detailKey, detailValue } = req.body;
   const foto_barang = req.file;

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
      kategori,
      jumlah,
      satuan,
      ruangan,
      merek,
      detail: detailObj,
   };

   try {
      const item = await BarangModel.findOneAndUpdate({ id_barang: req.params.id_barang }, dataBarang, { runValidators: true, new: true });

      if (!item) {
         return res.status(404).json({ message: "Barang tidak ditemukan" });
      }

      if (foto_barang) {
         const gambarLama = {
            image_name: item.image_name,
         };

         const payload = {
            id_barang: req.params.id_barang,
            file_path: foto_barang.path,
            file_name: foto_barang.filename,
            file_mime: foto_barang.mimetype,
         };
         const channel = getChannel();

         await channel.sendToQueue("image_deletion", Buffer.from(JSON.stringify(gambarLama)));

         await channel.sendToQueue("image_processing", Buffer.from(JSON.stringify(payload)));

         await BarangModel.findOneAndUpdate({ id_barang: req.params.id_barang }, { status_upload: "PENDING" });
      }
   } catch (error) {
      console.error("Error update barang:", error);
      return res.status(500).json({ message: "Error update barang" });
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

const downloadQR = async (req, res) => {
   const barang = await BarangModel.findOne({ id_barang: req.params.id_barang });

   if (!barang) {
      return res.status(404).json({ message: "Barang tidak ditemukan" });
   }

   const qr = await generateQR(barang);

   res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename=${barang.nama_barang.trim()}_QR.png`,
   });

   res.send(qr);
};

module.exports = {
   getInputPage,
   postInventory,
   getInventoryPage,
   getItemDetailPage,
   getEditItemPage,
   putItemEdit,
   deleteItem,
   downloadQR,
};
