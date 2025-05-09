import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
    min: 3,
    max: 255,
  },
  username: {
    type: String,
    required: true,
    trim: true,
    unique : true,
    min: 3,
    max: 255,
  },
  role: {
    type: String,
    required: true,
    trim: true,
    enum: ["admin", "merchant", "bidder"],
  },
  profile: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    max: 255,
    min: 12,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    min: 6,
    max: 255,
  },
  idProof: {
    type: [String],
    required: false,
  },
  address : {
    type : mongoose.Schema.Types.ObjectId,
    ref : 'Address'
  },
  wallet : {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallets'
  },
  isDeleted: { type: Boolean, default: false },
  deletedAt: {type: Date, 
    required: function() {
      return this.isDeleted; 
    }
  }
},{timestamps : true});

userSchema.methods.generateAuthToken = function (expiration = '7d') {
  const token = jwt.sign(
    { _id: this._id, username: this.username, role: this.role, profile : this?.profile},
    process.env.JWT_SECRET_KEY,
    { expiresIn: expiration }
  );
  return token;
};

export default mongoose.model("Users", userSchema);
