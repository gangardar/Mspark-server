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
  isDeleted: { type: Boolean, default: false },
});

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, username: this.username, role: this.role },
    "secretkey",
    { expiresIn: "7d" }
  );
  return token;
};

export default mongoose.model("Users", userSchema);
