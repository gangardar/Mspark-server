import express from "express";
import { addMsparkAddress } from "../controller/MsparkController";
import { syncCoinGateLedgerAndAccount } from "../controller/MsparkController";
import { getMsparkPrimary } from "../controller/MsparkController";
import { putValidAccountWallet } from "../controller/MsparkController";
import { updateMsparkAddress } from "../controller/MsparkController";

const msparkRoute = express.Router();

msparkRoute.post("/address", addMsparkAddress);
msparkRoute.put("/address/:id", updateMsparkAddress);
msparkRoute.post("/sync-ledger", syncCoinGateLedgerAndAccount);
msparkRoute.get("/", getMsparkPrimary);
msparkRoute.put("/account/:id", putValidAccountWallet);

export default msparkRoute;
