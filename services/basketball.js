const {User} = require("../models/UserModel");
const {Basketball} = require("../models/BasketballGame");
const {Dice} = require("../models/DiceGame");


async function availableBasketballGames(bot, chatId) {
    try {
        const games = await Basketball.find({status: "pending"})
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
        console.log(doc)
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

async function handleBasketballGame(bot, chatId, userChoice) { // gameplay
    try {
        const data = await bot.sendDice(chatId, {emoji: "🏀"});
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
                        [{text: "Новая игра", callback_data: "newGame"}],
                        [{text: "На главную", callback_data: "home"}],
                    ],
                }),
            };

            bot.sendMessage(chatId, resultMessage, opts);
        }, 4200);
    } catch (error) {
        console.error("Error fetching dice value:", error);
    }
}

function startBasketballGame(bot, chatId, userState) { // setUserChoice
    const opts = {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: "Да", callback_data: "yesBB"}],
                [{text: "Нет", callback_data: "noBB"}],
            ],
        }),
    };
    userState[chatId] = "Basketball";
    bot.sendMessage(chatId, "Попадет ли мяч в кольцо?", opts);
}

module.exports = {
    startBasketballGame,
    startCreateBasketballGame,
    handleBasketballGame,
    availableBasketballGames
}