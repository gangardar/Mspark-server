import express, { response } from "express";
import { getCoinGateCurrencies } from "../services/CoinGateService.js";
import { verifyAddress } from "../services/MempoolService.js";

const memepoolRouter = express.Router();

memepoolRouter.post("/verify-address", async (req, res) => {
    try {
      const { address } = req.body;
      if (!address) {
        return res.status(400).json({
          success: false,
          message: "Address is required"
        });
      }
  
      const response = await verifyAddress(address);
      
      // Check if the address is valid from mempool.space response
      if (response.data?.isvalid) {
        return res.json({
          success: true,
          message: "Valid address",
          data: response.data
        });
      } else {
        return res.status(400).json({
          success: false,
          message: response.data?.message || "Invalid address",
          data: response.data
        });
      }
    } catch (err) {
      console.error("Address validation error:", err);
      return res.status(500).json({
        success: false,
        message: err?.message || "Failed to validate address"
      });
    }
  });

export default memepoolRouter;
