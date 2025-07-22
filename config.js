// .envファイルから環境変数を読み込む
require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN, // Discord Botのトークン
  clientId: process.env.DISCORD_CLIENT_ID, // BotのClient ID
  guildId: process.env.DISCORD_GUILD_ID,   // Botを導入するサーバー(Guild)のID
};