import {
  auctionCompleteTemplateForBidder,
  auctionCompleteTemplateForMerchant,
  outBidMailTemplate,
  sendPaymentFailedNotificationTemplate,
  sendPaymentLinkToWinnerTemplate,
  sendPaymentPaidNotificationTemplate,
} from "./MailTemplates.js";
import { transport } from "./MailTransport.js";

export const sendAuctionCompletionEmails = async (auction) => {
  try {
    const merchantEmail = auction?.merchantId?.email;
    const merchantTemplate = auctionCompleteTemplateForMerchant(auction);

    await transport.sendMail({
      from: '"Auction System" noreply-auto@mspark.com',
      to: merchantEmail,
      ...merchantTemplate,
    });

    if (auction.highestBidderId) {
      const winnerTemplate = auctionCompleteTemplateForBidder(auction);
      await transport.sendMail({
        from: '"Auction System" noreply-auto@mspark.com',
        to: auction.highestBidderId.email,
        ...winnerTemplate,
      });
    }

    console.log("Auction completion emails sent successfully");
  } catch (error) {
    console.error("Error sending auction emails:", error);
    throw error;
  }
};

export const sendOutBidMail = async (previousBidder, auction, newBid) => {
  try {
    if (!previousBidder || !previousBidder.email) {
      throw new Error("No valid previous bidder found for outbid notification");
    }

    const outbidTemplate = outBidMailTemplate(auction, newBid);
    
    await transport.sendMail({
      from: '"Auction System" noreply-auto@mspark.com',
      to: previousBidder.email,
      ...outbidTemplate,
    });

    console.log("Outbid notification email sent successfully");
  } catch (error) {
    console.error("Error sending outbid email:", error);
    throw error;
  }
};

export const sendPaymentLinkToWinner = async (auction, payment) => {
  try {
    if (auction.highestBidderId) {
      const winnerTemplate = sendPaymentLinkToWinnerTemplate(auction, payment);
      await transport.sendMail({
        from: '"Auction System" noreply-auto@mspark.com',
        to: auction.highestBidderId.email,
        ...winnerTemplate,
      });
    }

    console.log("Auction completion emails sent successfully");
  } catch (error) {
    console.error("Error sending auction emails:", error);
    throw error;
  }
};

export const informWinnerOnPaymentStatus = async (payment) => {
  try {
    let winnerTemplate = null;
    if (payment.paymentStatus === "paid") {
      winnerTemplate = sendPaymentPaidNotificationTemplate(
        payment
      );
    }

    if(['expired', 'canceled', 'invalid'].includes(payment.paymentStatus)){
      winnerTemplate = sendPaymentFailedNotificationTemplate(payment)
    }

    if(winnerTemplate){
      await transport.sendMail({
        from: '"Payment System" noreply-auto@mspark.com',
        to: payment.bidder.email,
        ...winnerTemplate,
      });
    }

    console.log("Payment Failed emails sent successfully");
  } catch (error) {
    console.error("Error sending Payment paid emails:", error);
    throw error;
  }
};
