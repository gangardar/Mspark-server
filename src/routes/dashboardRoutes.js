import express from "express";
import {
  getPlatformSummary,
  getAuctionAnalytics,
  getUserAnalytics
} from "../controller/DashboardController.js";

const dashboardRoutes = express.Router();

// 1. Platform Overview
dashboardRoutes.get("/summary", getPlatformSummary);

// 2. Auction Analytics
dashboardRoutes.get("/auctions", getAuctionAnalytics);

// 3. User Analytics
dashboardRoutes.get("/users", getUserAnalytics);

export default dashboardRoutes;