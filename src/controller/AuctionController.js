import Auction from "../models/Auction.js";
import Gem from "../models/Gem.js";
import User from "../models/User.js";
import {
  validateAuctionInput,
  validateBidInput,
  validateAuctionUpdate,
  validateAuctionExtend,
} from "../validator/auctionValidator.js";
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError
} from "../utils/errors.js";

// @desc    Create a new auction
// @route   POST /api/auctions
// @access  Private (Merchant)
export const createAuction = async (req, res, next) => {
  try {
    const { priceStart, endTime, gemId } = req.body;

    // Validate input using Joi
    const { valid, errors } = validateAuctionInput(priceStart, endTime, gemId);
    if (!valid) throw new BadRequestError(errors);

    // Check if gem exists and belongs to merchant
    const gem = await Gem.findById(gemId);
    if (!gem) throw new NotFoundError("Gem not found");
    if (gem.merchantId.toString() !== req.user._id)
      throw new ForbiddenError("Not authorized");

    // Check if gem is already in an active auction
    const existingAuction = await Auction.findOne({
      gemId,
      status: { $in: ['active'] },
      isDeleted: false
    });

    if (existingAuction) {
      throw new ConflictError(
        `This gem is already in an ${existingAuction.status} auction (ID: ${existingAuction._id})`
      );
    }

    // Validate end time is in the future
    const endDate = new Date(endTime);
    if (endDate <= new Date()) {
      throw new BadRequestError("End time must be in the future");
    }

    // Create auction
    const auction = new Auction({
      priceStart,
      endTime: endDate,
      gemId,
      merchantId: req.user._id,
    });

    await auction.save();

    res.status(201).json({
      success: true,
      message: "Auction created successfully",
      data: auction,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all active auctions
// @route   GET /api/auctions
// @access  Public
export const getActiveAuctions = async (req, res, next) => {
  try {
    // Parse pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count of matching auctions (for pagination meta)
    const total = await Auction.countDocuments({
      isDeleted: false,
      status: "active",
    });

    // Query with pagination
    const auctions = await Auction.find({
      isDeleted: false,
      status: "active",
    })
      .populate("gemId", "name images price type")
      .populate("merchantId", "username")
      .sort({ endTime: 1 })
      .skip(skip)
      .limit(limit);

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      message: "Auctions retrieved successfully!",
      data: auctions,
      meta: {
        pagination: {
          total,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all active auctions
// @route   GET /api/auctions
// @access  Public
export const getAuctionByFilters = async (req, res, next) => {
  try {
    // Parse pagination and filter parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filters = {
      isDeleted: false,
      ...(req.query.status && { status: req.query.status }),
      ...(req.query.gemType && { 'gemId.type': req.query.gemType }),
      ...(req.query.minPrice && { 
        currentPrice: { $gte: parseFloat(req.query.minPrice) }
      }),
      ...(req.query.maxPrice && { 
        currentPrice: { $lte: parseFloat(req.query.maxPrice) }
      }),
      ...(req.query.search && {
        $or: [
          { 'gemId.name': { $regex: req.query.search, $options: 'i' } },
          { 'merchantId.username': { $regex: req.query.search, $options: 'i' } }
        ]
      })
    };

    // Handle price range if both min and max are provided
    if (req.query.minPrice && req.query.maxPrice) {
      filters.currentPrice = {
        $gte: parseFloat(req.query.minPrice),
        $lte: parseFloat(req.query.maxPrice)
      };
    }

    // Build sort object
    let sort = { endTime: 1 }; // Default: ending soon first
    if (req.query.sortBy) {
      switch (req.query.sortBy) {
        case 'newest':
          sort = { createdAt: -1 };
          break;
        case 'highestPrice':
          sort = { currentPrice: -1 };
          break;
        case 'mostBids':
          sort = { 'bids.length': -1 };
          break;
        case 'endingSoon':
          sort = { endTime: 1 };
          break;
      }
    }

    // Get total count of matching auctions
    const total = await Auction.countDocuments(filters);

    // Query with pagination and filters
    const auctions = await Auction.find(filters)
      .populate("gemId", "name images price type")
      .populate("merchantId", "username")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      message: "Auctions retrieved successfully!",
      data: auctions,
      meta: {
        pagination: {
          total,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters: req.query, // Return applied filters for reference
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get auction details
// @route   GET /api/auctions/:id
// @access  Public
export const getAuctionDetails = async (req, res, next) => {
  try {
    const auction = await Auction.findOne({
      _id: req.params.id,
      isDeleted: false,
    })
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

    if (!auction) throw new NotFoundError("Auction not found");

    res.json({
      success: true,
      message: "Auction Retrived Successfully!",
      data: auction,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Place a bid on auction
// @route   POST /api/auctions/:id/bid
// @access  Private (Bidder)
export const placeBid = async (req, res, next) => {
  try {
    const { bidAmount } = req.body;
    const auctionId = req.params.id;
    const userId = req.user._id;

    // Validate bid amount using Joi
    const { valid, errors } = validateBidInput(bidAmount);
    if (!valid) throw new BadRequestError(errors);

    const auction = await Auction.findOne({ _id: auctionId, isDeleted: false });
    if (!auction) throw new NotFoundError("Auction not found");

    // Check auction status
    if (auction.status !== "active") {
      throw new BadRequestError("Auction is not active");
    }

    // Check if auction has ended
    if (new Date() > new Date(auction.endTime)) {
      auction.status = "completed";
      await auction.save();
      throw new BadRequestError("Auction has ended");
    }

    // Check bid amount is higher than current price
    if (bidAmount <= auction.currentPrice) {
      throw new BadRequestError(
        `Bid must be higher than current price: ${auction.currentPrice}`
      );
    }

    // Check if user is the merchant (can't bid on own auction)
    if (auction.merchantId.toString() === userId) {
      throw new ForbiddenError("Cannot bid on your own auction");
    }

    // Create new bid object
    const newBid = {
      user: userId,
      amount: bidAmount,
      timestamp: new Date(),
    };

    // Update auction
    auction.currentPrice = bidAmount;
    auction.highestBidderId = userId;
    auction.bids.push(newBid); // Add the new bid to bids array

    await auction.save();

    res.json({
      success: true,
      message: "Bid placed successfully",
      currentPrice: auction.currentPrice,
      bid: newBid, // Optionally return the bid details
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get auctions by merchant
// @route   GET /api/auctions/merchant/:merchantId
// @access  Private (Merchant or Admin)
export const getMerchantAuctions = async (req, res, next) => {
  try {
    const merchantId = req.params.merchantId;

    const auctions = await Auction.find({ isDeleted: false, merchantId })
    .populate("gemId", "name images price type")
    .populate("merchantId", "username")
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
    })
    .sort({ createdAt: -1 })

    res.json({
      success: true,
      message: `Auction By ${auctions[0]?.merchantId?.username} retrived successfully`,
      data: auctions,
    });
  } catch (err) {
    next(err);
  }
};


// @desc    Cancel an auction
// @route   PUT /api/auctions/:id/cancel
// @access  Private (Merchant or Admin)
export const cancelAuction = async (req, res, next) => {
  try {
    const auction = await Auction.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    if (!auction) throw new NotFoundError("Auction not found");

    // Check if user is the merchant or admin
    if (
      auction.merchantId.toString() !== req.user._id &&
      req.user.role !== "admin"
    ) {
      throw new ForbiddenError("Not authorized");
    }

    // Validate status change
    const { valid, error } = validateAuctionUpdate("cancelled");
    if (!valid) throw new BadRequestError(error);

    // Check auction status
    if (auction.status !== "pending" && auction.status !== "active") {
      throw new BadRequestError(
        "Only pending or active auctions can be cancelled"
      );
    }

    auction.status = "cancelled";
    await auction.save();

    res.json({
      success: true,
      message: "Auction cancaled successfully!",
      data: auction,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Start an auction
// @route   PUT /api/auctions/:id/cancel
// @access  Private (Merchant or Admin)
export const activeAuction = async (req, res, next) => {
  try {
    const auction = await Auction.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    if (!auction) throw new NotFoundError("Auction not found");

    // Check if user is the merchant or admin
    if (
      auction.merchantId.toString() !== req.user._id &&
      req.user.role !== "admin"
    ) {
      throw new ForbiddenError("Not authorized");
    }

    // Validate status change
    const { valid, error } = validateAuctionUpdate("active");
    if (!valid) throw new BadRequestError(error);

    // Check auction status
    if (auction.status !== "cancelled") {
      throw new BadRequestError(
        "Only cancelled auctions can be active"
      );
    }

    auction.status = "active";
    await auction.save();

    res.json({
      success: true,
      message: "Auction re activited successfully!",
      data: auction,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Complete an auction (admin only)
// @route   PUT /api/auctions/:id/complete
// @access  Private (Admin)
export const completeAuction = async (req, res, next) => {
  try {
    if (req.user.role !== "admin")
      throw new ForbiddenError("Admin access required");

    const auction = await Auction.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    if (!auction) throw new NotFoundError("Auction not found");

    // Validate status change
    const { valid, error } = validateAuctionUpdate("completed");
    if (!valid) throw new BadRequestError(error);

    // Check auction status
    if (auction.status !== "active") {
      throw new BadRequestError("Only active auctions can be completed");
    }

    auction.status = "completed";
    await auction.save();

    res.json({
      success: true,
      message: "Auction completed successfully",
      data: auction,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Soft delete an auction
// @route   DELETE /api/auctions/:id
// @access  Private (Merchant or Admin)
export const extendAuciton = async (req, res, next) => {
  try {
    const auction = await Auction.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    if (!auction) throw new NotFoundError("Auction not found");

    // Check if user is the merchant or admin
    if (
      auction.merchantId.toString() !== req.user._id &&
      req.user.role !== "admin"
    ) {
      throw new ForbiddenError("Not authorized");
    }

    const {endTime} = req.body

    // Validate status change
    const { valid, error } = validateAuctionExtend(endTime);
    if (!valid) throw new BadRequestError(error);

    // Check auction status
    if (auction.status !== "active") {
      throw new BadRequestError(
        "Only active auctions can be extended!"
      );
    }

    auction.endTime = new Date(endTime)
    await auction.save();

    res.json({
      success: true,
      message: "Auction extended successfully!",
      data: auction,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Soft delete an auction
// @route   DELETE /api/auctions/:id
// @access  Private (Merchant or Admin)
export const deleteAuction = async (req, res, next) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) throw new NotFoundError("Auction not found");

    // Check permissions
    if (
      auction.merchantId.toString() !== req.user._id &&
      req.user.role !== "admin"
    ) {
      throw new ForbiddenError("Not authorized");
    }

    // Soft delete
    auction.isDeleted = true;
    auction.deletedAt = new Date();
    await auction.save();

    res.json({
      success: true,
      message: "Auction deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
