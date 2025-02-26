import Joi from "joi";
import fs from 'fs'

const gemSchema = Joi.object({
  name: Joi.string().trim().min(3).max(255).required(),
  type: Joi.string().trim().min(3).max(255).default("unknown"),
  weight: Joi.number().positive().required(),
  shape: Joi.string().valid("Round", "Oval", "Square", "Pear", "Rough", "Other").optional(),
  rarity: Joi.string().valid("Common", "Uncommon", "Rare", "Very Rare").optional(),
  color: Joi.string().required(),
  dimension: Joi.object({
    length: Joi.number().positive().optional(),
    width: Joi.number().positive().optional(),
    height: Joi.number().positive().optional(),
  }).optional(),
  density: Joi.number().positive().optional(),
  refractiveIndex: Joi.number().optional(),
  hardness: Joi.number().optional(),
  transparency: Joi.string().valid("Opaque", "Translucent", "Transparent").optional(),
  evidentFeatures: Joi.string().optional(),
  status: Joi.string().valid("Pending", "Verified", "Available", "Sold").default("Pending"),
  price: Joi.number().positive().optional(),
  merchantId: Joi.string().optional(), // This should be an ObjectId but validated in Mongoose
  verifierId: Joi.string().optional(), // This should be an ObjectId but validated in Mongoose

});

// Middleware function for validation
export const validateGem = (req, res, next) => {
  const { error } = gemSchema.validate(req.body, { abortEarly: false });
  if (error) {
    if(req.files){
      req.files.map((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
      }
      })
    }
    return res.status(400).json({ success: false, errors: error.details.map(err => err.message) });
  }
  next();
};
