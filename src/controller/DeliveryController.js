import mongoose from "mongoose";
import Delivery from "../models/Delivery.js";
import Gem from "../models/Gem.js";
import Mspark from "../models/Mspark.js";

// GET /deliveries (Role-based with filters)
export const getDeliveries = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;

    // Role-based query conditions
    let query = {};
    if (req.user.role === "merchant") {
      query = {
        $or: [
          { fromType: "Users", from: req.user._id }, // Merchant's outgoing
          { toType: "Users", to: req.user._id }, // Merchant's incoming (returns)
        ],
      };
    } else if (req.user.role === "bidder") {
      query = {
        $or: [
          { fromType: "Users", from: req.user._id }, // Bidder's outgoing
          { toType: "Users", to: req.user._id }, // Bidder's incoming (returns)
        ],
      };
    }

    // Add filters
    if (status) query.status = status;
    if (type) query.type = type;
    // Fetch deliveries with pagination
    const deliveries = await Delivery.find(query)
      .populate({
        path: "gems",
        select: "name status price", // Only essential gem fields
      })
      .populate({
        path: "from",
        select: "fullName username", // For Users
      })
      .populate({
        path: "to",
        select: "name", // For Mspark
      })
      .limit(limit)
      .skip(limit * (page - 1))
      .sort({ createdAt: -1 });

    const total = await Delivery.countDocuments(query);

    res.status(200).json({
      success: true,
      message: total ? "Delivery fetched successfully!" : "No Delivery Found!",
      data: deliveries,
      pagination: {
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        limit: limit,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// GET /deliveries/:id (Single delivery)
export const getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate("gems")
      .populate({
        path: "from",
        select: "fullName email", // Customize fields as needed
      })
      .populate({
        path: "to",
        select: "name address", // For Mspark
      });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found",
      });
    }

    // Authorization check
    if (
      (req.user.role === "merchant" &&
        !(
          delivery.from.equals(req.user._id) || delivery.to.equals(req.user._id)
        )) ||
      (req.user.role === "bidder" && !delivery.to.equals(req.user._id))
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    res.status(200).json({
      success: true,
      message: "Retrived gem with ${req.params.id} retrived.",
      data: delivery,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const createDelivery = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const userRole = req.user.role;
    const {
      gems,
      type,
      to,
      trackingNumber,
      deliveryService,
      trackingUrl,
      status,
    } = req.body;

    // Basic validation
    if (!gems || !Array.isArray(gems) || gems.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Gems array is required and must not be empty",
      });
    }

    if(!trackingNumber || !trackingUrl){
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success : false,
        message: "Tracking number and tracking url is required!"
      })
    }

    if (userRole === "admin" && (!type || !to)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Admin requires type and to values",
      });
    }

    // Get mspark
    const mspark = await Mspark.findOne({ type: "primary" }).session(session);
    if (!mspark) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Mspark not found!",
      });
    }

    // Role-based setup
    let deliveryType, toType, deliverTo, fromType, from, gemQuery;

    switch (userRole) {
      case "merchant":
        deliveryType = "verification";
        toType = "Mspark";
        deliverTo = mspark._id;
        fromType = "Users";
        from = req.user._id;
        gemQuery = {
          _id: { $in: gems },
          isDeleted: false,
          status: "pending",
          merchantId: req.user._id, // Ensure merchant owns the gems
        };
        break;

      case "bidder":
        deliveryType = "return";
        toType = "Mspark";
        deliverTo = mspark._id;
        fromType = "Users";
        from = req.user._id;
        gemQuery = {
          _id: { $in: gems },
          isDeleted: false,
          status: { $in: ["sold", "rejected"] },
        };
        break;

      case "admin":
        if (!["return", "sale"].includes(type)) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: "Admin can only create delivery for return and sale",
          });
        }
        deliveryType = type;
        toType = "Users";
        deliverTo = to;
        fromType = "Mspark";
        from = mspark._id;
        gemQuery = { _id: { $in: gems }, isDeleted: false };
        break;

      default:
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({
          success: false,
          message: "Unauthorized role",
        });
    }

    // Check gems
    const gemsData = await Gem.find(gemQuery).session(session);
    if (gemsData.length !== gems.length) {
      const missingGems = gems.filter(
        (g) => !gemsData.some((gd) => gd._id.equals(g))
      );
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Some gems not found or don't meet requirements",
        missingGems,
      });
    }

    // Previous delivery check
    if (userRole === "bidder" || userRole === "merchant") {
      const previousDelivery = await Delivery.findOne({
        gems: { $in: gems },
        toType: "Users",
        deliverTo: req.user._id,
      })
        .sort({ createdAt: -1 })
        .session(session);

      if (userRole === "bidder") {
        if (
          !previousDelivery ||
          previousDelivery.type !== "sale" ||
          previousDelivery.status !== "delivered"
        ) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: "These gems were never properly shipped to you",
          });
        }
      } else if (userRole === "merchant" && previousDelivery) {
        if (
          previousDelivery.type !== "return" ||
          previousDelivery.status !== "delivered"
        ) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            message: "These gems are not with you",
          });
        }
      }
    }

    // Create delivery
    const [deliveryDoc] = await Delivery.create(
      [
        {
          gems,
          type: deliveryType,
          fromType,
          from,
          toType,
          to: deliverTo,
          trackingNumber,
          trackingUrl,
          deliveryService,
          status: status || "pending",
        },
      ],
      { session }
    );

    // Update gems
    await Gem.updateMany(
      { _id: { $in: gems } },
      { $push: { deliveries: deliveryDoc._id } },
      { session } // Consider updating status
    );

    res.status(201).json({
      success: true,
      message: "Delivery created successfully",
      data: deliveryDoc,
    });
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    console.error("Delivery creation error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  } finally {
    session.endSession();
  }
};

export const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const user = req.user;

  try {
    // Validate status input
    if (!['pending', 'in_transit', 'delivered'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const delivery = await Delivery.findById(id)
      .populate('from', 'role _id')
      .populate('to', 'role _id');

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // Check if status transition is valid
    const validTransitions = {
      pending: ['in_transit'],
      in_transit: ['delivered'],
      delivered: [] // No transitions allowed from delivered
    };

    if (!validTransitions[delivery.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${delivery.status} to ${status}`
      });
    }

    // Authorization checks
    const isAdmin = user.role === 'admin';
    const isFromUser = delivery.from._id.equals(user._id);
    const isToUser = delivery.to._id.equals(user._id);

    // Admin can update any status following the progression
    if (isAdmin) {
      delivery.status = status;
      await delivery.save();
      return res.json({
        success: true,
        message: 'Delivery status updated successfully',
        data: delivery
      });
    }

    // From user can only move from pending to in_transit
    if (isFromUser && delivery.status === 'pending' && status === 'in_transit') {
      delivery.status = status;
      await delivery.save();
      return res.json({
        success: true,
        message: 'Delivery status updated successfully',
        data: delivery
      });
    }

    // To user can only move from in_transit to delivered
    if (isToUser && delivery.status === 'in_transit' && status === 'delivered') {
      delivery.status = status;
      await delivery.save();
      return res.json({
        success: true,
        message: 'Delivery status updated successfully',
        data: delivery
      });
    }

    // If none of the above conditions are met, user is not authorized
    return res.status(403).json({
      success: false,
      message: 'You are not authorized to perform this action'
    });

  } catch (err) {
    console.error('Error updating delivery status:', err);
    res.status(500).json({
      success: false,
      message: err?.message || 'Error updating delivery status'
    });
  }
}; 

export const deleteDelivery = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the delivery first to check permissions
    const delivery = await Delivery.findById(id)
      .populate("gems")
      .populate("from", "role _id");

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found",
      });
    }

    // Authorization check
    const isAdmin = req.user.role === "admin";
    const isOwner = delivery.from._id.equals(req.user._id);
    const isPending = delivery.status === "pending";

    // Only allow deletion if:
    // 1. User is admin, OR
    // 2. User is the creator AND delivery is pending
    if (!(isAdmin || (isOwner && isPending))) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this delivery",
      });
    }

    // Additional check: Can't delete if gems are already verified/processed
    const hasProcessedGems = delivery.gems.some(
      (gem) => gem.status !== "available" && gem.status !== "in_delivery"
    );

    if (hasProcessedGems && !isAdmin) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete - some gems have already been processed",
      });
    }

    // Perform deletion
    await Delivery.findByIdAndDelete(id);

    // Update gems' delivery references
    await Gem.updateMany(
      { _id: { $in: delivery.gems } },
      { $pull: { deliveries: delivery._id } }
    );

    res.status(200).json({
      success: true,
      message: "Delivery deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};
