import Auction from "../models/Auction.js";
import schedule from "node-schedule";
import logger from "../config/logger.js";
import { handleAuctionComplete } from "./HandleAuctions.js";

// Store job references to prevent memory leaks
export const activeJobs = new Map();

// Initialize scheduler on server start
export const initAuctionScheduler = async () => {
  try {
    await scheduleExistingAuctions();
    logger.info('Auction scheduler initialized');
  } catch (error) {
    logger.error('Failed to initialize auction scheduler:', error);
  }
};

// Schedule all active auctions
const scheduleExistingAuctions = async () => {
  try {
    const now = new Date();
    const activeAuctions = await Auction.find({ 
      status: "active",
      isDeleted: false 
    }).populate("gemId", "name images price type")
    .populate("merchantId", "username, email")
    .populate("highestBidderId", "username, email");

    // Process overdue auctions immediately
    const overdueAuctions = activeAuctions.filter(
      auction => new Date(auction.endTime) <= now
    );

    // Schedule future auctions
    const futureAuctions = activeAuctions.filter(
      auction => new Date(auction.endTime) > now
    );

    // Batch process overdue auctions with error handling
    await Promise.allSettled(
      overdueAuctions.map(auction => 
        processAuctionCompletion(auction._id)
    ));

    // Schedule future auctions
    futureAuctions.forEach(scheduleAuctionJob);

  } catch (error) {
    logger.error('Error scheduling existing auctions:', error);
  }
};

// Process auction completion with retries
const processAuctionCompletion = async (auctionId, attempt = 3) => {
  try {
    await handleAuctionComplete(auctionId);
    activeJobs.delete(auctionId);
  } catch (error) {
    if (attempt <= 3) {
      logger.warn(`Retrying auction ${auctionId} (attempt ${attempt})`);
      setTimeout(() => processAuctionCompletion(auctionId, attempt + 1), 5000 * attempt);
    } else {
      logger.error(`Failed to complete auction ${auctionId}:`, error);
      // TODO: Add dead letter queue or admin notification
    }
  }
};

// Schedule a single auction's completion
const scheduleAuctionJob = async(auction) => {
  try {
    // Cancel existing job if any
    if (activeJobs.has(auction._id)) {
      activeJobs.get(auction._id).cancel();
    }

    const job = schedule.scheduleJob(
      new Date(auction.endTime),
      async () => await processAuctionCompletion(auction._id)
    );

    // Store job reference
    activeJobs.set(auction._id, job);
    logger.debug(`Scheduled auction ${auction._id} to complete at ${auction.endTime}`);
    console.log(`Scheduled auction ${auction._id} to complete at ${auction.endTime}`);


  } catch (error) {
    console.log(error)
    logger.error(`Failed to schedule auction ${auction._id}:`, error);
  }
};

// API to manually reschedule an auction byId
export const rescheduleAuctionJobById = async (auctionId) => {
  const auction = await Auction.findById(auctionId);
  if (auction && auction.status === 'active') {
    await scheduleAuctionJob(auction);
  }
};

// API to manually reschedule an auction
export const rescheduleAuctionJob = async (auction) => {
    if (auction && auction.status === 'active') {
      await scheduleAuctionJob(auction);
    }
  };

// Cleanup jobs when auction is modified
export const cancelAuctionJob = (auctionId) => {
  if (activeJobs.has(auctionId)) {
    activeJobs.get(auctionId).cancel();
    activeJobs.delete(auctionId);
  }
};