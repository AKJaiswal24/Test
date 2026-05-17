require('dotenv').config({ path: "D:/demowork/start2rent/backend/.env" });
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI);

mongoose.connection.on("open", async () => {
  const User = require("D:/demowork/start2rent/backend/models/User");
  const users = await User.find({ isLender: true });
  users.forEach(u => {
    console.log("Name:", u.name, "| Email:", u.email, "| isLender:", !!u.isLender);
  });
  mongoose.disconnect();
  process.exit(0);
});

mongoose.connection.on("error", (err) => {
  console.error("Error:", err.message);
  process.exit(1);
});