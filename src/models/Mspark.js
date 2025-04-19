import mongoose from "mongoose";

// models/Mspark.js
const msparkSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["primary", "secondary"],
      default: "primary",
      required: true,
      unique: true,
    },
    accounts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Accounts",
        unique: true,
      },
    ],
    address: {
      type: mongoose.Schema.ObjectId,
      ref: "Address",
    },
    platformFee: { type: String, default: "0.05" }, //5%
    verificationFee: { type: String, default: "0.02" }, // 2%
  },
  { timestamps: true }
);
export default mongoose.model("Mspark", msparkSchema);
