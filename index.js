
require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");

// .env sozlamalari
const TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 258281288;
const PROFILE_URL = process.env.PROFILE_URL;

// Sozlamalarni tekshirish
if (!TOKEN) {
  throw new Error("BOT_TOKEN .env faylida mavjud emas!");
}

if (
  !PROFILE_URL ||
  !/^https?:\/\/\S+$/i.test(PROFILE_URL)
) {
  throw new Error(
    "PROFILE_URL .env faylida noto'g'ri yoki mavjud emas!"
  );
}

// Botni ishga tushirish
const bot = new TelegramBot(TOKEN, {
  polling: true
});

const DB_FILE = path.join(__dirname, "users.json");

// Foydalanuvchilarni yuklash
function loadUsers() {
  try {
    return JSON.parse(
      fs.readFileSync(DB_FILE, "utf8")
    );
  } catch (error) {
    return {};
  }
}

let users = loadUsers();

// Ma'lumotlarni saqlash
function saveUsers() {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(users, null, 2)
  );
}

// Foydalanuvchini ro'yxatga olish
function registerUser(msg) {
  const id = String(msg.from.id);

  if (!users[id]) {
    users[id] = {
      id: msg.from.id,
      firstName: msg.from.first_name || "Foydalanuvchi",
      username: msg.from.username || "",
      joinedAt: new Date().toISOString(),
      voteClicks: 0
    };
  } else {
    users[id].firstName =
      msg.from.first_name || "Foydalanuvchi";

    users[id].username =
      msg.from.username || "";
  }

  saveUsers();
}

// Asosiy menyu
function mainMenu() {
  return {
    reply_markup: {
      keyboard: [
        ["🗳 Ovoz berish"],
        ["📊 Statistika", "👤 Profil"]
      ],
      resize_keyboard: true
    }
  };
}

// /start buyrug'i
bot.onText(/^\/start$/, (msg) => {
  registerUser(msg);

  bot.sendMessage(
    msg.chat.id,
    `Assalomu alaykum, ${
      msg.from.first_name || "foydalanuvchi"
    }!

🌸 Shaxnoza Jo'rayeva uchun ovoz berish botiga xush kelibsiz!

🗳 Ovoz berish — profil sahifasiga o'tish
📊 Statistika — bot statistikasi
👤 Profil — shaxsiy ma'lumotlaringiz`,
    mainMenu()
  );
});

// Asosiy tugmalar
bot.on("message", (msg) => {
  if (!msg.text || msg.text.startsWith("/")) {
    return;
  }

  registerUser(msg);

  const chatId = msg.chat.id;
  const userId = String(msg.from.id);

  // OVOZ BERISH
  if (msg.text === "🗳 Ovoz berish") {
    users[userId].voteClicks =
      (users[userId].voteClicks || 0) + 1;

    saveUsers();

    return bot.sendMessage(
      chatId,
      "🌸 Shaxnoza Jo'rayeva profiliga o'tish uchun quyidagi tugmani bosing.\n\n" +
      "Ovoz berish va uning qabul qilinganini rasmiy saytda tekshiring.",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🌐 Shaxnoza Jo'rayeva profiliga o'tish",
                url: PROFILE_URL
              }
            ]
          ]
        }
      }
    );
  }

  // STATISTIKA
  if (msg.text === "📊 Statistika") {
    const totalUsers = Object.keys(users).length;

    const totalClicks = Object.values(users).reduce(
      (sum, user) =>
        sum + (user.voteClicks || 0),
      0
    );

    return bot.sendMessage(
      chatId,
      "📊 BOT STATISTIKASI\n\n" +
      `👥 Foydalanuvchilar: ${totalUsers}\n` +
      `🗳 Ovoz berish tugmasi bosilishi: ${totalClicks}\n\n` +
      "⚠️ Bu raqamlar saytda tasdiqlangan ovozlar sonini bildirmaydi."
    );
  }

  // PROFIL
  if (msg.text === "👤 Profil") {
    const user = users[userId];

    return bot.sendMessage(
      chatId,
      "👤 SIZNING PROFILINGIZ\n\n" +
      `🪪 Telegram ID: ${user.id}\n` +
      `👤 Ism: ${user.firstName}\n` +
      `🔗 Username: ${
        user.username
          ? "@" + user.username
          : "Mavjud emas"
      }\n` +
      `🗳 Ovoz tugmasi bosilishi: ${user.voteClicks || 0}\n` +
      `📅 Ro'yxatdan o'tgan sana: ${
        user.joinedAt.slice(0, 10)
      }\n\n` +
      "Bu ma'lumotlar bot faoliyatiga tegishli.",
      mainMenu()
    );
  }
});

// ADMIN PANEL
bot.onText(/^\/admin$/, (msg) => {
  if (msg.from.id !== ADMIN_ID) {
    return bot.sendMessage(
      msg.chat.id,
      "⛔ Bu buyruq faqat admin uchun."
    );
  }

  const totalUsers = Object.keys(users).length;

  const totalClicks = Object.values(users).reduce(
    (sum, user) =>
      sum + (user.voteClicks || 0),
    0
  );

  return bot.sendMessage(
    msg.chat.id,
    "🛠 ADMIN PANEL\n\n" +
    `👥 Jami foydalanuvchilar: ${totalUsers}\n` +
    `🗳 Ovoz tugmasi bosilishi: ${totalClicks}\n\n` +
    "Saytdagi tasdiqlangan ovozlar bilan integratsiya ulanmagan."
  );
});

// Xatolar
bot.on("polling_error", (error) => {
  console.error(
    "Telegram polling xatosi:",
    error.message
  );
});

console.log("Bot ishga tushdi.");
