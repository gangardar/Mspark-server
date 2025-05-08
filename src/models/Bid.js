import mongoose from "mongoose";
import { sendOutBidMail } from "../services/MailServices.js";
import User from "./User.js";
import Auction from "./Auction.js";

const bidSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    bidAmount: {
      type: Number,
      min: 1,
      required: [true, "Amount is required"],
      set: (v) => parseFloat(v.toFixed(2)), // Ensure 2 decimal places for currency
    },
    auctionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auctions",
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true }
);

bidSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  await this.save();
};

// Pre-save hook to validate and update auction
bidSchema.pre("save", async function (next) {
  // Only run if amount is modified (not on every save)
  if (!this.isModified("bidAmount")) return next();

  const auction = await Auction.findById(this.auctionId).populate(
    "gemId highestBidderId merchantId"
  );

  // Validate auction is active
  if (auction.status !== "active") {
    throw new Error("Cannot bid on inactive auction");
  }

  // Validate bid amount is higher than current price
  if (this.bidAmount <= auction.currentPrice) {
    throw new Error(
      `Bid must be higher than current price: ${auction.currentPrice}`
    );
  }
  // Get the previous highest bidder (if any)
  const previousHighestBidder = auction.highestBidderId;
  const previousHighestPrice = auction.currentPrice;

  // Update auction's current price
  auction.currentPrice = this.bidAmount;
  auction.highestBidderId = this.user;

  // Add bid reference to auction
  if (!auction.bids.includes(this._id)) {
    auction.bids.push(this._id);
  }

  await auction.save();

  // Send outbid notification if there was a previous highest bidder
  // and it's not the same user who just placed the new highest bid
  if (previousHighestBidder && !previousHighestBidder.equals(this.user)) {
    try {
      await sendOutBidMail(
        previousHighestBidder,
        { ...auction, currentPrice: previousHighestPrice },
        { bidAmount: this.bidAmount }
      );
    } catch (emailError) {
      console.error("Failed to send outbid email:", emailError);
      // Don't fail the bid if email fails
    }
  }

  next();
});

export default mongoose.model("Bids", bidSchema);
