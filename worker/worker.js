const amqp = require("amqplib");
const sharp = require("sharp");
const minio = require("minio");
const fs = require("fs");
const mongoose = require("mongoose");
const BarangModel = require("../src/models/Barang.js");

let connection, channel;
const RABBITMQ_URI = process.env.RABBITMQ_URI;
const BUCKET_NAME = "image-inventory";
const MINIO_PORT = parseInt(process.env.MINIO_PORT);
const MONGO_URI = process.env.MONGO_URI;

// minio config
const minioClient = new minio.Client({
   endPoint: process.env.MINIO_ENDPOINT,
   port: MINIO_PORT,
   useSSL: false,
   accessKey: process.env.MINIO_ACCESS_KEY,
   secretKey: process.env.MINIO_SECRET_KEY,
});

const processMQ = async () => {
   await mongoose.connect(MONGO_URI).then(console.log("Worker mongo is connected"));

   try {
      connection = await amqp.connect(`${RABBITMQ_URI}`);
      channel = await connection.createChannel();
      await channel.assertQueue("image_processing", { durable: true });
      channel.prefetch(1);

      console.log("Worker MQ is established");

      channel.consume("image_processing", async (data) => {
         if (!data) {
            return;
         }

         try {
            const { id_barang, nomor_seri, file_path, file_name, file_mime } = JSON.parse(data.content.toString());
            console.log(`Processing barang dgn id: ${id_barang}`);

            const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
            if (!bucketExists) {
               await minioClient.makeBucket(BUCKET_NAME, "us-east-1");
               const policy = {
                  Version: "2012-10-17",
                  Statement: [
                     {
                        Action: ["s3:GetObject"],
                        Effect: "Allow",
                        Principal: { AWS: ["*"] },
                        Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
                     },
                  ],
               };
               await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
            }

            const newImageName = `${id_barang}-${Date.now()}.webp`;
            const compressedBuffer = await sharp(file_path)
               .resize({
                  width: 800,
                  withoutEnlargement: true,
               })
               .webp({
                  quality: 90,
                  effort: 4,
                  nearLossless: true,
               })
               .toBuffer();

            await minioClient.putObject(BUCKET_NAME, newImageName, compressedBuffer, compressedBuffer.length, {
               "content-type": "image/webp",
            });

            const newImageURL = `http://localhost:${MINIO_PORT}/${BUCKET_NAME}/${newImageName}`;

            await BarangModel.findOneAndUpdate({ id_barang: id_barang }, { image_url: newImageURL, status_upload: "DONE" });

            if (fs.existsSync(file_path)) {
               fs.unlinkSync(file_path);
               console.log(`Deleted temp ${file_name} - ${file_path}`);
            }

            console.log(`Sukses memproses gambar! URL: ${newImageURL}`);

            channel.ack(data);
         } catch (error) {
            console.error("Something went wrong with the worker", error);
            channel.nack(data, false, true);
         }
      });
   } catch (error) {
      console.error("Failed to establish worker MQ connection, trying again in 3 seconds", error);
      setTimeout(() => {
         processMQ();
      }, 3000);
   }
};

processMQ();
