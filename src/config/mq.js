const amqp = require("amqplib");

// MQ connection
let connection, channel;
const RABBITMQ_URI = process.env.RABBITMQ_URI;

// const startMQ = async () => {
//    try {
//       connection = await amqp.connect(`${RABBITMQ_URI}`);
//       channel = await connection.createChannel();

//       await channel.assertQueue("image_processing", { durable: true });
//       await channel.assertQueue("image_deletion", { durable: true });

//       console.log("MQ connection is established");
//    } catch (error) {
//       console.error("Failed to establish MQ connection, trying again in 3 seconds", error);
//       setTimeout(() => {
//          startMQ();
//       }, 3000);
//    }
// };

const startMQ = async () => {
   while (true) {
      try {
         connection = await amqp.connect(RABBITMQ_URI);
         channel = await connection.createChannel();

         await channel.assertQueue("image_processing", { durable: true });
         await channel.assertQueue("image_deletion", { durable: true });

         console.log("MQ connection is established");
         break; // keluar loop kalau sukses
      } catch (error) {
         console.error("MQ not ready, retrying in 3s...");
         await new Promise((res) => setTimeout(res, 3000));
      }
   }
};

const getChannel = () => {
   if (!channel) {
      throw new Error("MQ channel is not yet established");
   }

   return channel;
};

module.exports = { startMQ, getChannel };
