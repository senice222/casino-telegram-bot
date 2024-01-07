const {Schema, model} = require("mongoose");

const DiceGame = new Schema({
    name: {type: String, required: true},
    ownerId: {type: Number, required: true},
    amount: {type: Number, required: true},
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
}, {minimize: false});

const Dice = model("Dice", DiceGame);

module.exports = {Dice};
