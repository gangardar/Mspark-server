import mongoose from "mongoose";

const gemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, min: 3, max: 255 }, // Mandatory
    type: {
      type: String,
      trim: true,
      min: 3,
      max: 255,
      default: "unknown",
    },
    deliveries: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Deliveries" 
    }], 
    weight: { type: Number },
    shape: { type: String, enum: ["Round", "Oval", "Square", "Pear","Rough", "Other"] },
    rarity: { type: String, enum: ["Common", "Uncommon", "Rare", "Very Rare"] },
    color: {
      type: String,
      required: true,
    }, // Mandatory
    dimension: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },
    images: { type: [String] },
    density: { type: Number },
    refractiveIndex: { type: Number },
    hardness: { type: Number },
    transparency: {
      type: String,
      enum: ["Opaque", "Translucent", "Transparent"],
    },
    evidentFeatures: { type: String },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected", "sold"],
      default: "pending",
    },
    price: { type: Number },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    verifierId : {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users"
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

gemSchema.index({ deliveries: 1 });

export default mongoose.model('Gems',gemSchema);
