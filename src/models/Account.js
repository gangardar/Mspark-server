import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      require: true,
    },
    symbol: {
      type: String,
      min: 2,
      max: 4,
    },
    balance: {
      type: String,
      require: true,
      validate: {
        validator: (v) => /^\d+(\.\d{1,8})?$/.test(v),
        message: "Max 8 decimal places",
      },
    },
    coinGateId: {
      type: String,
      required: true,
      unique: true,
    },
    walletAddress: {
      type: String,
      require: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Accounts", accountSchema);
