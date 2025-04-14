import mongoose from "mongoose";

const bidSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    bidAmount: {
      type : Number,
      min : 1,
      required: [true, "Amount is required"],
      set: v => parseFloat(v.toFixed(2)) // Ensure 2 decimal places for currency
    },
    auctionId: {
      type : mongoose.Schema.Types.ObjectId,
      ref: "Auctions",
      required : true
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true }
);

bidSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  await this.save();
};

// Pre-save hook to validate and update auction
bidSchema.pre('save', async function(next) {
  // Only run if amount is modified (not on every save)
  if (!this.isModified('bidAmount')) return next();
  
  const Auction = mongoose.model('Auctions');
  const auction = await Auction.findById(this.auctionId);
  
  // Validate auction is active
  if (auction.status !== 'active') {
    throw new Error('Cannot bid on inactive auction');
  }
  
  // Validate bid amount is higher than current price
  if (this.bidAmount <= auction.currentPrice) {
    throw new Error(`Bid must be higher than current price: ${auction.currentPrice}`);
  }
  
  // Update auction's current price
  auction.currentPrice = this.bidAmount;
  auction.highestBidderId = this.user;
  
  // Add bid reference to auction
  if (!auction.bids.includes(this._id)) {
    auction.bids.push(this._id);
  }
  
  await auction.save();
  next();
});


export default mongoose.model("Bids", bidSchema);
