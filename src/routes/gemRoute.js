import express from 'express'
import { validateGem } from '../validator/validateGem.js';
import { assignToMe, createGem, deleteGem, deleteGemImage, getAllGems, getDeletedGems, getGemById, getGemByMerchnatId, getGemByVerifierId, getNotDeletedGems, getSoldGemByMerchnatId, restoreGem, softDeleteGem, updateGem, verifyGem } from '../controller/GemController.js';
import { upload } from '../middleware/uploadImages.js';
import multer from 'multer';
import authMiddleware from '../middleware/auth.js';
import authorizeRoles from '../middleware/authorize.js';

const parseBody = multer();
const gemRoute = express.Router();
gemRoute.use(authMiddleware)
gemRoute.post("/",upload.array("images",10) ,validateGem, createGem);
gemRoute.get("/", getNotDeletedGems); // Get only non-deleted gems
gemRoute.get("/deleted", getDeletedGems); // Get only deleted gems
gemRoute.get("/:id", getGemById);
gemRoute.get("/merchant/:id", getGemByMerchnatId);
gemRoute.get("/merchant/:id/sold", getSoldGemByMerchnatId);
gemRoute.get("/assigned/:id",authorizeRoles('admin'), getGemByVerifierId);
gemRoute.put("/:id",upload.array("images",10), validateGem, updateGem);
gemRoute.put("/verify/:id", verifyGem);
gemRoute.put("/assignToMe/:id", assignToMe);
gemRoute.delete("/:id", softDeleteGem); // Soft delete
gemRoute.delete("/image/:id", deleteGemImage); // Soft delete
gemRoute.put("/:id/restore", restoreGem); // Restore soft deleted gem
export default gemRoute