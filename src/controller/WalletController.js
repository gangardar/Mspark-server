import { Client } from "@coingate/coingate-sdk";
import Wallet from "../models/Wallet.js";
import User from "../models/User.js";
import { BadRequestError, NotFoundError } from "../utils/errors.js";
import countries from "i18n-iso-countries";
import { validateWallet } from "../validator/walletValidator.js";
import { createWallet } from "../services/CoinGateService.js";

const coingate = new Client(process.env.COINGATE_API_KEY, true);
export const createBeneficiary = async (req, res) => {
    const { currencyId, platformId, cryptoAddress } = req.body;
    const { _id } = req.user;

    const { error, value } = validateWallet(req.body);

    if (error) {
        const errorMessages = error.details.map(detail => detail.message);
        return res.status(400).json({
          success: false,
          messages: errorMessages
        });
      }
  
    try {
      const isWallet = await Wallet.exists({ cryptoAddress: cryptoAddress });
      if (isWallet) {
        throw new BadRequestError("User with this wallet already exists!");
      }
  
      const user = await User.findOne({ _id: _id, isDeleted: false }).populate("address");
      if (!user && user.role === "admin") throw new NotFoundError("User doesn't exists!");
      console.log("it passed population")
      
      if (!user.address) {
        throw new BadRequestError("User address information is required");
      }

      if (user.wallet) {
        throw new BadRequestError("User already have a wallet.");
      }

      const alpha3Country = countries.getAlpha3Code(user?.address?.country, 'en');
  
      const beneficiary = {
        type: "person",
        email: user.email,
        username: user.username,
        currencyId: currencyId,
        platformId: platformId,
        cryptoAddress: cryptoAddress,
        country: alpha3Country || "MMR",
      };
  
      const response = await createWallet(beneficiary);
      
      // Create wallet record in database
      const wallet = await Wallet.create({
        user: _id,
        coinGateCurrencyId: currencyId,
        coinGatePlatformId: platformId,
        platformTitle: response.data.beneficiary_payout_settings[0].platform.title,
        currencyTitle: response.data.beneficiary_payout_settings[0].currency.title,
        currencySymbol: response.data.beneficiary_payout_settings[0].currency.symbol,
        cryptoAddress: cryptoAddress,
        coinGateId: response.data.id,
        coinGatePayoutId: response.data.beneficiary_payout_settings[0].id,
        status: 'active'
      });

      user.wallet = wallet._id;
      await user.save()
  
      return res.status(201).json({
        success: true,
        message: "New Beneficiary added Successfully!",
        data: {
          wallet: wallet,
          coinGateResponse: response.data
        }
      });
    } catch (err) {
        console.log(err)
        return res.status(err?.status|| 500).json({
          success: false,
          message: err.message
        });
    }
  };
