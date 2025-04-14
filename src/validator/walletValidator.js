import Joi from 'joi';

export const createBeneficiarySchema = Joi.object({
  currencyId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Currency ID must be a number',
      'number.integer': 'Currency ID must be an integer',
      'number.positive': 'Currency ID must be positive',
      'any.required': 'Currency ID is required'
    }),
  platformId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Platform ID must be a number',
      'number.integer': 'Platform ID must be an integer',
      'number.positive': 'Platform ID must be positive',
      'any.required': 'Platform ID is required'
    }),
  cryptoAddress: Joi.string().required()
    .messages({
      'string.base': 'Crypto address must be a string',
      'string.empty': 'Crypto address cannot be empty',
      'any.required': 'Crypto address is required'
    })
});

export const validateWallet = (data) => {
  return createBeneficiarySchema.validate(data, { abortEarly: false });
};