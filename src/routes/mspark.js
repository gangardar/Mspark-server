import express from "express";
import {
  addMsparkAddress,
  getMsparkPrimary,
  putValidAccountWallet,
  syncCoinGateLedgerAndAccount,
  updateMsparkAddress,
  updateMsparkFees,
} from "../controller/MsparkController.js";

const msparkRoute = express.Router();

msparkRoute.post("/address", addMsparkAddress);
msparkRoute.put("/address/:id", updateMsparkAddress);
msparkRoute.post("/sync-ledger", syncCoinGateLedgerAndAccount);
msparkRoute.get("/", getMsparkPrimary);
msparkRoute.put("/account/:id", putValidAccountWallet);
msparkRoute.put("/:id/fees", updateMsparkFees);

export default msparkRoute;
