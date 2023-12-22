const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const { User } = require("./models/UserModel");
const {
  startDiceGame,
  rollDice,
  startCreateDiceGame,
  leaveDiceGame,
  availableDiceGames,
} = require("./services/dice");
const {
  requestAmountCrypto,
  transferCoins,
  withdrawalAmount,
} = require("./services/payment");
require("dotenv").config();

const bot = new TelegramBot(process.env.TOKEN, { polling: true });
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
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
        [{ text: "🎰 Игры" }],
        [{ text: "🎁 Бонусы" }, { text: "👤 Профиль" }],
        [
          { text: `${rescueRingEmoji} Тех. поддержка` },
          { text: "ℹ️ Информация" },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    }),
  };

  bot.sendMessage(chatId, "Выберите раздел:", opts);
}
function showBonuses(chatId) {
  const opts = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: "🔗 Реферальная система", callback_data: "referralBonus" }],
      ],
    }),
  };

  bot.sendMessage(chatId, "🎁 Доступні бонуси:", opts);
}

function showReferralSystem(chatId) {
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
      inline_keyboard: [[{ text: "На главную", callback_data: "home" }]],
    }),
  };

  bot.sendMessage(chatId, referralMessage, opts);
}

function startBasketballGame(chatId) {
  const opts = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: "Да", callback_data: "yesBB" }],
        [{ text: "Нет", callback_data: "noBB" }],
      ],
    }),
  };
  userState[chatId] = "Basketball";
  bot.sendMessage(chatId, "Попадет ли мяч в кольцо?", opts);

  // bot
  //   .sendDice(chatId, { emoji: "🏀" })
  //   .then((message) => {
  //     console.log(message);
  //     const diceValue = message.dice.value;
  //     handleBasketballGame(chatId, diceValue);
  //   })
  //   .catch((error) => {
  //     console.error("Error sending dice:", error);
  //   });

  // userState[chatId] = "Basketball";
}
function throwBasketball(userChoice) {
  bot
    .sendDice(chatId, { emoji: "🏀" })
    .then((message) => {
      const diceValue = message.dice.value;
      handleBasketballGame(chatId, diceValue, userChoice);
    })
    .catch((error) => {
      console.error("Error sending dice:", error);
    });

  userState[chatId] = "Basketball";
}

async function handleBasketballGame(chatId, userChoice) {
  try {
    const data = await bot.sendDice(chatId, { emoji: "🏀" });
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
            [{ text: "Новая игра", callback_data: "newGame" }],
            [{ text: "На главную", callback_data: "home" }],
          ],
        }),
      };

      bot.sendMessage(chatId, resultMessage, opts);
    }, 4200);
  } catch (error) {
    console.error("Error fetching dice value:", error);
  }
}

async function startDartsGame(chatId) {
  bot
    .sendDice(chatId, { emoji: "🏀" })
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
        [{ text: "🎲 Dice" }],
        [{ text: "🏀 Basketball" }],
        [{ text: "🙅‍♂️ Cancel" }],
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
  bot.onText(/\/start/, async (msg) => {
    const userId = msg.from.username;

    try {
      let user = await User.findOne({ telegramId: userId });

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
  });

  bot.onText(/Игры/, (msg) => {
    showGames(msg);
  });

  bot.onText(/Бонусы/, (msg) => {
    const chatId = msg.chat.id;
    showBonuses(chatId);
  });

  bot.onText(/Cancel/, (msg) => {
    const chatId = msg.chat.id;
    delete userState[chatId];
    startGameMenu(chatId);
  });

  bot.onText(/Dice/, (msg) => {
    const chatId = msg.chat.id;
    const opts = {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [{ text: "🎲 Список доступных игр", callback_data: "diceListGame" }],
          [{ text: "➕ Создать игру", callback_data: "createDiceGame" }],
          [{ text: "🔙 Назад", callback_data: "games" }],
        ],
      }),
    };
    bot.sendMessage(chatId, "🎲 DICE", opts);
  });

  bot.onText(/Basketball/, (msg) => {
    const chatId = msg.chat.id;
    userState[chatId] = "Basketball";
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
  });

  bot.on("callback_query", (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.message.chat.username;
    console.log(callbackQuery);
    switch (callbackQuery.data) {
      case "guessMore":
      case "guessLess":
        if (userState[chatId] === "Dice") {
          rollDice(bot, chatId, callbackQuery.data.substr(5).toLowerCase());
        }
        break;
      case "newGame":
        if (userState[chatId] === "Dice") {
          startDiceGame(bot, chatId);
        } else if (userState[chatId] === "Basketball") {
          startBasketballGame(chatId);
        }
        break;
      case "yesBB":
      case "noBB":
        handleBasketballGame(chatId, callbackQuery.data);
        break;
      case "playBasketball":
        userState[chatId] = "Basketball";
        startBasketballGame(chatId);
        break;
      case "playGame":
        bot.sendMessage(chatId, "Обрано гру №10501402");
        break;
      case "createDiceGame":
        startCreateDiceGame(bot, chatId);
        break;
      case callbackQuery.data.startsWith("join_dice_game_"):
        handleJoinGameCallback(chatId, callbackQuery.data);
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
            { text: "BTC", callback_data: "topup_btc" },
            { text: "ETH", callback_data: "topup_eth" },
          ],
          [
            { text: "USDT", callback_data: "topup_usdt" },
            { text: "TON", callback_data: "topup_ton" },
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
        async function initiateWithdrawal() {
          try {
            const user = await User.findOne({ telegramId: userId });

            if (user.balance <= 0.99) {
              bot.answerCallbackQuery({
                callback_query_id: callbackQuery.id,
                text: "❗️ Минимальная сумма для вывода 5 долларов",
                show_alert: true,
              });
            } else {
              return withdrawalAmount(bot, chatId, userId);
            }
          } catch (error) {
            console.error("Error initiating withdrawal:", error.message);
          }
        }
        initiateWithdrawal();
        break;
      case "home":
        delete userState[chatId];
        startGameMenu(chatId);
        break;
      case "games":
        const message = "Доступные игры:";

        const options = {
          reply_markup: JSON.stringify({
            keyboard: [
              [{ text: "🎲 Dice" }],
              [{ text: "🏀 Basketball" }],
              [{ text: "🙅‍♂️ Cancel" }],
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
        showReferralSystem(chatId);
        break;
      case "cancel":
        delete userState[chatId];
        bot.sendMessage(chatId, "Вы отменили текущее действие.");
        break;
      default:
        const errorMessage = "Неизвестный запрос.";
        bot.sendMessage(chatId, errorMessage);
    }
  });

  bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    switch (text) {
    }
  });
};
start();

bot.on("polling_error", (error) => {
  console.error(`Polling error: ${error.message}`);
});

module.exports = { handleBasketballGame, startBasketballGame, startGameMenu };
