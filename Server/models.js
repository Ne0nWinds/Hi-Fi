const joi = require('@hapi/joi');
const songSchema = joi.object({
    title: joi
        .string()
        .min(2)
        .max(32)
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
        .regex(/[1-9]{0,1}\d:[0-5]\d/)
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
});

const albumSchema = joi.object({
    title: joi
        .string()
        .min(2)
        .max(32)
        .regex(/w+/)
        .required(),
    artID: joi.string().required(),
    songs: joi.array().required(),
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
    albumSchema,
    userSchema,
};
