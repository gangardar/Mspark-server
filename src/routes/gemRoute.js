import express from 'express'
import { validateGem } from '../validator/validateGem.js';
import { createGem, deleteGem, getAllGems, getDeletedGems, getGemById, getNotDeletedGems, restoreGem, softDeleteGem, updateGem } from '../controller/GemController.js';
import { upload } from '../middleware/uploadImages.js';
import multer from 'multer';

const parseBody = multer();
const gemRoute = express.Router();

gemRoute.post("/",upload.array('images',10) ,validateGem, createGem);
gemRoute.get("/", getNotDeletedGems); // Get only non-deleted gems
gemRoute.get("/deleted", getDeletedGems); // Get only deleted gems
gemRoute.get("/:id", getGemById);
gemRoute.put("/:id", validateGem, updateGem);
gemRoute.delete("/:id", softDeleteGem); // Soft delete
gemRoute.put("/:id/restore", restoreGem); // Restore soft deleted gem
export default gemRoute