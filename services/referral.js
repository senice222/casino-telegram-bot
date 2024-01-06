
function startGameMenu(bot, chatId) {
    const rescueRingEmoji = "\u{1F6DF}";
    const opts = {
        reply_markup: JSON.stringify({
            keyboard: [
                [{text: "🎰 Игры"}],
                [{text: "🎁 Бонусы"}, {text: "👤 Профиль"}],
                [
                    {text: `${rescueRingEmoji} Тех. поддержка`},
                    {text: "ℹ️ Информация"},
                ],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
        }),
    };

    bot.sendMessage(chatId, "Выберите раздел:", opts)
}

function showBonuses(bot, chatId) {
    const opts = {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: "🔗 Реферальная система", callback_data: "referralBonus"}],
            ],
        }),
    };

    bot.sendMessage(chatId, "🎁 Доступні бонуси:", opts);
}

function showReferralSystem(bot, chatId) {
    const referralMessage =
        `🔗 Ваше реферальне посилання - https://t.me/azimut_casino_bot?start=${chatId}\n\n` +
        `🗣 Реферали: 0\n` +
        `💸 Прибуток з рефералів: 0 грн\n` +
        `- - - - -\n` +
        `Умови:\n` +
        `1️⃣ Людина повинна перейти по вашому реферальному посиланні і почати користуватися ботом, тоді вам зарахується реферал\n` +
        `2️⃣ При кожному депозиті вашого реферала ви отримаєте 10% від його поповнення`;

    const opts = {
        reply_markup: JSON.stringify({
            inline_keyboard: [[{text: "На главную", callback_data: "home"}]],
        }),
    };

    bot.sendMessage(chatId, referralMessage, opts);
}


module.exports = {
    showBonuses,
    showReferralSystem
}