import mongoose from "mongoose";

const auctionSchema = new mongoose.Schema(
  {
    priceStart: {
      type: Number,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    currentPrice: {
      type: Number,
      default: 0,
    },
    bids: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bids"
    }],
    highestBidderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
    gemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gems",
      required: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true }
);

// Indexes for better query performance
auctionSchema.index({ status: 1 });
auctionSchema.index({ endTime: 1 });
auctionSchema.index({ gemId: 1 });
auctionSchema.index({ gemId: 1, status: 1 });
auctionSchema.index({ isDeleted: 1, status: 1 });

export default mongoose.model("Auctions", auctionSchema);
