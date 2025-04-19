import mongoose from "mongoose";
import Mspark from "../models/Mspark.js";
import logger from "../config/logger.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";

export const seedPrimaryMspark = async () => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    // Check if primary MSPark already exists
    const existingPrimary = await Mspark.findOne({ type: "primary" }).session(session);
    
    if (existingPrimary) {
      await session.abortTransaction();
      session.endSession();
      logger.info("Primary MSPark already exists");
      return {
        success: true,
        message: "Primary MSPark already exists",
        mspark: existingPrimary
      };
    }

    // Create new primary MSPark
    const defaultPrimaryMspark = {
      name: "Mspark Primary",
      type: "primary",
    };

    const [newMspark] = await Mspark.create([defaultPrimaryMspark], { session });

    await session.commitTransaction();
    session.endSession();
    
    logger.info("Primary MSPark created successfully");
    return {
      success: true,
      message: "Primary MSPark created successfully",
      mspark: newMspark
    };

  } catch (error) {
    await session.abortTransaction();    
    logger.error(`Failed to seed primary MSPark: ${error.message}`);
    throw error;
  }finally{
    session.endSession();
  }
};


export const seedFirstAdmin = async () => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    // Check if primary MSPark already exists
    const existingAdmin = await User.findOne({ role: "admin" }).session(session);
    
    if (existingAdmin) {
      await session.abortTransaction();
      session.endSession();
      logger.info("Admin account already exists");
      return {
        success: true,
        message: "Admin account already exists",
        mspark: existingAdmin
      };
    }

    // Create new primary MSPark
    const adminData = {
      fullName : "Admin",
      username : "admin",
      role: "admin",
      email: "admin@mspark.com",
      password: `${process.env.Admin_Password}`,
    };
    adminData.password = await bcrypt.hash(adminData.password, 10);

    const [newAdmin] = await User.create([adminData], { session });

    await session.commitTransaction();
    session.endSession();
    
    logger.info("Admin created successfully");
    return {
      success: true,
      message: "Admin created successfully",
      admin: newAdmin
    };

  } catch (error) {
    await session.abortTransaction();    
    logger.error(`Failed to seed Admin: ${error.message}`);
    throw error;
  }finally{
    session.endSession();
  }
};