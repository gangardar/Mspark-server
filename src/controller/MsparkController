import logger from "../config/logger.js";
import Account from "../models/Account.js";
import Address from "../models/Address.js";
import Mspark from "../models/Mspark.js";
import { convertCurrency, syncLedger } from "../services/CoinGateService.js";
import { verifyAddress } from "../services/MempoolService.js";
import { validateAddress } from "../validator/addressValidator.js";
import mongoose from "mongoose";

export const addMsparkAddress = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate input
    const { error, value } = validateAddress(req.body);
    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        success: false,
        messages: errorMessages,
      });
    }

    const { country, state, city, street, houseNo, postalcode } = req.body;

    // Find primary MSPark (with session)
    const primaryMspark = await Mspark.findOne({ type: "primary" })
      .session(session)
      .select("address");

    if (!primaryMspark) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Primary MSPark not found",
      });
    }

    // Check if address already exists
    if (primaryMspark.address) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Primary MSPark already has an address",
      });
    }

    // Create address document
    const [addressObj] = await Address.create(
      [
        {
          country,
          state,
          city,
          street,
          houseNo,
          postalcode,
          mspark: primaryMspark._id,
        },
      ],
      { session }
    );

    // Update MSPark with address reference
    await Mspark.findByIdAndUpdate(
      primaryMspark._id,
      { address: addressObj._id },
      { session, new: true }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: "MSPark address added successfully",
      data: addressObj,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Address creation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add address",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const updateMsparkAddress = async (req, res) => {
  try {
    const {id} = req.params

    // Update MSPark with address reference
    const updatedAddress  = await Address.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "MSPark address added successfully",
      data: updatedAddress,
    });
  } catch (error) {
    console.error("Mspark address update error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add address",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const syncCoinGateLedgerAndAccount = async (req, res) => {
  try {
    const respone = await syncLedger();
    return res.status(200).json(respone);
  } catch (err) {
    return res.status(err.status || 500).json({
      message: err.message,
      success: false,
    });
  }
};

export const getMsparkPrimary = async (req, res) => {
  try {
    const mspark = await Mspark.findOne({ type: "primary" }).populate(
      "address accounts"
    );
    if(!mspark){
      res.json({
        success: true,
        message: "Mspark is yet to be created!",
        data: []
      })
    }

    //Convert to USD
    const accountsWithUSD = await Promise.all(
      mspark.accounts.map(async (account) => {
        try {
          // Get exchange rate from account currency to USD
          const {amount, rate} = await convertCurrency(account.balance,account.symbol, 'USD');
          
          return {
            ...account.toObject(),
            converted: {
              currency: 'USD',
              rate,
              value: amount
            }
          };
        } catch (error) {
          console.log(`Error converting ${account.symbol} to USD: ${error.message}`);
          return {
            ...account.toObject(),
            converted: {
              currency: 'USD',
              rate: null,
              value: null,
              error: 'Conversion failed'
            }
          };
        }
      })
    );

     // Calculate total amount in USD
     const totalAmountUSD = accountsWithUSD.reduce((total, account) => {
      return total + (account.converted.value ? parseFloat(account.converted.value) : 0);
    }, 0);

    // Prepare the response data
    const responseData = {
      ...mspark.toObject(),
      accounts: accountsWithUSD,
      totalAmount: {
        currency: 'USD',
        value: totalAmountUSD.toFixed(2)
      }
    };

    res.json({
      success: true,
      message: "Mspark retrived successful!",
      data: responseData
    })
  } catch (err) {
    console.log(`Get Maprk Error: ${err.message}`)
    res.status(500).json({
      message : err?.message || "Something Went Wrong!",
      success: false
    })
  }
};

export const putValidAccountWallet = async (req, res) => {
  const { id } = req.params;
  const { walletAddress } = req.body;

  // Validate input parameters
  if (!id || !walletAddress) {
    return res.status(400).json({
      success: false,
      message: "Both account ID and wallet address are required"
    });
  }

  try {
    // Validate wallet address format
    // const isValidAddress = await verifyAddress(walletAddress);
    
    // if (!isValidAddress?.isvalid) {
    //   return res.status(400).json({
    //     success: false,
    //     message: `${walletAddress} is not a valid address`,
    //     details: isValidAddress
    //   });
    // }

    // Update the account
    const updatedAccount = await Account.findByIdAndUpdate(
      id,
      { walletAddress },
      { new: true, runValidators: true }
    );

    if (!updatedAccount) {
      return res.status(404).json({
        success: false,
        message: "Account not found"
      });
    }

    return res.json({
      success: true,
      data: updatedAccount,
      message: 'Wallet address updated successfully'
    });

  } catch (err) {
    console.error("Error updating wallet address:", err);
    
    // Handle specific error types
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID format"
      });
    }

    res.status(err.status || 500).json({
      success: false,
      message: "Failed to update wallet address",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
