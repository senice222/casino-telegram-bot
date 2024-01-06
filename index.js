const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const {User} = require("./models/UserModel");
const {
    startDiceGame,
    startCreateDiceGame,
    leaveDiceGame,
    availableDiceGames,
    setUserChoice,
} = require("./services/dice");
const {
    requestAmountCrypto,
    transferCoins,
    withdrawalAmount, initiateWithdrawal,
} = require("./services/payment");
const {startBasketballGame, handleBasketballGame} = require("./services/basketball");
const {showBonuses, showReferralSystem} = require("./services/referral");
const {bootstrap, profileCommandHandler} = require("./commands/bootstrap");
require("dotenv").config();

const bot = new TelegramBot(process.env.TOKEN, {polling: true});

const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI, {useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "Ошибка подключения к MongoDB:"));
db.once("open", () => {
    console.log("Успешное подключение к MongoDB!");
});

const userState = {};

function startGameMenu(chatId) {
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

    bot.sendMessage(chatId, "Выберите раздел:", opts);
}

async function startDartsGame(chatId) {
    bot
        .sendDice(chatId, {emoji: "🏀"})
        .then((message) => {
            console.log(message);
            const diceValue = message.dice.value;
            handleBasketballGame(chatId, diceValue);
        })
        .catch((error) => {
            console.error("Error sending dice:", error);
        });

    userState[chatId] = "Darts";
}

function showGames(chatId) {
    const message = "Доступные игры:";

    const options = {
        reply_markup: JSON.stringify({
            keyboard: [
                [{text: "🎲 Dice"}],
                [{text: "🏀 Basketball"}],
                [{text: "🙅‍♂️ Cancel"}],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
        }),
    };

    bot.sendMessage(chatId.chat.id, message, options).catch((error) => {
        console.error(`Error sending message in showGames: ${error.message}`);
    });
}

// --------------------- start ----------------------------

const start = () => {
    bot.onText(/\/start/,  (msg) => bootstrap(msg, startGameMenu));
    bot.onText(/Игры/, (msg) => showGames(msg));

    bot.onText(/Бонусы/, (msg) => {
        const chatId = msg.chat.id;
        showBonuses(bot, chatId);
    });

    bot.onText(/Cancel/, (msg) => {
        const chatId = msg.chat.id;
        delete userState[chatId];
        startGameMenu(chatId);
    });

    bot.onText(/Dic e/, (msg) => {
        const chatId = msg.chat.id;
        const opts = {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{text: "🎲 Список доступных игр", callback_data: "diceListGame"}],
                    [{text: "➕ Создать игру", callback_data: "createDiceGame"}],
                    [{text: "🔙 Назад", callback_data: "games"}],
                ],
            }),
        };
        bot.sendMessage(chatId, "🎲 DICE", opts);
    });
    bot.onText(/Basketball/, (msg) => {
        const chatId = msg.chat.id;
        userState[chatId] = "Basketball";
        startBasketballGame(bot, chatId, userState);
    });
    bot.onText(/Профиль/, (msg) => profileCommandHandler(bot, msg));
    bot.onText(/⬅️ Назад/, (msg) => showGames(msg));

    bot.onText(/🎲 (.+) - (\d+)\$/, (msg, match) => {
        const gameName = match[1];
        startDiceGame(bot, msg.chat.id, gameName)
    });

    bot.on("callback_query", (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const userId = callbackQuery.message.chat.username;
        const data = callbackQuery.data;
        const gameId = data.split('_')[1];

        switch (callbackQuery.data) {
            case `guessMore_${gameId}`:
            case `guessLess_${gameId}`:
                setUserChoice(bot, data, chatId);
                break;
            case "newGame":
                if (userState[chatId] === "Dice") {
                    startDiceGame(bot, chatId);
                } else if (userState[chatId] === "Basketball") {
                    startBasketballGame(chatId, userState);
                }
                break;
            case "yesBB":
            case "noBB":
                handleBasketballGame(bot, chatId, callbackQuery.data);
                break;
            case "playBasketball":
                console.log(callbackQuery)
                userState[chatId] = "Basketball";
                startBasketballGame(bot, chatId, userState);
                break;
            case "createDiceGame":
                startCreateDiceGame(bot, chatId);
                break;
            case "diceListGame":
                availableDiceGames(bot, chatId);
                break;
            case "leaveDiceGame":
                leaveDiceGame(bot, chatId);
                break;
            case "topup":
                const inlineKeyboard = [
                    [
                        {text: "BTC", callback_data: "topup_btc"},
                        {text: "ETH", callback_data: "topup_eth"},
                    ],
                    [
                        {text: "USDT", callback_data: "topup_usdt"},
                        {text: "TON", callback_data: "topup_ton"},
                    ],
                ];

                bot.sendMessage(chatId, "Выберите криптовалюту:", {
                    reply_markup: {
                        inline_keyboard: inlineKeyboard,
                    },
                });
                break;
            case "topup_btc":
                requestAmountCrypto(bot, chatId, userId, callbackQuery.data); // <== currency
                break;
            case "topup_eth":
                requestAmountCrypto(bot, chatId, userId, callbackQuery.data);
                break;
            case "topup_usdt":
                requestAmountCrypto(bot, chatId, userId, callbackQuery.data);
                break;
            case "topup_ton":
                requestAmountCrypto(bot, chatId, userId, callbackQuery.data);
                break;
            case "withdraw":
                console.log('withdraw')
                initiateWithdrawal(bot, userId);
                break;
            case "home":
                startGameMenu(chatId);
                break;
            case "games":
                const message = "Доступные игры:";

                const options = {
                    reply_markup: JSON.stringify({
                        keyboard: [
                            [{text: "🎲 Dice"}],
                            [{text: "🏀 Basketball"}],
                            [{text: "🙅‍♂️ Cancel"}],
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true,
                    }),
                };

                bot.sendMessage(chatId, message, options).catch((error) => {
                    console.error(`Error sending message in showGames: ${error.message}`);
                });
                break;
            case "referralBonus":
                showReferralSystem(bot, chatId);
                break;
            case "cancel":
                delete userState[chatId];
                bot.sendMessage(chatId, "Вы отменили текущее действие.");
                break;
            // default:
            //   const errorMessage = "Неизвестный запрос.";
            //   bot.sendMessage(chatId, errorMessage);
        }
    });

    bot.on("message", (msg) => {
        const text = msg.text;

        switch (text) {
        }
    });
};
start();

bot.on("polling_error", (error) => {
    console.error(`Polling error: ${error.message}`);
});

module.exports = {handleBasketballGame, startBasketballGame, startGameMenu};
