import dotenv from "dotenv";
dotenv.config();

export default {
  accounts: [
    {
      id: "account_1",
      email: process.env.ACCOUNT_1_EMAIL || "",
      password: process.env.ACCOUNT_1_PASSWORD || "",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    },
    {
      id: "account_2",
      email: process.env.ACCOUNT_2_EMAIL || "",
      password: process.env.ACCOUNT_2_PASSWORD || "",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    },
  ],

  timezone: process.env.TIMEZONE || "Asia/Kolkata",

  maxMessagesPerDay: parseInt(process.env.MAX_MESSAGES_PER_DAY) || 15,

  minDelayBetweenMessages: 8,
  maxDelayBetweenMessages: 25,

  businessHours: {
    start: parseInt(process.env.BUSINESS_HOURS_START) || 9,
    end: parseInt(process.env.BUSINESS_HOURS_END) || 18,
  },

  paths: {
    profiles: "./profiles",
    data: "./data",
    uploads: "./uploads",
    debug: "./debug/screenshots",
  },
};