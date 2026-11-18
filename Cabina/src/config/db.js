const mongoose = require("mongoose");
const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
  const URI = process.env.MONGO_URI;
  if (!URI) {
    throw new Error("MONGO_URI is not defined in eviroment variables");
  }
  await mongoose.connect(URI);
};

module.exports = connectDB;
