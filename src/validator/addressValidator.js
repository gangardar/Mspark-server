import Joi from 'joi';

const createAddressSchema = Joi.object({
  country: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Country is required',
    'string.min': 'Country must be at least 2 characters',
    'string.max': 'Country cannot exceed 50 characters',
  }),
  state: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'State is required',
    'string.min': 'State must be at least 2 characters',
    'string.max': 'State cannot exceed 50 characters',
  }),
  city: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'City is required',
    'string.min': 'City must be at least 2 characters',
    'string.max': 'City cannot exceed 50 characters',
  }),
  street: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Street is required',
    'string.min': 'Street must be at least 2 characters',
    'string.max': 'Street cannot exceed 100 characters',
  }),
  houseNo: Joi.string().alphanum().required().messages({
    'string.empty': 'House number is required',
    'string.alphanum': 'House number must contain only letters and numbers',
  }),
  postalcode: Joi.string()
    .pattern(/^[0-9]{5,10}$/)
    .required()
    .messages({
      'string.empty': 'Postal code is required',
      'string.pattern.base': 'Postal code must be between 5 and 10 digits',
    }),
});

export const validateAddress = (data) => {
  return createAddressSchema.validate(data, { abortEarly: false });
};