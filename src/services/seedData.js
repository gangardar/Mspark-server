import mongoose from "mongoose";
import Mspark from "../models/Mspark.js";
import logger from "../config/logger.js";

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