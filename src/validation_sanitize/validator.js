const { z } = require("zod");

const sanitizeHTML = (val) => (typeof val === "string" ? val.replace(/<[^>]*>?/gm, "") : val);

const inventorySchema = z.object({
   nama_barang: z
      .string()
      .min(1, "Nama barang wajib diisi")
      .transform(sanitizeHTML)
      .transform((val) => val.trim()),

   kategori: z
      .string()
      .min(1, "Kategori wajib diisi")
      .transform(sanitizeHTML)
      .transform((val) => val.trim()),

   ruangan: z
      .string()
      .min(1, "Ruangan wajib diisi")
      .transform(sanitizeHTML)
      .transform((val) => val.trim()),

   jumlah: z.coerce.number().min(0, "Jumlah tidak boleh minus"),

   satuan: z
      .string()
      .optional()
      .default("")
      .transform(sanitizeHTML)
      .transform((val) => val.trim()),

   merek: z
      .string()
      .optional()
      .default("")
      .transform(sanitizeHTML)
      .transform((val) => val.trim()),

   kondisi: z.string().optional().transform(sanitizeHTML),
   jadwal_pengecekan: z.string().optional().transform(sanitizeHTML),
   tanggal_pengecekan: z.string().optional().transform(sanitizeHTML),

   detailKey: z.union([z.string(), z.array(z.string())]).optional(),
   detailValue: z.union([z.string(), z.array(z.string())]).optional(),
});

const loginSchema = z.object({
   username: z
      .string()
      .min(1, "Username wajib diisi")
      .max(32)
      .transform((val) => val.trim()),
   password: z.string().min(8, "Password wajib diisi").max(24),
});

const validate = (schema) => async (req, res, next) => {
   try {
      const validatedData = await schema.parseAsync(req.body);
      req.body = validatedData;
      next();
   } catch (error) {
      if (error instanceof z.ZodError) {
         const errorMessages = error.issues.map((err) => err.message).join(", ");
         console.error(errorMessages);
         req.flash("error", `Validasi Gagal: ${errorMessages}`);
      } else {
         req.flash("error", "Terjadi kesalahan pada validasi data.");
      }
      const referer = req.get("Referrer") || "/admin/check-inventory";
      return res.redirect(referer);
   }
};

module.exports = {
   inventorySchema,
   loginSchema,
   validate,
};
