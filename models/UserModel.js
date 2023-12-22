const { Schema, model } = require('mongoose');

const userSchema = new Schema({
    telegramId: { type: String, required: true, unique: true },
    referals: {type: Number, default: 0},
    balance: {type: String, default: "0"},
    id: { type: Number, required: true, unique: true },
    replenishment: {type: Number, default: 0},
    withdrawal: {type: Number, default: 0}
});
  
const User = model('User', userSchema);
  
module.exports = { User };