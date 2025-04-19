import express from "express";
import {
  addMsparkAddress,
  getMsparkPrimary,
  putValidAccountWallet,
  syncCoinGateLedgerAndAccount,
  updateMsparkAddress,
} from "../controller/MsparkController.js";

const msparkRoute = express.Router();

msparkRoute.post("/address", addMsparkAddress);
msparkRoute.put("/address/:id", updateMsparkAddress);
msparkRoute.post("/sync-ledger", syncCoinGateLedgerAndAccount);
msparkRoute.get("/", getMsparkPrimary);
msparkRoute.put("/account/:id", putValidAccountWallet);

export default msparkRoute;
