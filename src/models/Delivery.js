import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
  {
    gemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Gems",
        required: true,
      },
    ], // Array of gem IDs in this delivery
    type: {
      type: String,
      enum: ["verification", "sale", "return"],
      required: true,
    },
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    }, // Merchant/Mspark/Bidder
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    }, // Mspark/Bidder/Merchant
    deliveryService: {
        type : String,
        required: function() {
            return this.status !== 'pending'; // Only required for orders
          }
    },
    status: {
      type: String,
      enum: ["pending", "in_transit", "delivered", "returned"],
      default: "pending",
    },
    trackingNumber: { type: String },
  },
  { timeStamps: true }
);

export default mongoose.model('Deliveries', deliverySchema)
