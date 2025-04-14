import mongoose, { Mongoose } from "mongoose";
import Auction from "../models/Auction.js";
import { createOrder } from "./CoinGateService.js";
import { recordOrder } from "./HandlePayment.js";
import Gem from "../models/Gem.js";
import { sendAuctionCompletionEmails, sendPaymentLinkToWinner } from "./MailServices.js";

export const handleAuctionComplete = async (id) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const auction = await Auction.findOne({ _id: id, isDeleted: false })
      .populate("gemId", "name images price type")
      .populate("merchantId", "username, email")
      .populate("highestBidderId", "username, email");
    if (!auction) throw new Error(`Auction: ${auction._id} doesn't exists`);
    if (auction.status === "completed")
      throw new Error(`${auction._id} is already completed`);
    await sendAuctionCompletionEmails(auction)
    auction.status = "completed";
    await auction.save({ session });
    if (!auction?.gemId?._id) throw new Error("Gem is not found in auction.");
    await Gem.findByIdAndUpdate(
      auction.gemId._id,
      { status: "sold" },
      { session, runValidators: true }
    );
    if (auction.highestBidderId) {
      const response = await (await createOrder(auction)).data
      const payment = await recordOrder(auction, response, session);
      await sendPaymentLinkToWinner(auction,payment)
    }
    await session.commitTransaction();
    return true;
  } catch (error) {
    session.abortTransaction();
    console.error("Error completing auction:", error);
    throw error;
  } finally {
    session.endSession();
  }
};
