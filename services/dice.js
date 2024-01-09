const {User} = require("../models/UserModel");
const {Dice} = require("../models/DiceGame");
const {isValidChoice} = require("../validations/diceGameValidator");
const {toWinner, toLooser} = require("../utils");

async function startCreateDiceGame(bot, chatId) {
    try {
        const user = await User.findOne({id: chatId});
        const createGameMessage = `➕ Создание игры в 🎲 DICE\n\n— Минимум: 1 $\n— Баланс: ${user.balance} $\n\nℹ️ Введите размер ставки и название игры (разделенные пробелом, например, "10 MyGame")`;
        const opts = {
            reply_markup: JSON.stringify({
                keyboard: [
                    [{ text: "⬅️ Назад" }],
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
            }),
        };

        bot.sendMessage(chatId, createGameMessage, opts);

        bot.once("text", async (msg) => {
            const text = msg.text
            const userId = msg.from.id;
            if (text === "⬅️ Назад") return
            const [amount, gameName] = text.split(/\s+/);
            await createDiceGame(bot, userId, amount, gameName)
        });
    } catch (e) {
        console.log(e);
    }
}

async function createDiceGame(bot, userId, amount, gameName) {
    try {
        const user = await User.findOne({id: userId});
        if (/^🙅‍♂️ Cancel$/i.test(amount)) return

        if (
            isNaN(amount) ||
            parseFloat(amount) <= 0 ||
            parseFloat(amount) > user.balance
        ) {
            const incorrectAmountMessage = `Ошибка: Неверное значение для ставки: ${amount}`;
            bot.sendMessage(userId, incorrectAmountMessage);
            dice(bot, userId);
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
    const Keyboard = games.map(game => [
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

async function rollDice(bot, game, data) {
    try {
        const diceValue = data.result.dice.value;
        const choiceList = game.choices.map(item => {
            const userId = Object.keys(item)[0];
            const choiceValue = Object.values(item)[0];
            return [{[userId]: choiceValue.toString()}];
        });
        const options = {
            reply_markup: JSON.stringify({
                inline_keyboard: [[{text: "На главную", callback_data: "home"}]],
            }),
        };
        const flattenedList = choiceList.flat();
        let obj = { winner: null }

        setTimeout(async () => {
            flattenedList.forEach(userChoice => {
                const userId = Object.keys(userChoice)[0];
                const choice = Object.values(userChoice)[0];

                switch (choice) {
                    case 'guessMore':
                        if (diceValue > 3) {
                            bot.sendMessage(userId, `You guessed correctly!`, options)
                            obj.winner = userId
                            toWinner(userId, game)
                        } else {
                            bot.sendMessage(userId, `You guessed incorrectly!`, options)
                            toLooser(userId, game)
                        }
                        break;
                    case 'guessLess':
                        if (diceValue < 3) {
                            bot.sendMessage(userId, `You guessed correctly!`, options)
                            obj.winner = userId
                            toWinner(userId, game)
                        } else {
                            bot.sendMessage(userId, `You guessed incorrectly!`, options)
                            toLooser(userId, game)
                        }
                        break;
                    default:
                        console.log(`Unknown choice for user ${userId}`);
                }
            });
            game.status = 'end'
            await game.save()
        }, 4200);
    } catch (error) {
        console.error("Error fetching dice value:", error);
    }
}

async function setDiceUserChoice(bot, data, userId) {
    const parts = data.split('_');
    const choice = parts[0];
    const gameId = parts[1];
    const game = await Dice.findById(gameId);

    if (await isValidChoice(bot, game, userId, choice)) {
        const userChoiceIndex = game.choices.findIndex(userChoice => Object.keys(userChoice)[0] === userId);
        if (userChoiceIndex === -1) {
            game.choices.push({[userId]: [choice]});
        } else {
            game.choices[userChoiceIndex][userId].push(choice);
        }
        await game.save();

        if (game.choices.length === 2) {
            const firstId = game.users[0].toString();
            const secondId = game.users[1].toString();
            const userIDs = [firstId, secondId];

            const apiUrl = `https://api.telegram.org/bot${process.env.TOKEN}/sendDice?chat_id=${userIDs}`;
            const response = await fetch(apiUrl, {method: "POST"});
            const data = await response.json();
            rollDice(bot, game, data);
        }
        bot.sendMessage(userId, "Ваш вибір зроблено!");
    }
}

async function startDiceGame(bot, chatId, gameName) {
    const game = await Dice.findOne({name: gameName})
    const joinedUser = await User.findOne({id: chatId})
    if (joinedUser.balance >= game.amount) {
        game.users.push(chatId)
        const isPlayer1 = game.users[0] === chatId;
        const isPlayer2 = game.users[1] === chatId;
        if ((isPlayer1 || isPlayer2) && game.status === "pending") {
            game.status = "playing";
            await game.save();

            const player1Message = `Игра начинается! Удачи вам, игрок ${game.users[0]}!`;
            const player2Message = `Игра начинается! Удачи вам, игрок ${game.users[1]}!`;

            bot.sendMessage(game.users[0], player1Message);
            bot.sendMessage(game.users[1], player2Message);

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

            bot.sendMessage(game.users[0], message, opts);
            bot.sendMessage(game.users[1], message, opts);
        } else {
            bot.sendMessage(chatId, "Вы не участвуете в текущей игре.");
        }
    } else {
        bot.sendMessage(chatId, "У вас недостаточно средств.");
    }
}

module.exports = {
    startDiceGame,
    startCreateDiceGame,
    leaveDiceGame,
    availableDiceGames,
    setDiceUserChoice,
};
