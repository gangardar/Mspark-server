import Payment from "../models/Payment.js";

// Create payment transaction record
export const recordOrder = async (auction, response, session) => {
  if(!auction || !response){
    throw new Error("Auction Or Response Param not received!");
  }
  try {
    return await Payment.create([{
      amount: auction.currentPrice.toString(),
      price_currency: response?.price_currency || "USD",
      receive_currency: response?.receive_currency || "BTC",
      description: `Payment for ${auction.gemId.name} (Auction ${auction._id})`,
      paymentType: "order",
      paymentStatus: response?.status || 'pending',
      bidder: auction.highestBidderId._id,
      auction: auction._id,
      coinGateId: response.id,
      coinGatePaymentLink: response?.payment_url,
      metadata: {
        coinGateToken: response?.token,
        originalOrderId: response?.order_id,
        isRefundable: response?.is_refundable,
        originalResponse: response,
      },
    }],{session});
  } catch (error) {
    console.error("Payment record cration:", error);
    throw new Error("Payment record storing failed");
  }
};
