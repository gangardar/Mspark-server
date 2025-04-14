import { Client } from "@coingate/coingate-sdk";
import axios from "axios";
import { coingateAxiosInstance } from "./coingateApi.js";
import PropTypes from "prop-types";

const coingateApi = new Client(process.env.COINGATE_API_KEY,true);
coingateApi.getApiKey()

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

// // Create a payment using CoinGate
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
      crypto_address_metadata : "Bitcoin testnet",
      street_name: user.address.street,
      building_number : user.address.houseNo,
      town_name : user.address.city,
      post_code : user.address.postalcode
    };
    console.log(process.env.COINGATE_API_URL)
    const response =  await coingateAxiosInstance.post("/beneficiaries", beneficiaryData);
    console.log(response)
    return response
  };

createWallet.propTypes = {
    type : PropTypes.string.isRequired,
    username : PropTypes.string.isRequired,
    email : PropTypes.string.isRequired,
    country : PropTypes.string.isRequired,
    platformId : PropTypes.number.isRequired,
    currencyId : PropTypes.number.isRequired,
    cryptoAddress : PropTypes.string.isRequired

}


export const getCoinGateCurrencies = async(req, res) => {
    try {
      const response = await coingateApi.public.getCurrencies();
      res.json({
        success : true,
        message : "Coin Gate currencies retrived Successfully!",
        data : response
      });
    } catch (error) {
      res.status(500).json({success: false, message: error.message });
    }
  }

export const createOrder = async (auction) => {
  try {
    const orderData = {
      title: `Auction Payment for ${auction.gemId.name}`,
      price_amount: auction.currentPrice.toString(),
      price_currency: 'USD', // Fixed as USD
      receive_currency: 'BTC', // Or other stablecoin
      callback_url: `${process.env.BASE_URL}/api/payments/callback`,
      success_url: `${process.env.BASE_URL}/dashboard/payments/success`,
      cancel_url: `${process.env.BASE_URL}/dashboard/payments/cancel`,
      order_id: auction._id.toString(),
      description: `Payment for ${auction.gemId.name} (Auction ${auction._id})`,
      purchaser_email: auction.highestBidderId.email
    };
    return await coingateAxiosInstance.post('/orders',orderData)
  } catch (error) {
    console.error('CoinGate order creation failed:', error);
    throw new Error('Payment processing failed');
  }
};
