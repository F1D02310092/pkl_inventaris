const BarangModel = require("../models/Barang.js");

const getDashboardPage = async (req, res) => {
   try {
      const totalJenisBarang = await BarangModel.countDocuments();

      const aggregateKuantitas = await BarangModel.aggregate([{ $group: { _id: null, total: { $sum: "$jumlah" } } }]);
      const totalKuantitasFisik = aggregateKuantitas.length > 0 ? aggregateKuantitas[0].total : 0;

      const totalRuangan = (await BarangModel.distinct("ruangan")).length;

      const chartRuangan = await BarangModel.aggregate([{ $group: { _id: "$ruangan", total: { $sum: "$jumlah" } } }, { $sort: { total: -1 } }]);
      const chartKategori = await BarangModel.aggregate([{ $group: { _id: "$kategori", total: { $sum: "$jumlah" } } }, { $sort: { total: -1 } }]);

      const chartKondisi = await BarangModel.aggregate([{ $group: { _id: "$kondisi", total: { $sum: "$jumlah" } } }, { $sort: { total: -1 } }]);

      const recentItems = await BarangModel.find().sort({ createdAt: -1 }).limit(5).lean();

      return res.render("home.ejs", {
         stats: {
            totalJenisBarang,
            totalKuantitasFisik,
            totalRuangan,
         },
         chartData: {
            ruangan: JSON.stringify(chartRuangan),
            kategori: JSON.stringify(chartKategori),
            kondisi: JSON.stringify(chartKondisi),
         },
         rawRuangan: chartRuangan,
         recentItems,
      });
   } catch (error) {
      console.error("Error loading dashboard:", error);
      return res.status(500).send("Terjadi Kesalahan Server");
   }
};

module.exports = { getDashboardPage };
