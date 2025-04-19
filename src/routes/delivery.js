import { createDelivery, deleteDelivery, getDeliveries, updateStatus } from "../controller/DeliveryController.js";
import express from 'express';
import authMiddleware from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorize.js";

const deliveryDelivery = express.Router();
deliveryDelivery.get('/', getDeliveries)
deliveryDelivery.post('/', createDelivery)
deliveryDelivery.put('/:id/status', updateStatus)
deliveryDelivery.delete('/',deleteDelivery)

export default deliveryDelivery