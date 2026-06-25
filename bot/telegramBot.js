require("dotenv").config();

const { Telegraf, Markup, session } =
  require("telegraf");

const User =
  require("../models/User");

const Deposit =
  require("../models/Deposit");

const Withdrawal =
  require("../models/Withdrawal");  

// =======================================
// BOT
// =======================================

const bot = new Telegraf(
  process.env.BOT_TOKEN
);

// =======================================
// SESSION
// =======================================

bot.use(
  session({
    defaultSession: () => ({
      waitingDeposit: false,
      waitingAmount: false,
      waitingTransactionId: false,

      waitingWithdrawAmount: false,
      waitingWithdrawAccount: false,

      withdrawMethod: "",
      withdrawAmount: "",

      depositMethod: "",
      depositAmount: "",

      depositNumbers: []
    })
  })
);

// =======================================
// ETHIOPIAN DEPOSIT NUMBERS
// =======================================

const depositNumbers = [
  "0911223344",
  "0922334455",
  "0933445566",
  "0944556677",
  "0955667788",
  "0966778899",
  "0977889900",
  "0988990011",
  "0999001122",
  "0910112233"
];

// =======================================
// HELPERS
// =======================================

function getRandomNumbers(count = 5) {

  const shuffled =
    [...depositNumbers];

  for (
    let i = shuffled.length - 1;
    i > 0;
    i--
  ) {

    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [shuffled[i], shuffled[j]] =
      [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

// =======================================
// START
// =======================================

bot.start(async (ctx) => {

  const telegramId =
    String(ctx.from.id);

  const existingUser =
    await User.findOne({
      telegramId
    });

  if (!existingUser) {

    await ctx.reply(
      `🎰 Welcome to Arkey Bet

🌐 Website:
https://arkey.bet

To continue please register.`,
      Markup.keyboard([
        ["✅ Register"]
      ]).resize()
    );

    return;
  }

  await ctx.reply(
    `🎰 Welcome Back ${existingUser.firstName}

🌐 https://arkey.bet

◈ Balance:
${existingUser.balance} ETB`,
Markup.keyboard([
  ["◈ Balance", "◉ Deposit"],
  ["⇧ Withdraw", "▣ Play Game"],
  ["◌ Live Matches", "⌘ My Bets"],
  ["◍ Support"]
]).resize()
  );
});

// =======================================
// REGISTER
// =======================================

bot.hears("✅ Register",
async (ctx) => {

  await ctx.reply(
    "📱 Please share your phone number",

    Markup.keyboard([
      [
        Markup.button.contactRequest(
          "📲 Share Phone Number"
        )
      ]
    ])
      .resize()
      .oneTime()
  );
});

// =======================================
// CONTACT
// =======================================
// =======================================
// RECEIVE PHONE NUMBER
// =======================================

bot.on("contact", async (ctx) => {
  try {

    const phone =
      ctx.message.contact.phone_number;

    const telegramId =
      String(ctx.from.id);

    const existingUser =
      await User.findOne({
        telegramId
      });

    if (existingUser) {
      return ctx.reply(
        "✅ You are already registered."
      );
    }

    const newUser = new User({
      telegramId,
      username:
        ctx.from.username ||
        `user_${telegramId}`,
      firstName:
        ctx.from.first_name || "",
      lastName:
        ctx.from.last_name || "",
      phone
    });

    await newUser.save();

    await ctx.reply(
      `✅ Registration Successful

👤 Name: ${newUser.firstName}
📱 Phone: ${phone}

🌐 https://arkey.bet`,
      Markup.keyboard([
        ["◈ Balance", "◉ Deposit"],
        ["⇧ Withdraw", "▣ Play Game"],
        ["◌ Live Matches", "⌘ My Bets"],
        ["◍ Support"]
      ]).resize()
    );

  } catch (error) {

    console.log(error);

    ctx.reply(
      "❌ Registration failed"
    );
  }
});

bot.on("text", async (ctx, next) => {

  // ignore menu buttons
if (
  ctx.message.text === "◈ Balance" ||
  ctx.message.text === "◉ Deposit" ||
  ctx.message.text === "⇧ Withdraw" ||
  ctx.message.text === "◌ Live Matches" ||
  ctx.message.text === "⌘ My Bets" ||
  ctx.message.text === "▣ Play Game" ||
  ctx.message.text === "◍ Support" ||
  ctx.message.text === "✅ Register"
) {
  return next();
}

  try {

    const telegramId = String(ctx.from.id);

    const user = await User.findOne({ telegramId });


    if (
  ctx.session.waitingWithdrawAmount
) {

  ctx.session.withdrawAmount =
    Number(ctx.message.text);

  ctx.session.waitingWithdrawAmount =
    false;

  ctx.session.waitingWithdrawAccount =
    true;

  return ctx.reply(
    "Enter Telebirr/CBE account number:"
  );
}

if (
  ctx.session.waitingWithdrawAccount
) {

  const amount =
    Number(
      ctx.session.withdrawAmount
    );

  if (
    amount > user.balance
  ) {

    ctx.session.waitingWithdrawAccount =
      false;

    return ctx.reply(
      "❌ Insufficient Balance"
    );
  }

user.balance =
  Number(user.balance) -
  Number(amount);

await user.save();

await Withdrawal.create({
  telegramId: user.telegramId,
  username: user.username,
  phone: user.phone,
  method: ctx.session.withdrawMethod,
  amount,
  accountNumber: ctx.message.text,
  status: "pending"
});

  ctx.session.waitingWithdrawAccount =
    false;

  ctx.session.withdrawMethod = "";

  ctx.session.withdrawAmount = "";

return ctx.reply(`
✅ Withdrawal Submitted

💰 Amount:
${amount} ETB

💳 Remaining Balance:
${user.balance} ETB

⏳ Waiting For Admin Approval
`);
}

    if (!user) {
      return ctx.reply("❌ Please register first.");
    }

    // ===================================
    // WAITING AMOUNT
    // ===================================

    if (ctx.session.waitingAmount) {

      ctx.session.depositAmount = ctx.message.text;

      ctx.session.waitingAmount = false;

      ctx.session.waitingTransactionId = true;

      return ctx.reply(`
✅ Amount Received

Now send Transaction ID.

Example:
TRX123456
`);
    }

    // ===================================
    // WAITING TRANSACTION ID
    // ===================================

    if (ctx.session.waitingTransactionId) {

      const transactionId = ctx.message.text;

      const randomNumber =
        ctx.session.depositNumbers[
          Math.floor(
            Math.random() *
            ctx.session.depositNumbers.length
          )
        ];

      const deposit = new Deposit({
        telegramId,
        username:
  user.username ||
  `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
  "Telegram User",
        phone: user.phone,
        method: ctx.session.depositMethod,
        amount: Number(ctx.session.depositAmount),
        transactionId,
        depositNumber: randomNumber,
        status: "pending"
      });

      await deposit.save();

    ctx.session.waitingAmount = false;
    ctx.session.waitingTransactionId = false;
    ctx.session.depositMethod = "";
    ctx.session.depositAmount = "";
    ctx.session.depositNumbers = []; 

      await ctx.reply(`
✅ Deposit Submitted

💳 Method: ${deposit.method}
💰 Amount: ${deposit.amount} ETB
🧾 Transaction ID: ${transactionId}

⏳ Waiting for admin approval.
`);

      return;
    }

  } catch (error) {

    console.log(error);

    ctx.reply("❌ Deposit failed");
  }
});

// =======================================
// BALANCE
// =======================================

bot.hears("◈ Balance",
async (ctx) => {

  try {

    const telegramId =
      String(ctx.from.id);

    const user =
      await User.findOne({
        telegramId
      });

    if (!user) {
      return ctx.reply(
        "❌ Please register first."
      );
    }

    ctx.reply(
      `💰 Your Balance:
${user.balance} ETB`
    );

  } catch (error) {

    console.log(error);

    ctx.reply(
      "❌ Failed to load balance"
    );
  }
});

// =======================================
// DEPOSIT
// =======================================

// =======================================
// DEPOSIT MENU
// =======================================

bot.hears("◉ Deposit", async (ctx) => {

  await ctx.reply(
    "💳 Choose Deposit Method",
    Markup.inlineKeyboard([
      [
        Markup.button.callback(
          "📱 Telebirr",
          "deposit_telebirr"
        ),

        Markup.button.callback(
          "🏦 CBE Birr",
          "deposit_cbe"
        )
      ]
    ])
  );
});

// =======================================
// TELEBIRR
// =======================================

bot.action("deposit_telebirr", async (ctx) => {

  const numbers = getRandomNumbers();

  ctx.session.depositNumbers = numbers;

  ctx.session.depositMethod = "telebirr";

  let text = `
📱 TELEBIRR DEPOSIT

Send payment to ONE of these numbers:

`;

  numbers.forEach((num, index) => {
    text += `${index + 1}. ${num}\n`;
  });

  text += `
━━━━━━━━━━━━━━━

Now send deposit amount.

Example:
500
`;

  ctx.session.waitingAmount = true;

  await ctx.reply(text);
});

// =======================================
// CBE
// =======================================

bot.action("deposit_cbe", async (ctx) => {

  const numbers = getRandomNumbers();

  ctx.session.depositNumbers = numbers;

  ctx.session.depositMethod = "cbe";

  let text = `
🏦 CBE BIRR DEPOSIT

Send payment to ONE of these numbers:

`;

  numbers.forEach((num, index) => {
    text += `${index + 1}. ${num}\n`;
  });

  text += `
━━━━━━━━━━━━━━━

Now send deposit amount.

Example:
1000
`;

  ctx.session.waitingAmount = true;

  await ctx.reply(text);
});

bot.action("withdraw_telebirr", async (ctx) => {

  if (!ctx.session) ctx.session = {};

  ctx.session.withdrawMethod = "telebirr";
  ctx.session.waitingWithdrawAmount = true;

  await ctx.answerCbQuery();

  await ctx.reply(
    "Enter withdrawal amount:"
  );
});

bot.action("withdraw_cbe", async (ctx) => {

  if (!ctx.session) ctx.session = {};

  ctx.session.withdrawMethod = "cbe";
  ctx.session.waitingWithdrawAmount = true;

  await ctx.answerCbQuery();

  await ctx.reply(
    "Enter withdrawal amount:"
  );
});

// ======================================
// PLAY GAME
// ======================================

bot.hears("▣ Play Game", async (ctx) => {

  await ctx.reply(
    "🎰 Open Virtual Casino",
    Markup.inlineKeyboard([
      [
       Markup.button.webApp(
  "🚀 Play Now",
  "https://YOUR-FRONTEND-NGROK.ngrok-free.dev/game"
)
      ]
    ])
  );

});



// =======================================
// WITHDRAW
// =======================================

bot.hears("⇧ Withdraw", async (ctx) => {

  await ctx.reply(
    "Choose Withdrawal Method",
    Markup.inlineKeyboard([
      [
        Markup.button.callback(
          "📱 Telebirr",
          "withdraw_telebirr"
        ),

        Markup.button.callback(
          "🏦 CBE Birr",
          "withdraw_cbe"
        )
      ]
    ])
  );

});

// =======================================
// LIVE MATCHES
// =======================================

bot.hears("◌ Live Matches",
(ctx) => {

  ctx.reply(`
⚽ Live Matches Coming Soon

🌐 https://arkey.bet
`);
});

// =======================================
// MY BETS
// =======================================

bot.hears("⌘ My Bets",
(ctx) => {

  ctx.reply(`
🎫 Bet History Coming Soon

🌐 https://arkey.bet
`);
});

// =======================================
// SUPPORT
// =======================================

bot.hears("◍ Support",
(ctx) => {

  ctx.reply(`
🆘 Support

🌐 Website:
https://arkey.bet

📩 Contact Admin:
https://t.me/arkeybet
`);
});

// =======================================
// HELP
// =======================================

bot.command("help",
(ctx) => {

  ctx.reply(`
📚 Available Commands

/start
/help

Buttons:
Buttons:
◈ Balance
◉ Deposit
⇧ Withdraw
▣ Play Game
◌ Live Matches
⌘ My Bets
◍ Support
`);
});

// =======================================
// LAUNCH
// =======================================

bot.launch();

console.log(
  "🤖 Arkey Bet Telegram Bot Running"
);

// =======================================
// STOP
// =======================================

process.once(
  "SIGINT",
  () => bot.stop("SIGINT")
);

process.once(
  "SIGTERM",
  () => bot.stop("SIGTERM")
);

module.exports = bot;