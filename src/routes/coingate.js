import express from 'express'
import { getCoinGateCurrencies } from "../services/CoinGateService.js";

const coingateRouter = express.Router();


coingateRouter.get('/currencies',getCoinGateCurrencies)

export default coingateRouter