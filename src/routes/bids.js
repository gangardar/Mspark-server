import express from "express"
import authMiddleware from "../middleware/auth.js";
import { getBidHistory, getBids } from "../controller/BidController.js";
import authorizeRoles from "../middleware/authorize.js";

const bidRoute = express.Router();

bidRoute.use(authMiddleware);

bidRoute.get('/:id',authorizeRoles("bidder"), getBidHistory)

export default bidRoute;