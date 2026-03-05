const BarangModel = require("../models/Barang.js");
const { getChannel } = require("../config/mq.js");
const { v4: uuidv4 } = require("uuid");
const generateQR = require("../config/qrgenerator.js");
const { capitalEachWord } = require("../helper/textModifer.js");
const redisClient = require("../config/redis.js");
const Fuse = require("fuse.js");
const archiver = require("archiver");

const getInputPage = async (req, res) => {
   try {
      const isCacheBuilt = await redisClient.get("form_cache_flag");

      let daftarKategori, daftarMerek, daftarSatuan, daftarRuangan;

      if (!isCacheBuilt) {
         const [kategori, merek, satuan, ruangan] = await Promise.all([
            //
            BarangModel.distinct("kategori"),
            BarangModel.distinct("merek"),
            BarangModel.distinct("satuan"),
            BarangModel.distinct("ruangan"),
         ]);

         daftarKategori = kategori.filter(Boolean);
         daftarMerek = merek.filter(Boolean);
         daftarSatuan = satuan.filter(Boolean);
         daftarRuangan = ruangan.filter(Boolean);

         if (daftarKategori.length > 0) await redisClient.sAdd("set_kategori", daftarKategori);
         if (daftarMerek.length > 0) await redisClient.sAdd("set_merek", daftarMerek);
         if (daftarSatuan.length > 0) await redisClient.sAdd("set_satuan", daftarSatuan);
         if (daftarRuangan.length > 0) await redisClient.sAdd("set_ruangan", daftarRuangan);

         await redisClient.set("form_cache_flag", "READY");
      } else {
         daftarKategori = await redisClient.sMembers("set_kategori");
         daftarMerek = await redisClient.sMembers("set_merek");
         daftarSatuan = await redisClient.sMembers("set_satuan");
         daftarRuangan = await redisClient.sMembers("set_ruangan");
      }

      return res.render("admin/input-inventory", {
         daftarKategori: daftarKategori.sort(),
         daftarMerek: daftarMerek.sort(),
         daftarSatuan: daftarSatuan.sort(),
         daftarRuangan: daftarRuangan.sort(),
         capitalizeEachWord: capitalEachWord,
      });
   } catch (error) {
      console.error("Error:", error);
      return res.status(500).send("Terjadi kesalahan");
   }
};

const postInventory = async (req, res) => {
   const { nama_barang, kategori, jumlah, satuan, ruangan, merek, detailKey, detailValue, jadwal_pengecekan, kondisi, tanggal_pengecekan } = req.body;
   const foto_barang = req.file;

   if (!nama_barang || !kategori || !jumlah || !ruangan) {
      return res.status(400).json({ message: "Mohon lengkapi semua data yang ada!" });
   }

   try {
      let detailObj = {};

      if (detailKey) {
         // convert "paksa" menjadi array
         const keys = Array.isArray(detailKey) ? detailKey : [detailKey];
         const values = Array.isArray(detailValue) ? detailValue : [detailValue];

         for (let i = 0; i < keys.length; i++) {
            const key = keys[i].toLowerCase().trim();
            const val = values[i].toLowerCase().trim();

            if (key !== "") {
               detailObj[key] = val;
            }
         }
      }

      const id_barang = uuidv4();
      const newBarang = {
         id_barang,
         nama_barang: nama_barang.toLowerCase(),
         kategori: kategori.toLowerCase(),
         jumlah,
         satuan: satuan.toLowerCase(),
         ruangan: ruangan.toLowerCase(),
         merek: merek.toLowerCase(),
         detail: detailObj,
         jadwal_pengecekan: jadwal_pengecekan,
      };

      if (kondisi && jadwal_pengecekan && kondisi !== "Belum Dicek" && jadwal_pengecekan !== "Tak Terjadwal") {
         newBarang.kondisi = kondisi;
         const tglPengecekan = tanggal_pengecekan ? new Date(tanggal_pengecekan) : new Date();

         newBarang.riwayat_pengecekan = [
            {
               tanggal: tglPengecekan,
               kondisi: kondisi,
            },
         ];
      }

      await BarangModel.create(newBarang);

      if (foto_barang) {
         const channel = getChannel();
         const payload = {
            id_barang: id_barang,
            file_path: foto_barang.path,
            file_name: foto_barang.filename,
            file_mime: foto_barang.mimetype,
         };

         await channel.sendToQueue("image_processing", Buffer.from(JSON.stringify(payload)));
      } else if (!foto_barang) {
         await BarangModel.findOneAndUpdate({ id_barang: id_barang }, { status_upload: "DONE" });
      }

      if (ruangan) await redisClient.sAdd("set_ruangan", ruangan.toLowerCase());
      if (kategori) await redisClient.sAdd("set_kategori", kategori.toLowerCase());
      if (satuan) await redisClient.sAdd("set_satuan", satuan.toLowerCase());
      if (merek) await redisClient.sAdd("set_merek", merek.toLowerCase());
      if (nama_barang) await redisClient.sAdd("set_nama_barang", nama_barang.toLowerCase());

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

      const searchTerms = req.query.search ? req.query.search.trim() : "";
      const filterKategori = req.query.kategori || "";
      const filterRuangan = req.query.ruangan || "";

      let daftarKategori = await redisClient.sMembers("set_kategori");
      let daftarRuangan = await redisClient.sMembers("set_ruangan");

      if (daftarKategori.length === 0 || daftarRuangan.length === 0) {
         const [kategori, ruangan] = await Promise.all([BarangModel.distinct("kategori"), BarangModel.distinct("ruangan")]);
         daftarKategori = kategori.filter(Boolean);
         daftarRuangan = ruangan.filter(Boolean);

         if (daftarKategori.length > 0) await redisClient.sAdd("set_kategori", daftarKategori);
         if (daftarRuangan.length > 0) await redisClient.sAdd("set_ruangan", daftarRuangan);
      }

      let query = {};

      if (filterKategori) query.kategori = filterKategori;
      if (filterRuangan) query.ruangan = filterRuangan;

      if (searchTerms) {
         let daftarBarang = await redisClient.sMembers("set_nama_barang");

         if (daftarBarang.length === 0) {
            const barang = await BarangModel.distinct("nama_barang");
            daftarBarang = barang.filter(Boolean);
            if (daftarBarang.length > 0) await redisClient.sAdd("set_nama_barang", daftarBarang);
         }

         const fuse = new Fuse(daftarBarang, { threshold: 0.3 });
         const result = fuse.search(searchTerms);

         const finalResult = result.map((r) => r.item);

         query.nama_barang = { $in: finalResult };
      }

      const totalBarang = await BarangModel.countDocuments(query);
      const totalPages = Math.ceil(totalBarang / limit) || 1;

      const inventories = await BarangModel.find(query)
         .skip((page - 1) * limit)
         .limit(limit)
         .sort({ createdAt: -1 });

      return res.render("admin/check-inventory.ejs", {
         page,
         limit,
         totalPages,
         totalBarang,
         currentPage: page,
         inventories,
         search: searchTerms,
         selectedKategori: filterKategori,
         selectedRuangan: filterRuangan,
         daftarKategori: daftarKategori.sort(),
         daftarRuangan: daftarRuangan.sort(),
         capitalizeEachWord: capitalEachWord,
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

   return res.render("admin/detail-item.ejs", { barang, capitalizeEachWord: capitalEachWord });
};

const getEditItemPage = async (req, res) => {
   try {
      const barang = await BarangModel.findOne({ id_barang: req.params.id_barang });
      if (!barang) {
         return res.status(404).json({ message: "Barang tidak ditemukan" });
      }

      const isCacheBuilt = await redisClient.get("form_cache_flag");
      let daftarKategori, daftarMerek, daftarSatuan, daftarRuangan, daftarBarang;

      if (!isCacheBuilt) {
         const [kategori, merek, satuan, ruangan, nama_barang] = await Promise.all([BarangModel.distinct("kategori"), BarangModel.distinct("merek"), BarangModel.distinct("satuan"), BarangModel.distinct("ruangan"), BarangModel.distinct("nama_barang")]);

         daftarKategori = kategori.filter(Boolean);
         daftarMerek = merek.filter(Boolean);
         daftarSatuan = satuan.filter(Boolean);
         daftarRuangan = ruangan.filter(Boolean);
         daftarBarang = nama_barang.filter(Boolean);

         if (daftarKategori.length > 0) await redisClient.sAdd("set_kategori", daftarKategori);
         if (daftarMerek.length > 0) await redisClient.sAdd("set_merek", daftarMerek);
         if (daftarSatuan.length > 0) await redisClient.sAdd("set_satuan", daftarSatuan);
         if (daftarRuangan.length > 0) await redisClient.sAdd("set_ruangan", daftarRuangan);
         if (daftarBarang.length > 0) await redisClient.sAdd("set_nama_barang", daftarBarang);

         await redisClient.set("form_cache_flag", "READY");
      } else {
         daftarKategori = await redisClient.sMembers("set_kategori");
         daftarMerek = await redisClient.sMembers("set_merek");
         daftarSatuan = await redisClient.sMembers("set_satuan");
         daftarRuangan = await redisClient.sMembers("set_ruangan");
      }

      let tanggalPengecekan = "";

      if (barang.riwayat_pengecekan.length > 0) {
         const last = barang.riwayat_pengecekan[barang.riwayat_pengecekan.length - 1].tanggal;

         tanggalPengecekan = last.toISOString().split("T")[0];
      }

      return res.render("admin/edit-item.ejs", {
         barang,
         daftarKategori: daftarKategori.sort(),
         daftarMerek: daftarMerek.sort(),
         daftarSatuan: daftarSatuan.sort(),
         daftarRuangan: daftarRuangan.sort(),
         capitalizeEachWord: capitalEachWord,
         tanggalPengecekan: tanggalPengecekan,
      });
   } catch (error) {
      console.error("error", error);
      return res.status(500).json({ message: "Terjadi kesalahan" });
   }
};

const putItemEdit = async (req, res) => {
   const { nama_barang, kategori, jumlah, satuan, ruangan, merek, detailKey, detailValue, kondisi, jadwal_pengecekan, catatan_pengecekan, tanggal_pengecekan } = req.body;
   const foto_barang = req.file;

   let dataBarang = {};

   if (nama_barang) dataBarang.nama_barang = nama_barang.toLowerCase();
   if (kategori) dataBarang.kategori = kategori.toLowerCase();
   if (jumlah) dataBarang.jumlah = jumlah;
   if (satuan) dataBarang.satuan = satuan.toLowerCase();
   if (ruangan) dataBarang.ruangan = ruangan.toLowerCase();
   if (merek) dataBarang.merek = merek.toLowerCase();
   if (kondisi) dataBarang.kondisi = kondisi;
   if (jadwal_pengecekan) dataBarang.jadwal_pengecekan = jadwal_pengecekan;

   let detailObj = {};

   if (detailKey) {
      const keys = Array.isArray(detailKey) ? detailKey : [detailKey];
      const values = Array.isArray(detailValue) ? detailValue : [detailValue];
      for (let i = 0; i < keys.length; i++) {
         const key = keys[i].toLowerCase().trim();
         const val = values[i].toLowerCase().trim();
         if (key !== "") {
            detailObj[key] = val;
         }
      }
   }

   dataBarang.detail = detailObj;

   try {
      const item = await BarangModel.findOneAndUpdate({ id_barang: req.params.id_barang }, { $set: dataBarang }, { runValidators: true, new: true });

      if (!item) return res.status(404).json({ message: "Barang tidak ditemukan" });

      if (kondisi && jadwal_pengecekan && kondisi !== "Belum Dicek" && jadwal_pengecekan !== "Tak Terjadwal") {
         const tglPengecekan = tanggal_pengecekan ? new Date(tanggal_pengecekan) : new Date();
         await BarangModel.findOneAndUpdate(
            { id_barang: req.params.id_barang },
            {
               $push: {
                  riwayat_pengecekan: {
                     tanggal: tglPengecekan,
                     kondisi: kondisi || item.kondisi,
                     catatan: catatan_pengecekan,
                  },
               },
            },
         );
      }

      if (foto_barang) {
         const payload = {
            id_barang: req.params.id_barang,
            file_path: foto_barang.path,
            file_name: foto_barang.filename,
            file_mime: foto_barang.mimetype,
         };
         const channel = getChannel();

         if (item.image_name) {
            const gambarLama = {
               image_name: item.image_name,
            };
            await channel.sendToQueue("image_deletion", Buffer.from(JSON.stringify(gambarLama)));
         }

         await channel.sendToQueue("image_processing", Buffer.from(JSON.stringify(payload)));

         await BarangModel.findOneAndUpdate({ id_barang: req.params.id_barang }, { status_upload: "PENDING" });
      }

      if (ruangan) await redisClient.sAdd("set_ruangan", ruangan.toLowerCase());
      if (kategori) await redisClient.sAdd("set_kategori", kategori.toLowerCase());
      if (satuan) await redisClient.sAdd("set_satuan", satuan.toLowerCase());
      if (merek) await redisClient.sAdd("set_merek", merek.toLowerCase());
      if (nama_barang) await redisClient.sAdd("set_nama_barang", nama_barang.toLowerCase());
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

   try {
      const channel = getChannel();
      if (barang.image_name !== null) {
         const payload = {
            image_name: barang.image_name,
         };

         await channel.sendToQueue("image_deletion", Buffer.from(JSON.stringify(payload)));
      }

      await redisClient.sRem("set_nama_barang", barang.nama_barang.toLowerCase());
   } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Terjadi kesalahan" });
   }

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
      "Content-Disposition": `attachment; filename=${barang.nama_barang.trim()}_${barang.ruangan}_QR.png`,
   });

   res.send(qr);
};

const bulkDelete = async (req, res) => {
   try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
         return res.status(400).json({ message: "Tidak ada barang yang dipilih" });
      }

      const barang = await BarangModel.find({ id_barang: { $in: ids } });

      if (barang.length === 0) {
         return res.status(404).json({ message: "Barang tidak ditemukan" });
      }

      await BarangModel.deleteMany({ id_barang: { $in: ids } });

      const channel = getChannel();

      for (let b of barang) {
         if (b.image_name !== null) {
            const payload = {
               image_name: b.image_name,
            };
            await channel.sendToQueue("image_deletion", Buffer.from(JSON.stringify(payload)));
         }
      }

      return res.status(200).json({ message: "Bulk delete berhasil" });
   } catch (error) {
      console.error("error", error);
      return res.status(500).json({ message: "Bulk delete gagal" });
   }
};

const bulkDownloadQR = async (req, res) => {
   try {
      const ids = req.query.ids;

      if (!ids) {
         return res.status(404).json({ message: "Tidak ada barang yang dipilih" });
      }

      const id = ids.split(",");
      const barang = await BarangModel.find({ id_barang: { $in: id } });

      if (barang.length === 0) {
         return res.status(404).json({ message: "Barang tidak ditemukan" });
      }

      const archive = archiver("zip", {
         zlib: { level: 9 },
      });

      res.set({
         "Content-Type": "application/zip",
         "Content-Disposition": `attachment; filename=QR-CODE_${barang.length}_barang.zip`,
      });

      archive.pipe(res);

      for (let b of barang) {
         const buffer = await generateQR(b);

         archive.append(buffer, { name: `${b.nama_barang.trim()}_${b.ruangan}_QR.png` });
      }

      await archive.finalize();
   } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Terjadi kesalahan server" });
   }
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
   bulkDelete,
   bulkDownloadQR,
};
