import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Users'
  },
  status: {
    type: String,
    enum: ['active','pending', 'blocked'],
    default: 'pending'
  },
  coinGateCurrencyId: {
    type: Number,
    require: true
  },
  coinGatePlatformId: {
    type: Number,
    require: true
  },
  platformTitle: {
    type: String,
    require: true
  },
  currencyTitle: {
    type: String,
    require: true
  },
  currencySymbol: {
    type: String,
    require: true
  },
  cryptoAddress: {
    type: String,
    require: true
  },
  totalAmount: {
    type: String,
    validate: {
      validator: (v) => /^\d+(\.\d{1,8})?$/.test(v),
      message: "Max 8 decimal places"
    }
  },
  coinGateId: {
    type: Number,
    require: true
  },
  coinGatePayoutId: {
    type: Number,
    require: true
  },
  isDeleted : {
    type : Boolean,
    default: false,
    require : true
  },
  deletedAt : {
    type : Date,
  }
}, 
{timestamps : true}
);

export default mongoose.model('Wallets', walletSchema);
