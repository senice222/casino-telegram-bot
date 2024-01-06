
function startBasketballGame(bot, chatId, userState) {
    const opts = {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: "Да", callback_data: "yesBB"}],
                [{text: "Нет", callback_data: "noBB"}],
            ],
        }),
    };
    userState[chatId] = "Basketball";
    bot.sendMessage(chatId, "Попадет ли мяч в кольцо?", opts);
}

async function handleBasketballGame(bot, chatId, userChoice) {
    try {
        const data = await bot.sendDice(chatId, {emoji: "🏀"});
        const diceValue = data.dice.value;

        setTimeout(() => {
            let resultMessage = "";
            if (
                (userChoice === "yesBB" && diceValue === 5) ||
                diceValue === 4 ||
                (userChoice === "noBB" && diceValue < 4)
            ) {
                resultMessage = `Поздравляем! Мяч попал в корзину! Вы выйграли.`;
            } else {
                resultMessage = `Увы, мяч не попал в корзину. Вы проиграли.`;
            }

            const opts = {
                reply_markup: JSON.stringify({
                    inline_keyboard: [
                        [{text: "Новая игра", callback_data: "newGame"}],
                        [{text: "На главную", callback_data: "home"}],
                    ],
                }),
            };

            bot.sendMessage(chatId, resultMessage, opts);
        }, 4200);
    } catch (error) {
        console.error("Error fetching dice value:", error);
    }
}

module.exports = {
    startBasketballGame,
    handleBasketballGame
}