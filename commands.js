


function startGameMenu(bot, chatId) {
    const rescueRingEmoji = '\u{1F6DF}';
    const opts = {
        reply_markup: JSON.stringify({
            keyboard: [
                [{text: '🎰 Игры'}],
                [{text: '🎁 Бонусы'}, {text: '👤 Профиль'}],
                [{text: `${rescueRingEmoji} Тех. поддержка`}, {text: 'ℹ️ Информация'}],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
        }),
    };

    bot.sendMessage(chatId, 'Выберите раздел:', opts);
}

function startDiceGame(bot, chatId) {
    const opts = {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Больше', callback_data: 'guessMore'}],
                [{text: 'Меньше', callback_data: 'guessLess'}],
            ],
        }),
    };
    bot.sendMessage(chatId, 'Угадайте, будет ли выпадение кубика больше или меньше 3.', opts);
}

function showBonuses(bot, chatId) {
    const opts = {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: '🔗 Реферальная система', callback_data: 'referralBonus'}],
            ],
        }),
    };

    bot.sendMessage(chatId, '🎁 Доступні бонуси:', opts);
}

function showReferralSystem(bot, chatId) {
    const referralMessage = `🔗 Ваше реферальне посилання - https://t.me/azimut_casino_bot?start=${chatId}\n\n`
        + `🗣 Реферали: 0\n`
        + `💸 Прибуток з рефералів: 0 грн\n`
        + `- - - - -\n`
        + `Умови:\n`
        + `1️⃣ Людина повинна перейти по вашому реферальному посиланні і почати користуватися ботом, тоді вам зарахується реферал\n`
        + `2️⃣ При кожному депозиті вашого реферала ви отримаєте 10% від його поповнення`;

    const opts = {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'На главную', callback_data: 'home'}],
            ],
        }),
    };

    bot.sendMessage(chatId, referralMessage, opts);
}

async function rollDice(bot, chatId, userChoice) {
    const emoji = userChoice === 'more' ? '⬆️' : '⬇️';
    
    const apiUrl = `https://api.telegram.org/bot${token}/sendDice?chat_id=${chatId}`;
    try {
        const response = await fetch(apiUrl, { method: 'POST' });
        const data = await response.json();

        if (data.ok && data.result) {
            const diceValue = data.result.dice.value;

            setTimeout(() => {
                let resultMessage = '';
                if ((userChoice === 'more' && diceValue > 3) || (userChoice === 'less' && diceValue <= 3)) {
                    resultMessage = `Поздравляем! Вы угадали! Кубик: 🎲${diceValue} ${emoji}`;
                } else {
                    resultMessage = `Увы, вы не угадали. Кубик: 🎲${diceValue} ${emoji}`;
                }

                const opts = {
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            [{ text: 'Новая игра', callback_data: 'newGame' }],
                            [{ text: 'На главную', callback_data: 'home' }],
                        ],
                    }),
                };

                bot.sendMessage(chatId, resultMessage, opts);
            }, 4200);
        } else {
            console.error('Failed to get dice value:', data);
        }
    } catch (error) {
        console.error('Error fetching dice value:', error);
    }
}

async function startBasketballGame(bot, chatId) {

    bot.sendDice(chatId, { emoji: '🏀' })
    .then((message) => {
        console.log(message)
        const diceValue = message.dice.value;
        handleBasketballGame(chatId, diceValue)
    })
    .catch((error) => {
        console.error('Error sending dice:', error);
    });

    userState[chatId] = 'Basketball';
}

function handleBasketballGame(bot, chatId, diceValue) {
    let resultMessage = '';

    setTimeout(() => {
        if (diceValue === 1 || diceValue ===  4) {
            resultMessage = 'Поздравляем! Вы попали в корзину 🏀';
        } else {
            resultMessage = 'Увы, мяч не попал в корзину. Попробуйте ещё раз! 🏀';
        }

        const opts = {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{ text: 'Новая игра', callback_data: 'newGame' }],
                    [{ text: 'На главную', callback_data: 'home' }],
                ],
            }),
        };
    
        bot.sendMessage(chatId, resultMessage, opts);
    }, [3500])
}



module.exports = {
    startGameMenu,
    startDiceGame,
    showBonuses,
    showReferralSystem,
    rollDice,
    startBasketballGame,
    handleBasketballGame
};