const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.js');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
// 'commands' フォルダからコマンドファイルを取得
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	commands.push(command.data.toJSON());
}

// RESTモジュールのインスタンスを作成
const rest = new REST({ version: '10' }).setToken(token);

// コマンドを登録
(async () => {
	try {
		console.log(`${commands.length}個のアプリケーションコマンドを登録します。`);

		// putメソッドで、指定したサーバーにコマンドを登録
		const data = await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		);

		console.log(`${data.length}個のアプリケーションコマンドを登録しました。`);
	} catch (error) {
		console.error(error);
	}
})();