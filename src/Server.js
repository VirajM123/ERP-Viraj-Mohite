const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI, {
    dbName: "Total_Solution",
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err));

const registerSchema = new mongoose.Schema(
  {
    distributorId: String,
    firmId: String,
    firmCode: String,
    firmName: String,
    address1: String,
    address2: String,
    city: String,
    pinCode: String,
    state: String,
    country: String,
    phoneNo: String,
    mobileNo: String,
    tinNo: String,
    regNo: String,
    gstNo: String,
    drugLicNo: String,
    foodLicenceNo: String,
    apiKey: String,
    email: String,
    userName: String,
    password: String,
  },
  { timestamps: true }
);

const Register = mongoose.model("Mas_Register", registerSchema, "Mas_Register");

const generateDistributorId = async () => {
  const count = await Register.distinct("distributorId");
  return `DIST-${1001 + count.length}`;
};

const generateFirmId = async () => {
  const count = await Register.countDocuments();
  return `FIRM-${2001 + count}`;
};

app.post("/api/register", async (req, res) => {
  try {
    const { userName, password, firmCode, firmName } = req.body;

    if (!userName || !password || !firmCode || !firmName) {
      return res.status(400).json({
        message: "User Name, Password, Firm Code and Firm Name are required",
      });
    }

    const existingUser = await Register.findOne({ userName });

    const distributorId = existingUser
      ? existingUser.distributorId
      : await generateDistributorId();

    const firmId = await generateFirmId();
    const hashedPassword = await bcrypt.hash(password, 10);

    const newRegister = await Register.create({
      ...req.body,
      distributorId,
      firmId,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "Registration saved successfully",
      data: {
        distributorId: newRegister.distributorId,
        firmId: newRegister.firmId,
        firmName: newRegister.firmName,
        userName: newRegister.userName,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { userName, password } = req.body;

    const firms = await Register.find({ userName });

    if (!firms.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, firms[0].password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.json({
      message: "Login successful",
      distributorId: firms[0].distributorId,
      userName,
      firms: firms.map((f) => ({
        firmId: f.firmId,
        firmCode: f.firmCode,
        firmName: f.firmName,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});