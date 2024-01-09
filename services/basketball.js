const {User} = require("../models/UserModel");
const {Basketball} = require("../models/BasketballGame");
const {isValidChoice} = require("../validations/diceGameValidator");
const {toWinner, toLooser} = require("../utils");

async function availableBasketballGames(bot, chatId) {
    try {
        const games = await Basketball.find({status: "pending"})
        if (games.length === 0) {
            bot.sendMessage(chatId, "Нет доступных игр.");
            return;
        }

        const Keyboard = games.map(game => [
            {
                text: `🏀 ${game.name} - ${game.amount}$`,
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
    } catch (e) {
        console.log("Cannot find bb games:", e)
    }
}

async function startCreateBasketballGame(bot, chatId) {
    try {
        const user = await User.findOne({id: chatId});
        const createGameMessage = `➕ Создание игры в 🏀 Basketball\n\n— Минимум: 1 $\n— Баланс: ${user.balance} $\n\nℹ️ Введите размер ставки и название игры (разделенные пробелом, например, "10 MyGame")`;
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
            await createBasketballGame(bot, userId, amount, gameName)
        });
    } catch (e) {
        console.log(e);
    }
}

async function createBasketballGame(bot, userId, amount, gameName) {
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
            startCreateDiceGame(bot, userId);
            return;
        }

        const doc = new Basketball({
            name: gameName,
            ownerId: userId,
            amount,
            users: [userId],
            choices: [],
            status: "pending",
        });
        await doc.save();

        const successMessage = "🏀 Игра создана!";

        const inlineKeyboard = [
            [{text: "⌛ Ожидание", callback_data: "waiting"}],
            [{text: "👥 Количество участников 1/2", callback_data: "participants"}],
            [{text: "🚶‍♂️ Покинуть", callback_data: "leaveBBGame"}],
        ];

        const options = {
            reply_markup: {
                inline_keyboard: inlineKeyboard,
            },
        };

        bot.sendMessage(userId, successMessage, options);
    } catch (error) {
        console.error(error);
        const errorMessage = "Пожалуйста, проверьте правильность заполнения формы.";
        bot.sendMessage(userId, errorMessage);
        startCreateBasketballGame(bot, userId);
    }
}

async function startBasketballGame(bot, chatId, gameName) {
    const game = await Basketball.findOne({name: gameName})
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
                            {text: "В кольцо", callback_data: `Scored_${game._id}`},
                            {text: "Мимо", callback_data: `Away_${game._id}`}
                        ]
                    ],
                }),
            };

            const message = "Угадайте, попадет ли мяч в кольцо или нет.";

            bot.sendMessage(game.users[0], message, opts);
            bot.sendMessage(game.users[1], message, opts);
        } else {
            bot.sendMessage(chatId, "Вы не участвуете в текущей игре.");
        }
    } else {
        bot.sendMessage(chatId, "У вас недостаточно средств.");
    }
}

async function handleBasketballGame(bot, game, data) {
    try {
        const diceValue = data.result.dice.value;
        const choiceList = game.choices.map(item => {
            const userId = Object.keys(item)[0];
            const choiceValue = Object.values(item)[0];
            return [{[userId]: choiceValue.toString()}];
        });
        const flattenedList = choiceList.flat();
        let obj = { winner: null }

        const options = {
            reply_markup: JSON.stringify({
                inline_keyboard: [[{text: "На главную", callback_data: "home"}]],
            }),
        };

        setTimeout(async () => {
            flattenedList.forEach(userChoice => {
                const userId = Object.keys(userChoice)[0];
                const choice = Object.values(userChoice)[0];
                switch (choice) {
                    case 'Scored':
                        if (diceValue >= 4) {
                            bot.sendMessage(userId, `You guessed correctly!`, options)
                            obj.winner = userId
                            toWinner(userId, game)
                        } else {
                            bot.sendMessage(userId, `You guessed incorrectly!`, options)
                            toLooser(userId, game)
                        }
                        break;
                    case 'Away':
                        if (diceValue < 4) {
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
        }, 5200);
    } catch (error) {
        console.error("Error fetching dice value:", error);
    }
}

async function setBasketballGameChoice(bot, data, userId) {
    const parts = data.split('_');
    const choice = parts[0];
    const gameId = parts[1];
    const game = await Basketball.findById(gameId);

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

            const apiUrl = `https://api.telegram.org/bot${process.env.TOKEN}/sendDice?chat_id=${userIDs}&emoji=🏀`;
            const response = await fetch(apiUrl, {method: "POST"});
            const data = await response.json();
            handleBasketballGame(bot, game, data);
        }
        bot.sendMessage(userId, "Ваш вибір зроблено!");
    }
}

module.exports = {
    startBasketballGame,
    startCreateBasketballGame,
    handleBasketballGame,
    availableBasketballGames,
    setBasketballGameChoice
}