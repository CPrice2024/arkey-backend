require("dotenv").config();

const { Telegraf, Markup, session } =
  require("telegraf");

const User =
  require("../models/User");

const Deposit =
  require("../models/Deposit");

const Withdrawal =
  require("../models/Withdrawal");  



const bot = new Telegraf(
  process.env.BOT_TOKEN
);



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


const depositNumbers = [
  "0911223344",
  "0922334455",
  "0933445566",
  "0944556677",
  "0955667788",
];



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

const languageKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("🇬🇧 English", "lang_en"),
  ],
  [
    Markup.button.callback("🇪🇹 አማርኛ", "lang_am"),
  ],
  [
    Markup.button.callback("🌍 Afaan Oromoo", "lang_om"),
  ],
]);


bot.start(async (ctx) => {

  try {

    console.log("🔥 /start received");
    console.log("Telegram ID:", ctx.from.id);

    const telegramId = String(ctx.from.id);

    const existingUser =
      await User.findOne({ telegramId });

    console.log("User:", existingUser);

    if (!existingUser) {

      return ctx.reply(
        "🌍 Please select your language",
        languageKeyboard
      );

    }

    return ctx.reply(
      `🎰 Welcome Back ${existingUser.firstName}

🎮 Welcome to Arkey Games!🎮 Welcome to Arkey Games!

Play exciting casino games directly inside Telegram.

◈ Balance:
${existingUser.balance} Birr`,
      Markup.keyboard([
        ["◈ Balance", "◉ Deposit"],
        ["⇧ Withdraw", "▣ Play Game"],
        ["◌ Change Language", "🌍 Language"],
        ["◍ Support"]
      ]).resize()
    );

  } catch (err) {

    console.log("START ERROR");
    console.log(err);

    return ctx.reply("❌ Start failed");
  }

});

bot.action("lang_en", async (ctx) => {

  ctx.session.language = "en";

  await ctx.answerCbQuery();

  await ctx.reply(
    "🇬🇧 English selected.\n\nPlease register to continue.",
    Markup.keyboard([
      ["✅ Register"]
    ]).resize()
  );

});


bot.action("lang_am", async (ctx) => {

  ctx.session.language = "am";

  await ctx.answerCbQuery();

  await ctx.reply(
    "🇪🇹 ቋንቋ ተመርጧል።\n\nለመቀጠል ይመዝገቡ።",
    Markup.keyboard([
      ["✅ Register"]
    ]).resize()
  );

});


bot.action("lang_om", async (ctx) => {

  ctx.session.language = "om";

  await ctx.answerCbQuery();

  await ctx.reply(
    "🌍 Afaan filatame.\n\nGalmaa'uuf itti fufi.",
    Markup.keyboard([
      ["✅ Register"]
    ]).resize()
  );

});


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

🎮 You're all set!

Tap "▣ Play Game" to start playing instantly.`,

      Markup.keyboard([
        ["◈ Balance", "◉ Deposit"],
        ["⇧ Withdraw", "▣ Play Game"],
        ["◌ Change language", "🌍 Language"],
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

const withdrawalNumber =
  "WD-" +
  Date.now() +
  "-" +
  Math.floor(Math.random() * 10000);

await Withdrawal.create({
  withdrawalNumber,
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
${amount} Birr

💳 Remaining Balance:
${user.balance} Birr

⏳ Your withdrawal request has been received.

We'll notify you once it has been processed.
`);
}

    if (!user) {
      return ctx.reply("❌ Please register first.");
    }



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
💰 Amount: ${deposit.amount} Birr
🧾 Transaction ID: ${transactionId}

✅ Deposit request received.

⏳ Your payment is being verified.

You'll receive a notification as soon as it's approved.
`);

      return;
    }

  } catch (error) {

    console.log(error);

    ctx.reply("❌ Deposit failed");
  }
});



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
      `💰 Current Balance:
${user.balance} Birr`
    );

  } catch (error) {

    console.log(error);

    ctx.reply(
      "❌ Failed to load balance"
    );
  }
});



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

bot.hears("▣ Play Game", async (ctx) => {

  await ctx.replyWithPhoto(
    {
      source: "./assets/arkey-banner.png",
    },
    {
      caption:
`🎮 *Welcome to Arkey Games*

🔥 100+ Premium Casino Games
💸 Fast ETB Withdrawals
⚡ Play instantly inside Telegram

👇 Tap the button below to start playing.`,

      parse_mode: "Markdown",

      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.webApp(
            "🚀 Play Now",
            "https://arkey-frontend.vercel.app/game"
          )
        ]
      ]).reply_markup
    }
  );

});


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


bot.hears("◌ Live Matches",
(ctx) => {

  ctx.reply(`
⚽ Live Matches
`);
});


bot.hears("🌍 Language", async (ctx) => {
  await ctx.reply(
    "🌍 Please select your language",
    languageKeyboard
  );
});

bot.hears("◍ Support",
(ctx) => {

  ctx.reply(`
🆘 Support
Need help?

Need help?

📩 Contact Support:
https://t.me/arkeybet

🎮 Enjoy playing with Arkey Games!
`);
});

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

console.log("START_BOT =", process.env.START_BOT);
console.log("BOT_TOKEN exists =", !!process.env.BOT_TOKEN);
const enableBot =
  process.env.START_BOT === "true" &&
  !!process.env.BOT_TOKEN;

if (enableBot) {
  bot.launch();

  console.log("🤖 Arkey Bet Telegram Bot Running");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
} else {
  console.log("⚠️ Telegram Bot Disabled");
}

module.exports = bot;