const BarangModel = require("../models/Barang.js");
const { getChannel } = require("../config/mq.js");
const { v4: uuidv4 } = require("uuid");
const generateQR = require("../config/qrgenerator.js");
const { capitalEachWord } = require("../helper/textModifer.js");
const redisClient = require("../config/redis.js");
const Fuse = require("fuse.js");

const getInputPage = async (req, res) => {
   try {
      let daftarKategori = await redisClient.sMembers("set_kategori");
      let daftarMerek = await redisClient.sMembers("set_merek");
      let daftarSatuan = await redisClient.sMembers("set_satuan");
      let daftarRuangan = await redisClient.sMembers("set_ruangan");

      if (daftarKategori.length === 0 || daftarRuangan.length === 0) {
         const [kategori, merek, satuan, ruangan] = await Promise.all([
            BarangModel.distinct("kategori"),
            BarangModel.distinct("merek"),
            BarangModel.distinct("satuan"),
            BarangModel.distinct("ruangan"),
            //
         ]);

         daftarKategori = kategori.filter(Boolean);
         daftarMerek = merek.filter(Boolean);
         daftarSatuan = satuan.filter(Boolean);
         daftarRuangan = ruangan.filter(Boolean);

         if (daftarKategori.length > 0) await redisClient.sAdd("set_kategori", daftarKategori);
         if (daftarMerek.length > 0) await redisClient.sAdd("set_merek", daftarMerek);
         if (daftarSatuan.length > 0) await redisClient.sAdd("set_satuan", daftarSatuan);
         if (daftarRuangan.length > 0) await redisClient.sAdd("set_ruangan", daftarRuangan);
      }

      return res.render("admin/input-inventory", {
         daftarKategori: daftarKategori.sort(),
         daftarMerek: daftarMerek.sort(),
         daftarSatuan: daftarSatuan.sort(),
         daftarRuangan: daftarRuangan.sort(),
      });
   } catch (error) {
      console.error("Error:", error);
      return res.status(500).send("Terjadi kesalahan");
   }

   // return res.render("admin/input-inventory.ejs", { daftarKategori, daftarMerek, daftarSatuan, daftarRuangan });
};

const postInventory = async (req, res) => {
   const { nama_barang, kategori, jumlah, satuan, ruangan, merek, detailKey, detailValue } = req.body;
   const foto_barang = req.file;

   if (!nama_barang || !foto_barang || !kategori || !jumlah || !ruangan) {
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
         nama_barang: capitalEachWord(nama_barang),
         kategori: capitalEachWord(kategori),
         jumlah,
         satuan: capitalEachWord(satuan),
         ruangan: capitalEachWord(ruangan),
         merek: capitalEachWord(merek),
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

      if (ruangan) await redisClient.sAdd("set_ruangan", capitalEachWord(ruangan));
      if (kategori) await redisClient.sAdd("set_kategori", capitalEachWord(kategori));
      if (satuan) await redisClient.sAdd("set_satuan", capitalEachWord(satuan));
      if (merek) await redisClient.sAdd("set_merek", capitalEachWord(merek));
      if (nama_barang) await redisClient.sAdd("set_nama_barang", capitalEachWord(nama_barang));

      return res.redirect("/admin/check-inventory");
   } catch (error) {
      console.error("Error posting inventory", error);
      return res.redirect("/admin/input-inventory");
   }
};

const getInventoryPage = async (req, res) => {
   try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 15;

      const totalBarang = await BarangModel.countDocuments();
      const totalPages = Math.ceil(totalBarang / limit);

      const inventories = await BarangModel.find()
         .skip((page - 1) * limit)
         .limit(limit);

      const searchTerms = req.query.search || " ";

      if (searchTerms === " ") {
         return res.render("admin/check-inventory.ejs", {
            page,
            limit,
            totalPages,
            totalBarang,
            currentPage: page,
            inventories,
         });
      }

      let daftarBarang = await redisClient.sMembers("set_nama_barang");

      if (daftarBarang.length === 0) {
         const barang = await BarangModel.distinct("nama_barang");

         daftarBarang = barang.filter(Boolean);

         if (daftarBarang.length > 0) await redisClient.sAdd("set_nama_barang", daftarBarang);
      }

      const fuseOptions = {
         keys: ["nama_barang"],
         threshold: 0.5,
      };

      const fuse = new Fuse(daftarBarang, fuseOptions);
      const result = fuse.search(searchTerms);

      const finalResult = result.map((result) => result.item);
      const resultArr = await BarangModel.find({ nama_barang: { $in: finalResult } });

      return res.render("admin/check-inventory.ejs", {
         page,
         limit,
         totalPages,
         totalBarang,
         currentPage: page,
         inventories: resultArr,
         search: searchTerms,
      });
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
   try {
      const barang = await BarangModel.findOne({ id_barang: req.params.id_barang });

      if (!barang) {
         return res.status(404).json({ message: "Barang tidak ditemukan" });
      }

      let daftarKategori = await redisClient.sMembers("set_kategori");
      let daftarMerek = await redisClient.sMembers("set_merek");
      let daftarSatuan = await redisClient.sMembers("set_satuan");
      let daftarRuangan = await redisClient.sMembers("set_ruangan");
      let daftarBarang = await redisClient.sMembers("set_nama_barang");

      if (daftarKategori.length === 0 || daftarRuangan.length === 0) {
         const [kategori, merek, satuan, ruangan, nama_barang] = await Promise.all([
            BarangModel.distinct("kategori"),
            BarangModel.distinct("merek"),
            BarangModel.distinct("satuan"),
            BarangModel.distinct("ruangan"),
            BarangModel.distinct("nama_barang"),
            //
         ]);

         daftarKategori = kategori.filter(Boolean);
         daftarMerek = merek.filter(Boolean);
         daftarSatuan = satuan.filter(Boolean);
         daftarRuangan = ruangan.filter(Boolean);

         if (daftarKategori.length > 0) await redisClient.sAdd("set_kategori", daftarKategori);
         if (daftarMerek.length > 0) await redisClient.sAdd("set_merek", daftarMerek);
         if (daftarSatuan.length > 0) await redisClient.sAdd("set_satuan", daftarSatuan);
         if (daftarRuangan.length > 0) await redisClient.sAdd("set_ruangan", daftarRuangan);
         if (daftarBarang.length > 0) await redisClient.sAdd("set_nama_barang", daftarBarang);
      }

      return res.render("admin/edit-item.ejs", {
         barang,
         daftarKategori: daftarKategori.sort(),
         daftarMerek: daftarMerek.sort(),
         daftarSatuan: daftarSatuan.sort(),
         daftarRuangan: daftarRuangan.sort(),
      });
   } catch (error) {
      console.error("error", error);
      return res.status(500).json({ message: "Terjadi kesalahan" });
   }
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
      nama_barang: capitalEachWord(nama_barang),
      kategori: capitalEachWord(kategori),
      jumlah,
      satuan: capitalEachWord(satuan),
      ruangan: capitalEachWord(ruangan),
      merek: capitalEachWord(merek),
      detail: detailObj,
   };

   try {
      const item = await BarangModel.findOneAndUpdate({ id_barang: req.params.id_barang }, dataBarang, { runValidators: true });

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

      if (ruangan) await redisClient.sAdd("set_ruangan", capitalEachWord(ruangan));
      if (kategori) await redisClient.sAdd("set_kategori", capitalEachWord(kategori));
      if (satuan) await redisClient.sAdd("set_satuan", capitalEachWord(satuan));
      if (merek) await redisClient.sAdd("set_merek", capitalEachWord(merek));
   } catch (error) {
      console.error("Error update barang:", error);
      return res.status(500).json({ message: "Error update barang" });
   }

   return res.redirect(`/admin/item-detail/${req.params.id_barang}`);
};

const deleteItem = async (req, res) => {
   // TODO: delete cache nama_barang

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
