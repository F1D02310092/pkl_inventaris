const amqp = require("amqplib");

let connection, channel;
const RABBITMQ_URI = process.env.RABBITMQ_URI;

const processMQ = async () => {
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
            const { nama_barang, nomor_seri } = JSON.parse(data.content.toString());

            console.log(`Processing barang: ${nama_barang}, nomor seri: ${nomor_seri}`);

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
