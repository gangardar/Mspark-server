import { Client } from "@coingate/coingate-sdk";
import axios from "axios";
import { coingateAxiosInstance } from "./coingateApi.js";
import PropTypes from "prop-types";
import Mspark from "../models/Mspark.js";
import logger from "../config/logger.js";
import mongoose from "mongoose";
import Account from "../models/Account.js";
import Wallet from "../models/Wallet.js";
import Payment from "../models/Payment.js";

const coingateApi = new Client(process.env.COINGATE_API_KEY, true);
coingateApi.getApiKey();

// Get currency information from CoinGate
export const getCurrencyInfoByTitle = async (title) => {
  try {
    const response = await coingateApi.public.getCurrencies();

    const filteredResponse = response.filter(
      (currency) => currency.title === title
    )[0];

    return {
      id: filteredResponse.id,
      title: filteredResponse.title,
      symbol: filteredResponse.symbol,
      platforms: filteredResponse.platforms,
    };
  } catch (error) {
    throw new Error(`Failed to get currency info: ${error.message}`);
  }
};
// export const createPayment = async (paymentData) => {
//   try {
//     const response = await apiClient.post("/orders", {
//       price_amount: paymentData.amount,
//       price_currency: "USD", // You might want to make this configurable
//       receive_currency: paymentData.currency,
//       title: "Gem Auction Payment",
//       description: paymentData.description,
//       order_id: paymentData.orderId,
//       callback_url: `${config.API_URL}/api/payments/webhook`,
//       success_url: `${config.FRONTEND_URL}/payment-success`,
//       cancel_url: `${config.FRONTEND_URL}/payment-cancel`,
//     });

//     return {
//       success: true,
//       paymentId: response.data.id,
//       paymentUrl: response.data.payment_url,
//       status: response.data.status,
//     };
//   } catch (error) {
//     return {
//       success: false,
//       message: `Failed to create payment: ${error.message}`,
//     };
//   }
// };

export const createWallet = async (beneficiary, user) => {
  const beneficiaryData = {
    beneficiary_type: beneficiary.type,
    person: {
      first_name: beneficiary.username,
      surname: beneficiary.username,
    },
    email: beneficiary.email,
    country: beneficiary.country,
    currency_id: beneficiary.currencyId,
    platform_id: beneficiary.platformId,
    crypto_address: beneficiary.cryptoAddress,
    crypto_address_metadata: "Bitcoin testnet",
    street_name: user.address.street,
    building_number: user.address.houseNo,
    town_name: user.address.city,
    post_code: user.address.postalcode,
  };
  const response = await coingateAxiosInstance.post(
    "/beneficiaries",
    beneficiaryData
  );
  return response;
};

createWallet.propTypes = {
  type: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  country: PropTypes.string.isRequired,
  platformId: PropTypes.number.isRequired,
  currencyId: PropTypes.number.isRequired,
  cryptoAddress: PropTypes.string.isRequired,
};

export const getCoinGateCurrencies = async (req, res) => {
  try {
    const response = await coingateApi.public.getCurrencies();
    res.json({
      success: true,
      message: "Coin Gate currencies retrived Successfully!",
      data: response,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOrder = async (auction) => {
  try {
    const orderData = {
      title: `Auction Payment for ${auction.gemId.name}`,
      price_amount: auction.currentPrice.toString(),
      price_currency: "USD", // Fixed as USD
      receive_currency: "BTC", // Or other stablecoin
      callback_url: `${process.env.BASE_URL}/api/payments/callback`,
      success_url: `${process.env.BASE_URL}/dashboard/payments/success`,
      cancel_url: `${process.env.BASE_URL}/dashboard/payments/cancel`,
      order_id: auction._id.toString(),
      description: `Payment for ${auction.gemId.name} (Auction ${auction._id})`,
      purchaser_email: auction.highestBidderId.email,
    };
    return await coingateAxiosInstance.post("/orders", orderData);
  } catch (error) {
    console.error("CoinGate order creation failed:", error);
    throw new Error("Payment processing failed");
  }
};

export const syncLedger = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Get primary Mspark with session
    const mspark = await Mspark.findOne({ type: "primary" }).session(session);
    if (!mspark) {
      logger.error("Mspark primary was not found");
      throw new Error("Primary Mspark not found");
    }

    // 2. Fetch accounts from CoinGate
    const response = await coingateAxiosInstance
      .get("/ledger/accounts")
      .catch((err) => {
        logger.error(
          `Error getting accounts: ${err?.message || "Unknown error"}`
        );
        throw err;
      });

    const { accounts: ledgerAccounts } = response.data;

    // 3. Process each account
    const processedAccounts = await Promise.all(
      ledgerAccounts.map(async (ledgerAccount) => {
        const { id, balance, status, currency } = ledgerAccount;

        // 4. Create or update account in MongoDB
        const accountData = {
          title: currency.title,
          symbol: currency.symbol,
          balance,
          coinGateId: id,
          walletAddress: id, // Assuming id is the wallet address
          status,
        };

        return await Account.findOneAndUpdate({ coinGateId: id }, accountData, {
          upsert: true,
          new: true,
          session,
          setDefaultsOnInsert: true,
        });
      })
    );

    // 5. Update Mspark with new accounts references
    const accountIds = processedAccounts.map((acc) => acc._id);
    await Mspark.findByIdAndUpdate(
      mspark._id,
      { $set: { accounts: accountIds } },
      { session }
    );

    await session.commitTransaction();
    logger.info("Ledger synchronized successfully");
    return {
      success: true,
      data: processedAccounts,
      count: processedAccounts.length,
    };
  } catch (error) {
    await session.abortTransaction();
    logger.error(`Ledger sync failed: ${error.message}`);
    throw error;
  } finally {
    session.endSession();
  }
};

// Create a simple in-memory cache
const rateCache = new Map();

export const getExchangeRate = async (from, to) => {
  const cacheKey = `${from}_${to}`;
  const now = Date.now();
  const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

  // Check cache first
  if (rateCache.has(cacheKey)) {
    const cached = rateCache.get(cacheKey);
    if (now - cached.timestamp < oneHour) {
      return cached.rate;
    }
    // Remove expired cache
    rateCache.delete(cacheKey);
  }

  try {
    const response = await coingateAxiosInstance.get(
      `/rates/merchant/${from}/${to}`
    );
    const rate = parseFloat(response.data);

    // Store in cache with timestamp
    rateCache.set(cacheKey, {
      rate,
      timestamp: now,
    });

    return rate;
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    throw new Error(`Failed to get exchange rate: ${error.message}`);
  }
};

export const convertCurrency = async (amount, from, to) => {
  try {
    const rate = await getExchangeRate(from, to);
    const convertedAmount = amount * rate;

    return {
      amount: convertedAmount,
      rate,
      from,
      to,
    };
  } catch (error) {
    console.error("Error converting currency:", error);
    throw new Error(`Currency conversion failed: ${error.message}`);
  }
};

export const createSendRequest = async (auction, merchant, bidderPayment) => {
  try {
    // 1. Get Mspark configuration
    const mspark = await Mspark.findOne({ type: "primary" });
    if (!mspark) {
      throw new Error("Mspark configuration not found");
    }

    // 2. Get merchant's wallet and account details
    const merchantWallet = await Wallet.findById(merchant.wallet);
    if (!merchantWallet) {
      throw new Error("Merchant wallet not found");
    }

    const ledgerAccount = await Account.findOne({
      symbol: merchantWallet.currencySymbol,
    });
    if (!ledgerAccount) {
      throw new Error("Ledger account not found");
    }

    // 3. Calculate the amount to send (considering fees)
    const platformFeeAmount = (auction.currentPrice * mspark.platformFee) / 100;
    const verificationFeeAmount =
      (auction.currentPrice * mspark.verificationFee) / 100;
    const amountToSend = (
      auction.currentPrice -
      platformFeeAmount -
      verificationFeeAmount
    ).toFixed(8);

    const {amount : amountToSendInCoin} = await convertCurrency(
      amountToSend,
      "USD",
      merchantWallet.currencySymbol
    )

    // 4. Prepare the send request payload
    const sendRequestData = {
      ledger_account_id: ledgerAccount.coinGateId,
      beneficiary_payout_setting_id: merchantWallet.coinGatePayoutId,
      amount: amountToSendInCoin,
      amount_currency_id: merchantWallet.coinGateCurrencyId,
      purpose: `Payment for auction ${auction._id} - ${
        auction.gem?.name || "Gem"
      }`,
      callback_url: `${process.env.BASE_URL}/coin-gate-send/callback`,
      external_id: `${Date.now()}_${auction._id}`,
      metadata: {
        auctionId: auction._id.toString(),
        merchantId: merchant._id.toString(),
        bidderId: auction.highestBidderId.toString(),
        originalPaymentId: bidderPayment._id.toString(),
        fees: {
          platformFee: mspark.platformFee,
          verificationFee: mspark.verificationFee,
          totalFees: (platformFeeAmount + verificationFeeAmount).toFixed(8),
        },
      },
    };

    // 5. Make the API call to CoinGate
    const response = await coingateAxiosInstance.post(
      "/send_requests",
      sendRequestData
    );

    // 6. Create a record in our Payments collection
    // Update the payment record creation part of the previous implementation
    const paymentRecord = new Payment({
      amount: amountToSend,
      price_currency: merchantWallet.currencySymbol,
      receive_currency: merchantWallet.currencySymbol,
      description: `Mspark payment for auction ${auction._id}`,
      paymentType: "send",
      paymentStatus: "draft", // Initial status from CoinGate response
      transactionDate: new Date(),
      merchant: merchant._id.toString(),
      auction: auction._id,
      coinGateId: response.data.id,
      coinGatePaymentLink: response.data.actions_required?.confirm || null,
      metadata: {
        sendRequestData,
        coinGateResponse: {
          status: response.data.status,
          purpose: response.data.purpose,
          externalId: response.data.external_id,
          ledgerAccount: {
            id: response.data.ledger_account?.id,
            balance: response.data.ledger_account?.balance,
            currency: response.data.ledger_account?.currency,
          },
          amountDetails: {
            inputAmount: response.data.input_amount,
            inputCurrency: response.data.input_currency,
            sendingAmount: response.data.sending_amount,
            sendingCurrency: response.data.sending_currency,
            balanceDebitAmount: response.data.balance_debit_amount,
            balanceDebitCurrency: response.data.balance_debit_currency,
          },
          rates: {
            inputToSending: response.data.input_to_sending_rate,
            sendingToBalance: response.data.sending_to_balance_debit_rate,
          },
          beneficiary: {
            payoutSettingId: response.data.beneficiary_payout_setting?.id,
            cryptoAddress:
              response.data.beneficiary_payout_setting?.crypto_address,
            platform: response.data.beneficiary_payout_setting?.platform,
          },
          fees: {
            serviceFee: response.data.fees?.service_fee,
            conversionFee: response.data.fees?.conversion_fee,
            totalFees: (
              parseFloat(response.data.fees?.service_fee?.amount || 0) +
              parseFloat(response.data.fees?.conversion_fee?.amount || 0)
            ).toString(),
          },
          actions: {
            confirmUrl: response.data.actions_required?.confirm,
            cancelUrl: response.data.actions_required?.cancel,
            requires2FA: response.data.requires_2fa_confirmation,
          },
          timestamps: {
            createdAt: response.data.created_at,
            updatedAt: new Date().toISOString(),
          },
        },
        // Keep the original fee calculations for reference
        internalCalculations: {
          platformFee: mspark.platformFee,
          verificationFee: mspark.verificationFee,
          calculatedAmount: amountToSend,
          originalBidderPayment: bidderPayment._id,
        },
      },
      // Additional fields for easier querying
      coinGateStatus: response.data.status,
      externalId: response.data.external_id,
      beneficiaryAddress:
        response.data.beneficiary_payout_setting?.crypto_address,
      requiresAction: response.data.actions_required?.confirm ? true : false,
    });

    await paymentRecord.save();

    return {
      success: true,
      paymentRecord,
      coinGateResponse: response.data,
    };
  } catch (error) {
    console.error("Error creating send request:", error);
    throw new Error(`Failed to create send request: ${error.message}`);
  }
};
