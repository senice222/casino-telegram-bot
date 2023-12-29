const {User} = require("../models/UserModel");
const {Dice} = require("../models/CreateDiceGameModel");
const mongoose = require("mongoose");

async function startCreateDiceGame(bot, chatId) {
    try {
        const user = await User.findOne({id: chatId});
        const createGameMessage = `➕ Создание игры в 🎲 DICE\n\n— Минимум: 1 $\n— Баланс: ${user.balance} $\n\nℹ️ Введите размер ставки и название игры (разделенные пробелом, например, "10 MyGame")`;
        bot.sendMessage(chatId, createGameMessage);

        bot.once("text", (msg) => {
            const userId = msg.from.id;
            const [amount, gameName] = msg.text.split(/\s+/);
            createDiceGame(bot, userId, amount, gameName);
        });
    } catch (e) {
        console.log(e);
    }
}

async function createDiceGame(bot, userId, amount, gameName) {
    try {
        const user = await User.findOne({id: userId});

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
            name: gameName,
            ownerId: userId,
            amount,
            users: [userId],
            choices: [],
            status: "pending",
        });
        await doc.save();

        const successMessage = "🎲 Игра создана!";

        const inlineKeyboard = [
            [{text: "⌛ Ожидание", callback_data: "waiting"}],
            [{text: "👥 Количество участников 1/2", callback_data: "participants"}],
            [{text: "🚶‍♂️ Покинуть", callback_data: "leaveDiceGame"}],
        ];

        const options = {
            reply_markup: {
                inline_keyboard: inlineKeyboard,
            },
        };

        bot.sendMessage(userId, successMessage, options);
    } catch (error) {
        console.error(`Помилка при створенні гри: ${error}`);
        const errorMessage = "Пожалуйста, проверьте правильность заполнения формы.";
        bot.sendMessage(userId, errorMessage);
        startCreateDiceGame(bot, userId);
    }
}

async function leaveDiceGame(bot, chatId) {
    const message = "Доступные игры:";

    try {
        const existingGame = await Dice.findOneAndDelete({ownerId: chatId});
        if (existingGame) {
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
    const games = await Dice.find({status: "pending"});
    if (games.length === 0) {
        bot.sendMessage(chatId, "Нет доступных игр.");
        return;
    }

    const Keyboard = games.map((game) => [
        {
            text: `🎲 ${game.name} - ${game.amount}$`,
        },
    ]);

    Keyboard.push([{text: "⬅️ Назад"}]);

    const options = {
        reply_markup: {
            keyboard: Keyboard,
            resize_keyboard: true,
            one_time_keyboard: true,
        },
    };

    bot.sendMessage(chatId, "Выберите игру для подключения:", options);
}

async function rollDice(bot, userIDs, userChoice) {
    const emoji = userChoice === "guessMore" ? "⬆️" : "⬇️";
    const apiUrl = `https://api.telegram.org/bot${process.env.TOKEN}/sendDice?chat_id=${userIDs}`;
    const choice = userChoice.join('')

    try {
        const response = await fetch(apiUrl, {method: "POST"});
        const data = await response.json();
        if (data.ok && data.result) {
            const diceValue = data.result.dice.value;
            setTimeout(() => {
                const resultMessages = userIDs.map(userID => {
                    let resultMessage = "";
                    let isWinner = false;
                    if ((choice === "guessMore" && diceValue > 3)) {
                        resultMessage = `Поздравляем! Вы угадали! Кубик: 🎲${diceValue} ${emoji}`;
                        isWinner = true;
                    } else {
                        resultMessage = `Увы, вы не угадали. Кубик: 🎲${diceValue} ${emoji}`;
                    }

                    const opts = {
                        reply_markup: JSON.stringify({
                            inline_keyboard: [
                                [{text: "На главную", callback_data: "home"}],
                            ],
                        }),
                    };
                    bot.sendMessage(userID, resultMessage, opts);
                    return {userID, isWinner};
                });
                console.log(resultMessages);
            }, 4200);
        } else {
            console.error("Failed to get dice value:", data);
        }
    } catch (error) {
        console.error("Error fetching dice value:", error);
    }
}

function validateSetUserVariants(game, userId, choice) {
    if (!game) {
        console.error(`No game found for userId: ${userId}`);
        return;
    }
    if (game.choices.some(item => item[userId])) {
        bot.sendMessage(userId, "Ви вже зробили вибір.");
        return;
    }
    if (game.choices.some(userChoice => userChoice[userId] === choice)) {
        bot.sendMessage(userId, "Ви вже обрали цей варіант раніше.");
        return;
    }
    if (game.choices.some(userChoice => Object.values(userChoice).includes(choice))) {
        bot.sendMessage(userId, "Цей варіант вже був обраний іншим користувачем.");
    }
}

async function setUserChoice(bot, data, userId) {
    const parts = data.split('_');
    const choice = parts[0];
    const gameId = parts[1];
    const game = await Dice.findById(gameId);

    validateSetUserVariants(game, userId, choice);

    const userChoiceIndex = game.choices.findIndex(userChoice => Object.keys(userChoice)[0] === userId);
    if (userChoiceIndex === -1) {
        game.choices.push({ [userId]: [choice] });
    } else {
        game.choices[userChoiceIndex][userId].push(choice);
    }

    const firstId = game.users[0].toString();
    const secondId = game.users[1].toString();
    const isUserHasChoice = game.choices.some(item => Object.keys(item).includes(firstId) || Object.keys(item).includes(secondId));

    if (isUserHasChoice) {
        const currentUserChoice = game.choices.find(item => Object.keys(item).includes(userId.toString()));
        const userIDs = [firstId, secondId];
        const userChoice = currentUserChoice[userId];
        rollDice(bot, userIDs, userChoice);
    }

    await game.save();
    bot.sendMessage(userId, "Ваш вибір зроблено!");
}

async function sendMessageToPlayer(bot, playerId, message, opts = {}) {
    bot.sendMessage(playerId, message, opts);
}

async function startDiceGame(bot, chatId, gameName) {
    const game = await Dice.findOne({name: gameName})
    game.users.push(chatId)
    const isPlayer1 = game.users[0] === chatId;
    const isPlayer2 = game.users[1] === chatId;

    if ((isPlayer1 || isPlayer2) && game.status === "pending") {
        game.status = "playing";
        await game.save();

        const player1Message = `Игра начинается! Удачи вам, игрок ${game.users[0]}!`;
        const player2Message = `Игра начинается! Удачи вам, игрок ${game.users[1]}!`;

        await sendMessageToPlayer(bot, game.users[0], player1Message);
        await sendMessageToPlayer(bot, game.users[1], player2Message);

        const opts = {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [
                        {text: "Больше", callback_data: `guessMore_${game._id}`},
                        {text: "Меньше", callback_data: `guessLess_${game._id}`}
                    ]
                ],
            }),
        };

        const message = "Угадайте, будет ли выпадение кубика больше или меньше 3.";

        await sendMessageToPlayer(bot, game.users[0], message, opts);
        await sendMessageToPlayer(bot, game.users[1], message, opts);
    } else {
        bot.sendMessage(chatId, "Вы не участвуете в текущей игре.");
    }
}

module.exports = {
    rollDice,
    startDiceGame,
    startCreateDiceGame,
    leaveDiceGame,
    availableDiceGames,
    setUserChoice,
};
