const redis = require("redis");

const redisClient = redis.createClient({
   url: process.env.REDIS_URI,
});

redisClient.on("error", (err) => {
   console.log("Redis connection error", err);
});

redisClient.on("connect", () => {
   console.log("Redis connection success");
});

(async () => {
   await redisClient.connect();
})();

module.exports = redisClient;
