

async function isValidChoice(bot, game, userId, choice) {
    if (!game) {
        console.error(`No game found for userId: ${userId}`);
        return false;
    }
    if (game.choices.some(item => item[userId])) {
        bot.sendMessage(userId, "Ви вже зробили вибір.");
        return false;
    }
    if (game.choices.some(userChoice => userChoice[userId] === choice)) {
        bot.sendMessage(userId, "Ви вже обрали цей варіант раніше.");
        return false;
    }
    if (game.choices.some(userChoice => Object.values(userChoice).some(choices => choices.includes(choice)))) {
        bot.sendMessage(userId, "Цей варіант вже був обраний іншим користувачем.");
        return false;
    }
    return true;
}

module.exports = {
    isValidChoice
}