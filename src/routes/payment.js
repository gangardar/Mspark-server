import express from "express";
import orderCallBack, {
  createSend,
  getAllPayments,
  getPaymentByMerchant,
  getPaymentsByBidder,
  getYetToSend,
  reCreateOrder,
} from "../controller/PaymentController.js";
import authMiddleware from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorize.js";

const paymentRouter = express.Router();

paymentRouter.get("/", getAllPayments);

paymentRouter.get("/toBeSend", getYetToSend);

paymentRouter.get(
  "/bidder/:bidderId",
  authMiddleware,
  authorizeRoles("admin", "bidder"),
  getPaymentsByBidder
);

paymentRouter.get(
  "/merchant/:merchantId",
  authMiddleware,
  authorizeRoles("admin", "merchant"),
  getPaymentByMerchant
);

paymentRouter.post("/callback", orderCallBack);


paymentRouter.post("/handleExpiredPayment", reCreateOrder);

paymentRouter.post("/sendPayment", createSend);

export default paymentRouter;
