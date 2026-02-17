const BarangModel = require("../models/Barang.js");
const { getChannel } = require("../config/mq.js");

const getInputPage = (req, res) => {
   return res.render("admin/input-inventory.ejs");
};

const postInventory = async (req, res) => {
   console.log(req.body);
   const { nama_barang, nomor_seri, detailKey, detailValue } = req.body;

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

      await BarangModel.insertOne({ nama_barang, nomor_seri, detail: detailObj });

      const channel = getChannel();
      const payload = {
         nama_barang,
         nomor_seri,
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

module.exports = {
   getInputPage,
   postInventory,
   getInventoryPage,
};
