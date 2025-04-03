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
        
        const bids = await Bid.find({ 
            user: userId,
            isDeleted: false 
        })
        .sort({ createdAt: -1 }) // Newest bids first
        .populate({
            path: 'auctionId',
            select: 'title currentPrice endTime status gemId',
            populate: {
                path: 'gemId',
                select: 'name images'
            }
        })
        .populate('user', 'username'); // User details (redundant but ensures consistency)

        if (!bids || bids.length === 0) {
            throw new NotFoundError("No bids found for this user");
        }

        res.json({
            success: true,
            message: "Bids retived successfully",
            count: bids.length,
            data : bids
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

