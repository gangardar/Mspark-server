import mongoose from "mongoose";
import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import { NotFoundError } from "../utils/errors.js";


export const placeBid = async (req, res, next) => {
  try {
    const { bidAmount } = req.body;
    const auctionId = req.params.id;
    const userId = req.user._id;

    // Validate auction exists and is active
    const auction = await Auction.findOne({
      _id: auctionId,
      isDeleted: false,
      status: 'active'
    });
    
    if (!auction) {
      throw new NotFoundError("Auction Not Found");
    }

    // Check if auction has ended
    if (new Date() > new Date(auction.endTime)) {
      auction.status = 'completed';
      await auction.save();
      return res.status(400).json({ error: 'Auction has ended' });
    }

    // Check if user is the merchant (can't bid on own auction)
    if (auction.merchantId.equals(userId)) {
      return res.status(403).json({ error: 'Cannot bid on your own auction' });
    }

    // Create new bid
    const bid = new Bid({
      user: userId,
      bidAmount,
      auctionId
    });

    await bid.save();

    // The pre-save hook already updated the auction
    // But we can populate and return the updated auction
    const updatedAuction = await Auction.findById(auctionId)
    .populate("gemId")
    .populate("merchantId", "username")
    .populate("highestBidderId", "username")
    .populate({
      path: 'bids',
      match: { isDeleted: false }, // Only include non-deleted bids
      populate: {
        path: 'user',
        select: 'username' // Select specific user fields
      },
      options: {
        sort: { bidAmount: -1 } // Sort bids by highest amount first
      }
    });

    res.status(201).json({
      success: true,
      message: 'Bid placed successfully',
      bid,
      data: updatedAuction
    });

  } catch (error) {
    next(error);
  }
};

export const getBidHistory = async (req, res, next) => {
  try {
      const userId = req.user._id;
      // Changed from params to query for better RESTful practices
      const { status, page = 1, limit = 10 } = req.query; 

      // Convert to numbers and validate
      const pageNumber = Math.max(1, parseInt(page));
      const limitNumber = Math.min(100, Math.max(1, parseInt(limit))); // Limit max to 100 per page

      const filter = {
          user: userId,  // Changed from userId to user to match your schema
          isDeleted: false,
      };

      // Optional status filter
      if (status && ['active', 'completed', 'cancelled'].includes(status)) {
          filter['auctionId.status'] = status;
      }

      // Get total count of matching documents
      const totalBids = await Bid.countDocuments(filter);

      // Calculate skip value
      const skip = (pageNumber - 1) * limitNumber;

      const bids = await Bid.find(filter)
          .sort({ createdAt: -1 }) // Newest bids first
          .skip(skip)
          .limit(limitNumber)
          .populate({
              path: 'auctionId',
              select: 'title currentPrice endTime status gemId merchantId priceStart startTime',
              populate: [{
                  path: 'gemId',
                  select: 'name images'
              }, {
                  path: 'merchantId',
                  select: 'username'
              }]
          })
          .populate('user', 'username avatar'); // Include avatar for consistency

      if (!bids || bids.length === 0) {
          return res.status(200).json({
              success: true,
              message: "No bids found for this user",
              count: 0,
              data: [],
              pagination: {
                  total: 0,
                  totalPages: 0,
                  currentPage: pageNumber,
                  limit: limitNumber
              }
          });
      }

      res.json({
          success: true,
          message: "Bids retrieved successfully",
          count: bids.length,
          data: bids,
          pagination: {
              total: totalBids,
              totalPages: Math.ceil(totalBids / limitNumber),
              currentPage: pageNumber,
              limit: limitNumber
          }
      });

  } catch (err) {
      next(err);
  }
};

export const getBids = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build base query
        const query = {
            isDeleted: false 
        };

        // Optional status filter
        if (req.query.status) {
            query.status = req.query.status;
        }

        // Get bids with population
        const bidsQuery = Bid.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'auctionId',
                select: 'title currentPrice endTime status gemId',
                populate: {
                    path: 'gemId',
                    select: 'name images'
                }
            })
            .populate('user', 'username avatar');

        // Execute both queries in parallel
        const [bids, totalBids] = await Promise.all([
            bidsQuery.exec(),
            Bid.countDocuments(query)
        ]);

        if (!bids || bids.length === 0) {
            throw new NotFoundError("No bids found for this user");
        }

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalBids / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.json({
            success: true,
            message: "Bid history retrieved successfully",
            data: bids, // Raw Mongoose documents (they'll be converted to JSON automatically)
            meta: {
                total: totalBids,
                count: bids.length,
                currentPage: page,
                totalPages,
                hasNextPage,
                hasPrevPage,
                limit
            }
        });

    } catch (err) {
        next(err);
    }
};

export async function getAuctionsByBidder(req, res) {
  try {
    const { bidderId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Validate bidderId
    if (!mongoose.Types.ObjectId.isValid(bidderId)) {
      return res.status(400).json({ message: 'Invalid bidder ID' });
    }

    // 1. Find all bids by this user
    const userBids = await Bid.find({ 
      user: bidderId,
      isDeleted: false 
    }).select('auctionId');

    if (!userBids.length) {
      return res.json({
        success: true,
        message: "No Auction Found for user.",
        data: [],
        pagination: {
          total: 0,
          totalPages: 0,
          currentPage: parseInt(page),
          limit: parseInt(limit)
        }
      });
    }

    // 2. Get unique auction IDs
    const auctionIds = [...new Set(userBids.map(bid => bid.auctionId))];

    // 3. Build the base query
    const query = {
      _id: { $in: auctionIds },
      isDeleted: false
    };

    // Add status filter if provided
    if (status && ['active', 'completed', 'cancelled'].includes(status)) {
      query.status = status;
    }

    // Get total count for pagination
    const total = await Auction.countDocuments(query);

    // 4. Find paginated auctions where this user has bid
    const auctions = await Auction.find(query)
      .populate('gemId', 'name images')
      .populate("merchantId", "username")
      .populate('highestBidderId', 'username')
      .sort({ endTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: auctions,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching auctions by bidder:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch auctions',
      error: error.message 
    });
  }
}

