const { Schema, model } = require("mongoose");

const BasketballGame = new Schema({
    name: { type: String, required: true },
    ownerId: { type: Number, required: true },
    amount: { type: Number, required: true },
    choices: {
        type: Array,
        default: [],
    },
    users: {
        type: [Number],
        required: true,
        validate: {
            validator: function (usersArray) {
                return usersArray.length <= 2;
            },
            message: "The maximum number of users is 2.",
        },
    },
    status: {
        type: String,
        enum: ["pending", "playing", "end", "error"],
        required: true,
    },
}, { minimize: false });

const Basketball = model("Basketball", BasketballGame);

module.exports = { Basketball };
