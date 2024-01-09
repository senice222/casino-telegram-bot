const {User} = require("./models/UserModel");

async function toWinner(userId, game) {
    try {
        const user = await User.findOne({id: userId});
        user.balance = (parseInt(user.balance) + game.amount).toString();
        await user.save();
    } catch (error) {
        console.error(`Error updating winner's balance: ${error.message}`);
    }
}

async function toLooser(userId, game) {
    try {
        const user = await User.findOne({id: userId});
        user.balance = (parseInt(user.balance) - game.amount).toString();
        await user.save();
    } catch (error) {
        console.error(`Error updating loser's balance: ${error.message}`);
    }
}

module.exports = {
    toWinner,
    toLooser
}