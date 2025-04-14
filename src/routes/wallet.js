import express from 'express'
import { createBeneficiary } from '../controller/WalletController.js'
import authMiddleware from '../middleware/auth.js'

const walletRouter = express.Router()

walletRouter.use(authMiddleware)

walletRouter.post('/', createBeneficiary)

export default walletRouter