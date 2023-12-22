const { User } = require("../models/UserModel");
const { CryptoPay, Assets } = require("@foile/crypto-pay-api");
require("dotenv").config();

function generateUniqueId() {
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(7);

  return `${timestamp}-${randomString}`;
}

// CREATE INVOICE
async function createInvoice(chatId, bot, userId, asset, amount) {
  try {
    const user = await User.findOne({ telegramId: userId });

    if (!user) {
      throw new Error("User not found");
    }

    const cryptoPay = new CryptoPay(process.env.WALLET);

    const invoiceResponse = await cryptoPay.createInvoice(asset, amount, {
      description: "money",
    });

    if (invoiceResponse) {
      user.balance += amount;
    }

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

    return bot.sendMessage(
      chatId,
      `Payment link: ${invoiceResponse.pay_url}`,
      opts
    );
  } catch (error) {
    console.error("Error creating invoice:", error.message);
  }
}

async function requestAmountCrypto(bot, chatId, userId, currency) {
  const cryptoValues = {
    topup_btc: Assets.BTC,
    topup_eth: Assets.ETH,
    topup_usdt: Assets.USDT,
    topup_ton: Assets.TON,
  };

  return bot
    .sendMessage(chatId, "Введите количество криптовалюты:", {
      reply_markup: { force_reply: true },
    })
    .then(() => {
      return new Promise((resolve) => {
        const timeoutDuration = 30000;
        let timeout;

        const replyListener = (replyMessage) => {
          const inputText = replyMessage.text.trim();

          if (/^\d+(\.\d+)?$/.test(inputText)) {
            const amount = parseFloat(inputText);
            if (amount >= 0.5) {
              createInvoice(chatId, bot, userId, cryptoValues[currency], amount);
              bot.removeListener("message", replyListener);
              clearTimeout(timeout);
              resolve();
            } else {
              bot.sendMessage(
                chatId,
                "Минимальная сумма для ввода - 0.5 криптовалюты. Пожалуйста, введите корректное количество"
              );
            }
          } else {
            bot.sendMessage(
              chatId,
              "Введите корректное количество криптовалюты (должно быть числом):",
              {
                reply_markup: { force_reply: true },
              }
            );
          }
        };
        bot.on("message", replyListener);
        timeout = setTimeout(() => {
          bot.removeListener("message", replyListener);
          bot.sendMessage(
            chatId,
            "Время ожидания ответа истекло. Пожалуйста, начните снова."
          );
          startGameMenu(chatId);
        }, timeoutDuration);
      });
    })
    .catch((error) => {
      console.error("Error sending force reply message:", error);
    });
}

// GET USER MONEY FROM BOT (TRANSFER)

async function transferCoins(userId, asset, amount) {
  try {
    const user = await User.findOne({ telegramId: userId });

    if (!user) {
      throw new Error("User not found");
    }
    const uniqueId = generateUniqueId();
    const cryptoPay = new CryptoPay(
      "138296:AAVn3ThC4EYGkMhQt1u1P1Hok8heci8BwvR"
    );

    const transfer = await cryptoPay.transfer(
      userId,
      Assets.USDT,
      amount,
      uniqueId,
      { comment: "donate" }
    );

    console.log("Transfer successful:", transfer);
  } catch (error) {
    console.error("Error transferring coins:", error.message);
  }
}

async function withdrawalAmount(bot, chatId, userId) {
  return bot
    .sendMessage(chatId, "Какую сумму вы хотите вывести? (Только цифры)", {
      reply_markup: { force_reply: true },
    })
    .then(() => {
      return new Promise((resolve) => {
        const timeoutDuration = 30000;
        let timeout;

        const replyListener = (replyMessage) => {
          const inputText = replyMessage.text.trim();

          if (/^\d+(\.\d+)?$/.test(inputText)) {
            const amount = parseFloat(inputText);
            if (amount >= 5) {
              console.log(amount);
              bot.removeListener("message", replyListener);
              clearTimeout(timeout);
              resolve();
            } else {
              bot.sendMessage(
                chatId,
                "Минимальная сумма для вывода - 5$. Пожалуйста, введите корректное количество",
                {
                  reply_markup: { force_reply: true },
                }
              );
            }
          } else {
            bot.sendMessage(
              chatId,
              "Введите корректное количество $ (должно быть числом и больше 5):",
              {
                reply_markup: { force_reply: true },
              }
            );
          }
        };

        bot.on("message", replyListener);

        timeout = setTimeout(() => {
          bot.removeListener("message", replyListener);
          bot.sendMessage(
            chatId,
            "Время ожидания ответа истекло. Пожалуйста, начните снова."
          );
        }, timeoutDuration);
      });
    })
    .catch((error) => {
      console.error("Error sending force reply message:", error);
    });
}
module.exports = { requestAmountCrypto, transferCoins, withdrawalAmount,  };
