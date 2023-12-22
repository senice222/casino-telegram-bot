const { User } = require("../models/UserModel");
const { Dice } = require("../models/CreateDiceGameModel");
const { startGameMenu } = require("../index");

function startDiceGame(bot, chatId) {
  const opts = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: "Больше", callback_data: "guessMore" }],
        [{ text: "Меньше", callback_data: "guessLess" }],
      ],
    }),
  };
  bot.sendMessage(
    chatId,
    "Угадайте, будет ли выпадение кубика больше или меньше 3.",
    opts
  );
}

async function rollDice(bot, chatId, userChoice) {
  const emoji = userChoice === "more" ? "⬆️" : "⬇️";

  const apiUrl = `https://api.telegram.org/bot${process.env.TOKEN}/sendDice?chat_id=${chatId}`;
  try {
    const response = await fetch(apiUrl, { method: "POST" });
    const data = await response.json();

    if (data.ok && data.result) {
      const diceValue = data.result.dice.value;

      setTimeout(() => {
        let resultMessage = "";
        if (
          (userChoice === "more" && diceValue > 3) ||
          (userChoice === "less" && diceValue <= 3)
        ) {
          resultMessage = `Поздравляем! Вы угадали! Кубик: 🎲${diceValue} ${emoji}`;
        } else {
          resultMessage = `Увы, вы не угадали. Кубик: 🎲${diceValue} ${emoji}`;
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
    } else {
      console.error("Failed to get dice value:", data);
    }
  } catch (error) {
    console.error("Error fetching dice value:", error);
  }
}

async function startCreateDiceGame(bot, chatId) {
  try {
    const user = await User.findOne({ id: chatId });
    const createGameMessage = `➕ Создание игры в 🎲 DICE\n\n— Минимум: 1 $\n— Баланс: ${user.balance} $\n\nℹ️ Введите размер ставки`;
    bot.sendMessage(chatId, createGameMessage);

    bot.once("text", (msg) => {
      const userId = msg.from.id;
      const amount = msg.text;
      createDiceGame(bot, userId, amount);
    });
  } catch (e) {
    console.log(e);
  }
}

async function createDiceGame(bot, userId, amount) {
  try {
    const user = await User.findOne({ id: userId });

    if (/^🙅‍♂️ Cancel$/i.test(amount)) {
      return;
    }

    if (
      isNaN(amount) ||
      parseFloat(amount) <= 0 ||
      parseFloat(amount) > user.balance
    ) {
      const incorrectAmountMessage = `Ошибка: Неверное значение для ставки: ${amount}`;
      bot.sendMessage(userId, incorrectAmountMessage);

      startCreateDiceGame(bot, userId);
      return;
    }

    const doc = new Dice({
      ownerId: userId,
      amount,
      users: [userId],
      status: "pending",
    });
    await doc.save();
    const successMessage = "🎲 Игра создана!";

    const inlineKeyboard = [
      [{ text: "⌛ Ожидание", callback_data: "waiting" }],
      [{ text: "👥 Количество участников 1/2", callback_data: "participants" }],
      [{ text: "🚶‍♂️ Покинуть", callback_data: "leaveDiceGame" }],
    ];

    const options = {
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    };

    bot.sendMessage(userId, successMessage, options);
  } catch (error) {
    console.error(`Помилка при створенні гри: ${error}`);
  }
}

async function leaveDiceGame(bot, chatId) {
  const message = "Доступные игры:";

  try {
    const existingGame = await Dice.findOneAndDelete({ ownerId: chatId });
    if (existingGame) {
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
      bot.sendMessage(chatId, message, options);
    } else {
      const noGameMessage = "У вас нет активных игр для завершения.";
      bot.sendMessage(chatId, noGameMessage);
    }
  } catch (error) {
    console.error(`Помилка при завершенні гри: ${error}`);
  }
}

async function availableDiceGames(bot, chatId) {
  console.log(chatId)
  const games = await Dice.find({ status: "pending" });

  if (games.length === 0) {
    bot.sendMessage(chatId, "Нет доступных игр.");
    return;
  }

  const inlineKeyboard = games.map((game, index) => [
    {
      text: `🎲 Game ${index + 1} - ${game.amount}$`,
      callback_data: `join_dice_game_${game._id}`,
    },
  ]);
  inlineKeyboard.push([{ text: "⬅️ Назад", callback_data: "games" }]);
  const options = {
    reply_markup: {
      inline_keyboard: inlineKeyboard,
    },
  };

  bot.sendMessage(chatId, "Выберите игру для подключения:", options);
}
async function handleJoinGameCallback(chatId, data) {
  const gameId = data.replace('join_game_', '');

  const game = await Dice.findById(gameId);
  console.log(game, chatId);
  // if (game && game.status === 'pending') {
  //   const player1Message = `Игра начинается! Удачи вам, игрок ${game.users[0]}!`;
  //   const player2Message = `Игра начинается! Удачи вам, игрок ${game.users[1]}!`;

  //   bot.sendMessage(game.users[0], player1Message);
  //   bot.sendMessage(game.users[1], player2Message);

  // } else {
  //   const errorMessage = 'Извините, игра не может быть начата. Возможно, она уже началась или была отменена.';
  //   bot.sendMessage(chatId, errorMessage);
  // }
}

module.exports = {
  rollDice,
  startDiceGame,
  startCreateDiceGame,
  leaveDiceGame,
  availableDiceGames,
  handleJoinGameCallback,
};
