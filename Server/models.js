const joi = require('@hapi/joi');

const songSchema = joi.object({
    title: joi
        .string()
        .min(2)
        .max(64)
        .regex(/\w+/)
        .required(),
    artist: joi
        .string()
        .min(2)
        .max(32)
        .regex(/\w+/)
        .required(),
    duration: joi
        .string()
        .regex(/\d+\.\d+/)
        .required(),
    dataIDs: joi.object({
        '96k': joi.string(),
        '128k': joi.string(),
        '192k': joi.string(),
    }),
    albumID: joi.string().required(),
    trackNumber: joi
        .number()
        .min(1)
        .required(),
    indexRange: joi
        .number()
        .min(822)
        .required(),
});

const userSchema = joi.object({
    email: joi
        .string()
        .email()
        .required(),
    password: joi
        .string()
        .min(4)
        .required(),
});
module.exports = {
    songSchema,
    userSchema,
};
