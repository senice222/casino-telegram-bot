const {User} = require("../models/UserModel");

async function bootstrap(msg, startGameMenu) {
    const userId = msg.from.username;

    try {
        let user = await User.findOne({telegramId: userId});

        if (!user) {
            const doc = new User({
                telegramId: msg.from.username,
                id: msg.from.id,
            });

            await doc.save();
        }

        const chatId = msg.chat.id;
        startGameMenu(chatId);
    } catch (error) {
        console.error("Error processing /start command:", error);
    }
}
async function profileCommandHandler(bot, msg) {
    const tgId = msg.from.username;

    try {
        let user = await User.findOne({ telegramId: tgId });

        if (user) {
            const profileData = `
♣️ AMG ПРОФИЛЬ ♦️

🗣 Рефералы: ${user.referals}
👤 Ваш ID: ${user.id}
💰 Баланс: ${user.balance}$
💸 Пополнений: ${user.replenishment}
📤 Выводов: ${user.withdrawal}
`;
            const chatId = msg.chat.id;
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: "📤 Пополнить", callback_data: "topup" },
                        { text: "📤 Вывод", callback_data: "withdraw" },
                    ],
                    [{ text: "На главную", callback_data: "home" }],
                ],
            };

            const opts = {
                reply_markup: JSON.stringify(keyboard),
            };
            bot.sendMessage(chatId, profileData, opts);
        } else {
            const chatId = msg.chat.id;
            bot.sendMessage(chatId, "Пользователь не найден в базе данных.");
        }
    } catch (error) {
        console.error("Ошибка при обработке команды /profile:", error);
    }
}
module.exports = {
    bootstrap,
    profileCommandHandler
}