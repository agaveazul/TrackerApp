const path = require("path");
const dotenv = require("dotenv");

// Load the appropriate .env file based on the environment
const envPath =
  process.env.APP_ENV === "production" ? ".env.production" : ".env.development";

dotenv.config({ path: path.resolve(__dirname, envPath) });

module.exports = ({ config }) => ({
  expo: {
    ...require("./app.json").expo,
    extra: {
      firebaseApiKey:
        process.env.APP_ENV === "production"
          ? process.env.FIREBASE_API_KEY // This will come from EAS secrets
          : process.env.EXPO_PUBLIC_FIREBASE_API_KEY, // This comes from .env.development
    },
  },
});
