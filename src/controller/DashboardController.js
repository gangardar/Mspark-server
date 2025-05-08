import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import User from "../models/User.js";
import Gem from "../models/Gem.js";
import Payment from "../models/Payment.js";

// 1. Platform Overview
export const getPlatformSummary = async (req, res, next) => {
  try {
    const [auctions, users, revenue] = await Promise.all([
      // Auction counts
      Auction.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
          },
        },
      ]),

      // User counts
      User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            merchants: {
              $sum: { $cond: [{ $eq: ["$role", "merchant"] }, 1, 0] },
            },
            bidders: { $sum: { $cond: [{ $eq: ["$role", "bidder"] }, 1, 0] } },
          },
        },
      ]),

      // Revenue data
      Payment.aggregate([
        { $match: { paymentStatus: "paid" } },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: {
                $multiply: [
                  { $toDouble: "$amount" },
                  0.05, // 5% platform fee
                ],
              },
            },
            totalGMV: { $sum: { $toDouble: "$amount" } },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      message: "Platform Summary Retrived",
      data: {
        auctions: auctions[0] || { total: 0, active: 0, completed: 0 },
        users: users[0] || { total: 0, merchants: 0, bidders: 0 },
        revenue: revenue[0] || { totalRevenue: 0, totalGMV: 0 },
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. Auction Analytics
export const getAuctionAnalytics = async (req, res, next) => {
  try {
    const { timeframe = "30d" } = req.query;

    const dateFilter = getDateFilter(timeframe);

    const [timeline, topAuctions] = await Promise.all([
      // Timeline data
      Auction.aggregate([
        { $match: { createdAt: dateFilter } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Top performing auctions
      Auction.aggregate([
        { $match: { status: "completed" } },
        { $sort: { currentPrice: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "gems",
            localField: "gemId",
            foreignField: "_id",
            as: "gem",
          },
        },
        { $unwind: "$gem" },
        {
          $project: {
            "gem.name": 1,
            "gem.images": 1,
            finalPrice: "$currentPrice",
            bidCount: { $size: "$bids" },
            duration: {
              $divide: [
                { $subtract: ["$endTime", "$startTime"] },
                3600000, // Convert to hours
              ],
            },
          },
        },
      ]),
    ]);

    res.json({
      success: false,
      message: "Auction Analysis",
      data: {
        timeline,
        topAuctions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 3. User Analytics
export const getUserAnalytics = async (req, res, next) => {
  try {
    const [topBidders, topMerchants] = await Promise.all([
      // Top bidders
      Bid.aggregate([
        {
          $group: {
            _id: "$user",
            totalBids: { $sum: 1 },
            totalAmount: { $sum: "$bidAmount" },
          },
        },
        { $sort: { totalAmount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            username: "$user.username",
            totalBids: 1,
            totalAmount: 1,
          },
        },
      ]),

      // Top merchants
      Auction.aggregate([
        { $match: { status: "completed" } },
        {
          $group: {
            _id: "$merchantId",
            totalSales: { $sum: 1 },
            totalRevenue: { $sum: "$currentPrice" },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            username: "$user.username",
            totalSales: 1,
            totalRevenue: 1,
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      message: "User Analytics Retrived!",
      data: {
        topBidders,
        topMerchants,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Helper function for date filtering
function getDateFilter(timeframe) {
  const now = new Date();
  const filter = {};

  switch (timeframe) {
    case "7d":
      filter.$gte = new Date(now.setDate(now.getDate() - 7));
      break;
    case "30d":
      filter.$gte = new Date(now.setDate(now.getDate() - 30));
      break;
    case "90d":
      filter.$gte = new Date(now.setDate(now.getDate() - 90));
      break;
    default:
      // Custom date range
      if (req.query.startDate && req.query.endDate) {
        filter.$gte = new Date(req.query.startDate);
        filter.$lte = new Date(req.query.endDate);
      }
  }

  return filter;
}
