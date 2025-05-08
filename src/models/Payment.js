import mongoose from 'mongoose';
import { syncLedger } from '../services/CoinGateService.js';

const paymentTransactionSchema = new mongoose.Schema({
  amount: {
    type: String,
    required: true,
    validate: {
      validator: (v) => /^\d+(\.\d{1,8})?$/.test(v),
      message: "Max 8 decimal places"
    }
  },
  price_currency: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 4
  },
  receive_currency: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 4
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  paymentType: {
    type: String,
    required: true,
    enum: ['order', 'send', 'refund'],
    lowercase: true
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: [
      'draft',
      'in_progress',
      'processing',
      'new', 
      'pending', 
      'confirming', 
      'paid',
      'invalid', 
      'expired', 
      'canceled', 
      'refunded',
      'partially_refunded'
    ],
    default: 'pending'
  },
  transactionDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  bidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: function() {
      return this.paymentType === 'order'; // Only required for orders
    }
  },
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: function() {
      return this.paymentType === 'send'; // Only required for orders
    }
  },
  auction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auctions',
    required: function() {
      return this.paymentType === 'order' || "send"; // Only required for orders
    }
  },
  coinGateId: {
    type: Number,
    unique: true,
  },
  coinGatePaymentLink: {
    type: String,
    validate: {
      validator: (value) => {
        if (!value) return true; // Optional
        return /^https?:\/\//.test(value);
      },
      message: 'Must be a valid URL'
    }
  },
  metadata: { // For additional flexible data
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, 
{
  timestamps: true, // Adds createdAt and updatedAt
});



// Indexes for better query performance
paymentTransactionSchema.index({ bidder: 1, paymentStatus: 1 });
paymentTransactionSchema.index({ auction: 1, paymentType: 1 });
paymentTransactionSchema.index({ transactionDate: -1 });

paymentTransactionSchema.post('save', async function(doc) {
  try {
    await syncLedger(doc); // properly invoked sync
  } catch (err) {
    console.error('Failed to sync ledger:', err);
    next(err)
    // Consider adding error handling/retry logic here
  }
});

// Virtual for formatted amount
paymentTransactionSchema.virtual('amountNumber').get(function() {
  return parseFloat(this.amount);
});

export default mongoose.model('Payments', paymentTransactionSchema);