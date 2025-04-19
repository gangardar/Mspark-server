import mongoose from "mongoose";
import Auction from "../models/Auction.js";
import Payment from "../models/Payment.js";
import { createOrder } from "../services/CoinGateService.js";
import {
  informWinnerOnPaymentStatus,
  sendPaymentLinkToWinner,
} from "../services/MailServices.js";
import Gem from "../models/Gem.js";

/**
 * @desc Get all payments with pagination
 * @route GET /api/payments
 * @access Private/Admin
 */
export const getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, bidder, auction } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) {
      if (status === "failed") {
        filter.paymentStatus = { $in: ["invalid", "expired", "canceled"] };
      } else {
        filter.paymentStatus = status; // Apply direct status for non-"failed" cases
      }
    }
    if (type) filter.paymentType = type;
    if (bidder) filter.bidder = bidder;
    if (auction) filter.auction = auction;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .populate("bidder", "username email")
        .populate({
          path: "auction",
          select: "gemId currentPrice",
          populate: {
            path: "gemId",
            select: "name images",
          },
        })
        .sort({ createdAt: -1 }),
      Payment.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: "Payments retrieved successfully",
      data: payments,
      meta: {
        pagination: {
          total,
          totalPages,
          currentPage: parseInt(page),
          limit: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all payments error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * @desc Get all payments with pagination
 * @route GET /api/payments
 * @access Private/Admin
 */
export const getYetToSend = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  try {
    const deliveredGems = await Gem.find({
      status: "sold",
      where: {        
        deliveries: {
          $elemMatch: {
            status: "delivered",
            $position: -1 // last element in array
          }
        }
      }
    });

    console.log("Delivered Gems:", deliveredGems);

    const auctionIds = deliveredGems.map(async gem => {
      return await Auction.findOne({ 
        status: "completed",
        where: { gemId: gem._id } 
      })._id;
    });

    // console.log(JSON.stringify(auctionIds))

    const pendingPayments = await Payment.find({
      where: {
        auctionId: { $in: auctionIds },
        $and: [
          { type: { $ne: "sold" } },
          { status: { $nin: ["paid", "refunded"] } }
        ]
      },
      order: [['createdAt', 'DESC']], // get most recent first
      limit: 1 // only consider the most recent payment per auction
    });

    res.json({
      data : pendingPayments || []
    })

  } catch (err) {
    res.status(400).json({
      error: err.message
    })
  }
};

/**
 * @desc Get a single payment by ID
 * @route GET /api/payments/:id
 * @access Private
 */
export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("bidder", "username email")
      .populate({
        path: "auction",
        select: "gemId currentPrice",
        populate: {
          path: "gemId",
          select: "name images",
        },
      });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment retrieved successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Get payment by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * @desc Get payments by bidder ID with grouped status filtering
 * @route GET /api/payments/bidder/:bidderId
 * @access Bidder/Admin
 */
export const getPaymentsByBidder = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    console.log(req.params);

    const filter = { bidder: req.params.bidderId };

    // Handle grouped status filters
    if (status) {
      switch (status.toLowerCase()) {
        case "pending":
          filter.paymentStatus = { $in: ["new", "pending"] };
          break;
        case "processing":
          filter.paymentStatus = { $in: ["confirming"] };
          break;
        case "completed":
          filter.paymentStatus = { $in: ["paid"] };
          break;
        case "failed":
          filter.paymentStatus = { $in: ["invalid", "expired", "canceled"] };
          break;
        case "refunded":
          filter.paymentStatus = { $in: ["refunded", "partially_refunded"] };
          break;
        default:
          // Exact match for specific status
          filter.paymentStatus = status;
      }
    }

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .populate({
          path: "auction",
          select: "gemId currentPrice status",
          populate: {
            path: "gemId",
            select: "name images type",
          },
        })
        .sort({ createdAt: -1 }),
      Payment.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: "Bidder payments retrieved successfully",
      data: payments,
      meta: {
        pagination: {
          total,
          totalPages,
          currentPage: parseInt(page),
          limit: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters: {
          status: status || "all",
        },
      },
    });
  } catch (error) {
    console.error("Get payments by bidder error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * @desc Get payments by Merchant ID with grouped status filtering
 * @route GET /api/payments/bidder/:merchantId
 * @access Bidder/Admin
 */
export const getPaymentByMerchant = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const filter = { merchant: req.params.merchantId };

    // Handle grouped status filters
    if (status) {
      switch (status.toLowerCase()) {
        case "pending":
          filter.paymentStatus = { $in: ["new", "pending"] };
          break;
        case "processing":
          filter.paymentStatus = { $in: ["confirming"] };
          break;
        case "completed":
          filter.paymentStatus = { $in: ["paid"] };
          break;
        case "failed":
          filter.paymentStatus = { $in: ["invalid", "expired", "canceled"] };
          break;
        case "refunded":
          filter.paymentStatus = { $in: ["refunded", "partially_refunded"] };
          break;
        default:
          // Exact match for specific status
          filter.paymentStatus = status;
      }
    }

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .populate({
          path: "auction",
          select: "gemId currentPrice status",
          populate: {
            path: "gemId",
            select: "name images type",
          },
        })
        .sort({ createdAt: -1 }),
      Payment.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: "Merchant payments retrieved successfully",
      data: payments,
      meta: {
        pagination: {
          total,
          totalPages,
          currentPage: parseInt(page),
          limit: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters: {
          status: status || "all",
        },
      },
    });
  } catch (error) {
    console.error("Get payments by merchant error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * @desc Get payments by auction ID
 * @route GET /api/payments/auction/:auctionId
 * @access Private
 */
export const getPaymentsByAuction = async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    const skip = (page - 1) * limit;

    const filter = { auction: req.params.auctionId };
    if (type) filter.paymentType = type;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .populate("bidder", "username email")
        .sort({ createdAt: -1 }),
      Payment.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: "Auction payments retrieved successfully",
      data: payments,
      meta: {
        pagination: {
          total,
          totalPages,
          currentPage: parseInt(page),
          limit: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get payments by auction error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * @desc Get payments by status
 * @route GET /api/payments/status/:status
 * @access Private/Admin
 */
export const getPaymentsByStatus = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find({ paymentStatus: req.params.status })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("bidder", "username email")
        .populate({
          path: "auction",
          select: "gemId currentPrice",
          populate: {
            path: "gemId",
            select: "name images",
          },
        })
        .sort({ createdAt: -1 }),
      Payment.countDocuments({ paymentStatus: req.params.status }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: `${req.params.status} payments retrieved successfully`,
      data: payments,
      meta: {
        pagination: {
          total,
          totalPages,
          currentPage: parseInt(page),
          limit: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get payments by status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * @desc Get payments by date range
 * @route GET /api/payments/date-range
 * @access Private/Admin
 */
export const getPaymentsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Both startDate and endDate are required",
      });
    }

    const skip = (page - 1) * limit;
    const filter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .populate("bidder", "username email")
        .populate({
          path: "auction",
          select: "gemId currentPrice",
          populate: {
            path: "gemId",
            select: "name images",
          },
        })
        .sort({ createdAt: -1 }),
      Payment.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: "Payments within date range retrieved successfully",
      data: payments,
      meta: {
        pagination: {
          total,
          totalPages,
          currentPage: parseInt(page),
          limit: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get payments by date range error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const orderCallBack = async (req, res) => {
  try {
    const callbackData = req.body;

    // Validate required fields
    if (!callbackData.id || !callbackData.status || !callbackData.token) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required callback fields" });
    }

    // Find the payment record by coinGateId
    const payment = await Payment.findOne({ coinGateId: callbackData.id });

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment record not found" });
    }

    // Verify the token matches our stored token
    if (payment.metadata?.coinGateToken !== callbackData.token) {
      return res.status(403).json({ success: false, error: "Invalid token" });
    }

    // Prepare update data
    const updateData = {
      paymentStatus: callbackData.status,
      updatedAt: new Date(),
      metadata: {
        ...payment.metadata,
        originalResponse: callbackData, // Update with latest response
        isRefundable: callbackData.is_refundable,
        fees: callbackData.fees || [],
      },
    };

    // Add additional fields if status is paid/refunded
    if (
      ["paid", "refunded", "partially_refunded"].includes(callbackData.status)
    ) {
      updateData.metadata.paid_at = callbackData.paid_at;
      updateData.metadata.pay_amount = callbackData.pay_amount;
      updateData.metadata.pay_currency = callbackData.pay_currency;
      updateData.metadata.receive_amount = callbackData.receive_amount;
    }

    // Update the payment record
    const updatedPayment = await Payment.findByIdAndUpdate(
      payment._id,
      updateData,
      { new: true }
    )
      .populate({
        path: "bidder",
        select: "email fullName",
      })
      .populate({
        path: "auction",
        select: "currentPrice gemId",
        populate: {
          path: "gemId",
          select: "name type images",
        },
      });

    //Notifiy user about the payment update.
    if (callbackData.status === "paid") {
      //Handle Payment Success
      await informWinnerOnPaymentStatus(updatedPayment);
    } else if (
      ["expired", "canceled", "invalid"].includes(callbackData.status)
    ) {
      // Handle failed payment
      await informWinnerOnPaymentStatus(updatedPayment);
    }

    return res.status(200).json({ success: true, payment: updatedPayment });
  } catch (error) {
    console.error("Payment callback error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const reCreateOrder = async (req, res) => {
  const { auctionId } = req.body;

  try {
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the auction with all necessary populated data
      const auction = await Auction.findOne({
        _id: auctionId,
        isDeleted: false,
      })
        .populate("gemId", "name images price type")
        .populate("merchantId", "username email")
        .populate("highestBidderId", "username email")
        .session(session);

      if (!auction) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ success: false, message: "Auction not found" });
      }

      if (auction.status !== "completed") {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `${auction._id} yet to be complete.`,
        });
      }

      // Find the existing payment record
      const existingPayment = await Payment.findOne({
        auction: auctionId,
        paymentType: "order",
      }).session(session);

      if (!existingPayment) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: "Payment record not found",
        });
      }

      // Check if payment is actually expired
      if (
        !["expired", "canceled", "invalid"].includes(
          existingPayment.paymentStatus
        )
      ) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Payment is not expired, cannot recreate",
        });
      }

      // Create new order on CoinGate
      const response = await (await createOrder(auction)).data;

      // Update the existing payment record with new details
      const updatedPayment = await Payment.findByIdAndUpdate(
        existingPayment._id,
        {
          amount: auction.currentPrice.toString(),
          price_currency: response?.price_currency || "USD",
          receive_currency: response?.receive_currency || "BTC",
          paymentStatus: response?.status || "pending",
          coinGateId: response.id,
          coinGatePaymentLink: response?.payment_url,
          metadata: {
            coinGateToken: response?.token,
            originalOrderId: response?.order_id,
            isRefundable: response?.is_refundable,
            originalResponse: response,
            previousAttempts: [
              ...(existingPayment.metadata?.previousAttempts || []),
              {
                attemptDate: new Date(),
                status: existingPayment.paymentStatus,
                coinGateId: existingPayment.coinGateId,
              },
            ],
          },
          updatedAt: new Date(),
        },
        { new: true, session }
      )
        .populate({
          path: "bidder",
          select: "email fullName",
        })
        .populate({
          path: "auction",
          select: "currentPrice gemId",
          populate: {
            path: "gemId",
            select: "name type images",
          },
        });

      await sendPaymentLinkToWinner(auction, updatedPayment);

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      // Return the updated payment with new payment link
      return res.status(200).json({
        success: true,
        message: "Payment Order Recreated!",
        data: updatedPayment,
        paymentLink: response.payment_url,
      });
    } catch (error) {
      // If any error occurs, abort the transaction
      await session.abortTransaction();
      session.endSession();
      console.error("Error in transaction:", error);
      throw error;
    }
  } catch (error) {
    console.error("Payment recreation error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
};

export default orderCallBack;
