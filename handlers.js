const { User } = require('./models/UserModel');
const { startGameMenu, startDiceGame, showBonuses, showReferralSystem, rollDice, startBasketballGame, handleBasketballGame } = require('./commands');

const userState = {};

function bootstrap(bot) {
    bot.onText(/\/start/, async (msg) => {
        const userId = msg.from.username; 

        try {
            let user = await User.findOne({telegramId: userId});

            if (!user) {
                const doc = new User({
                    telegramId: msg.from.username,
                    id: msg.from.id
                });

                await doc.save();
            }

            const chatId = msg.chat.id;
            startGameMenu(chatId);
        } catch (error) {
            console.error("Error processing /start command:", error);
        }
    });

    bot.onText(/Игры/, (msg) => {
        const chatId = msg.chat.id;
        const opts = {
            reply_markup: JSON.stringify({
                keyboard: [
                    [{text: '🎲 Dice'}],
                    [{text: '🏀 Basketball'}],
                    [{text: '🙅‍♂️ Отмена'}],
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
            }),
        };
        
        bot.sendMessage(chatId, 'Выберите игру:', opts);
    });

    bot.onText(/Бонусы/, (msg) => {
        const chatId = msg.chat.id;
        showBonuses(chatId);
    });

    bot.onText(/Отмена/, (msg) => {
        const chatId = msg.chat.id;
        delete userState[chatId];
        startGameMenu(chatId);
    });

    bot.onText(/Dice/, (msg) => {
        const chatId = msg.chat.id;
        userState[chatId] = 'Dice';
        startDiceGame(chatId);
    });
    bot.onText(/Basketball/, (msg) => {
        const chatId = msg.chat.id;
        userState[chatId] = 'Basketball';
        startBasketballGame(chatId);
    });

    bot.onText(/Профиль/, async (msg) => {
        const tgId = msg.from.username;
        
        try {
            let user = await User.findOne({ telegramId: tgId });
    
            if (user) {
                const profileData = `
 ♣️ AMG ПРОФИЛЬ ♦️

🗣 Рефералы: ${user.referals}
👤 Ваш ID: ${user.id}
💰 Баланс: ${user.balance} руб.
💸 Пополнений: ${user.replenishment}
📤 Выводов: ${user.withdrawal}
`
    
                const chatId = msg.chat.id;
                const keyboard = {
                    inline_keyboard: [
                        [{ text: '📤 Пополнить', callback_data: 'topup' }, { text: '📤 Вывод', callback_data: 'withdraw' }],
                    ],
                };
    
                const opts = {
                    reply_markup: JSON.stringify(keyboard),
                };
    
                bot.sendMessage(chatId, profileData, opts);
            } else {
                const chatId = msg.chat.id;
                bot.sendMessage(chatId, 'Пользователь не найден в базе данных.');
            }
        } catch (error) {
            console.error("Ошибка при обработке команды /profile:", error);
        }
    });
    

    bot.on('callback_query', (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;

        switch (callbackQuery.data) {
            case 'guessMore':
            case 'guessLess':
                if (userState[chatId] === 'Dice') {
                    rollDice(chatId, callbackQuery.data.substr(5).toLowerCase());
                }
                break;
            case 'newGame':
                if (userState[chatId] === 'Dice') {
                    startDiceGame(chatId);
                } else if (userState[chatId] === 'Basketball') {
                    startBasketballGame(chatId)
                }
                break;
            case 'playBasketball':
                userState[chatId] = 'Basketball';
                startBasketballGame(chatId);
                break;
            case 'shootBall':
                if (userState[chatId] === 'Basketball') {
                    handleBasketballGame(chatId);
                    delete userState[chatId];
                }
                break;    
            case 'home':
                delete userState[chatId];
                bot.sendMessage(chatId, 'Вы вернулись на главную страницу.');
                startGameMenu(chatId);
                break;
            case 'referralBonus':
                showReferralSystem(chatId);
                break;
            case 'cancel':
                delete userState[chatId];
                bot.sendMessage(chatId, 'Вы отменили текущее действие.');
                break;
        }
    });

    bot.on('message', (msg) => {
        const chatId = msg.chat.id;

        switch (msg.text) {
            // другие обработчики для других игр, если необходимо
        }
    });
}

module.exports = { bootstrap };