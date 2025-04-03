import Joi from 'joi';

// Auction creation validation schema
const auctionCreateSchema = Joi.object({
  priceStart: Joi.number()
    .positive()
    .required()
    .messages({
      'number.base': 'Starting price must be a number',
      'number.positive': 'Starting price must be positive',
      'any.required': 'Starting price is required'
    }),
    
  endTime: Joi.date()
    .greater('now')
    .required()
    .messages({
      'date.base': 'End time must be a valid date',
      'date.greater': 'End time must be in the future',
      'any.required': 'End time is required'
    }),
    
  gemId: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      'string.hex': 'Gem ID must be a valid hexadecimal',
      'string.length': 'Gem ID must be 24 characters long',
      'any.required': 'Gem ID is required'
    })
});

// Bid placement validation schema
const bidPlacementSchema = Joi.object({
  bidAmount: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      'number.base': 'Bid amount must be a number',
      'number.positive': 'Bid amount must be positive',
      'number.precision': 'Bid amount can have max 2 decimal places',
      'any.required': 'Bid amount is required'
    })
});

/**
 * Validate auction creation input
 */
export const validateAuctionInput = (priceStart, endTime, gemId) => {
  const { error } = auctionCreateSchema.validate(
    { priceStart, endTime, gemId },
    { abortEarly: false }
  );
  
  if (error) {
    const errors = error.details.reduce((acc, curr) => {
      acc[curr.path[0]] = curr.message;
      return acc;
    }, {});
    return { valid: false, errors };
  }
  
  return { valid: true };
};

/**
 * Validate bid placement input
 */
export const validateBidInput = (bidAmount) => {
  const { error } = bidPlacementSchema.validate(
    { bidAmount },
    { abortEarly: false }
  );
  
  if (error) {
    const errors = error.details.reduce((acc, curr) => {
      acc[curr.path[0]] = curr.message;
      return acc;
    }, {});
    return { valid: false, errors };
  }
  
  return { valid: true };
};

/**
 * Validate auction update input (for status changes)
 */
export const validateAuctionUpdate = (status) => {
  const schema = Joi.string()
    .valid('pending', 'active', 'completed', 'cancelled')
    .required()
    .messages({
      'any.only': 'Invalid auction status',
      'any.required': 'Status is required'
    });
    
  const { error } = schema.validate(status);
  
  if (error) {
    return { valid: false, error: error.message };
  }
  
  return { valid: true };
};


export const validateAuctionExtend = (endTime) => {
  const schema = Joi.date()
  .greater('now')
  .required()
  .messages({
    'date.base': 'End time must be a valid date',
    'date.greater': 'End time must be in the future',
    'any.required': 'End time is required'
  })
    
  const { error } = schema.validate(endTime);
  
  if (error) {
    return { valid: false, error: error.message };
  }
  
  return { valid: true };
};