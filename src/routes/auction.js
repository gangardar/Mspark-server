import express from "express";
import authMiddleware from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorize.js";
import {
  activeAuction,
  cancelAuction,
  completeAuction,
  createAuction,
  extendAuciton,
  getActiveAuctions,
  getAuctionByFilters,
  getAuctionDetails,
  getMerchantAuctions,
} from "../controller/AuctionController.js";
import { getAuctionsByBidder, placeBid } from "../controller/BidController.js";
const auctionRoute = express.Router();

// Public routes
auctionRoute.get("/", getAuctionByFilters);
auctionRoute.get("/:id", getAuctionDetails);
auctionRoute.get(
  "/bidder/:bidderId",
  authMiddleware,
  authorizeRoles("bidder", "admin"),
  getAuctionsByBidder
);

// Protected routes
auctionRoute.use(authMiddleware);

// Bidder routes
auctionRoute.post("/:id/bid", authorizeRoles("bidder"), placeBid);

// Merchant routes
auctionRoute.post("/", authorizeRoles("merchant"), createAuction);
auctionRoute.get(
  "/merchant/:merchantId",
  authorizeRoles("merchant", "admin"),
  getMerchantAuctions
);
auctionRoute.put(
  "/:id/cancel",
  authorizeRoles("merchant", "admin"),
  cancelAuction
);

auctionRoute.put(
  "/:id/active",
  authorizeRoles("merchant", "admin"),
  activeAuction
);

auctionRoute.put(
  "/:id/extend",
  authorizeRoles("merchant", "admin"),
  extendAuciton
);

// Admin routes
auctionRoute.put("/:id/complete", authorizeRoles("admin"), completeAuction);

export default auctionRoute;
