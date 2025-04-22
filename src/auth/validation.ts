import Joi from "joi";

export const loginValidation = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(4).required(),
});
