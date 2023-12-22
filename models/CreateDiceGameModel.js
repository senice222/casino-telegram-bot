const { Schema, model } = require("mongoose");

const createDiceGameModelSchema = new Schema({
  ownerId: { type: Number, required: true},
  amount: { type: Number, required: true},
  users: {
    type: [Number],
    required: true,
    validate: {
      validator: function (usersArray) {
        return usersArray.length <= 1;
      },
      message: "The maximum number of users is 2.",
    },
  },
  status: {
    type: String,
    enum: ["pending", "playing", "error"], 
    required: true,
  },
});

const Dice = model("Dice", createDiceGameModelSchema);

module.exports = { Dice };
