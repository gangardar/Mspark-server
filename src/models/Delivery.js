import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
  {
    gems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Gems",
        required: true,
      },
    ], 
    type: {
      type: String,
      enum: ["verification", "sale", "return"],
      required: true,
    },
    fromType: { 
      type: String, 
      enum: ["Users", "Mspark"], 
      required: true 
    },
    from: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "fromType",
    },
    toType: { 
      type: String, 
      enum: ["Users", "Mspark"], 
      required: true 
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "toType",
    },
    trackingUrl : {
      type: String,
    },
    deliveryService: {
        type : String,
        required: function() {
            return this.status !== 'pending'; // Not required for pending
          }
    },
    trackingNumber: { type: String, unique: true },
    status: {
      type: String,
      enum: ["pending", "in_transit", "delivered"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model('Deliveries', deliverySchema)
