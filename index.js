const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.js');

// Clientインスタンスを作成
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// コマンドを保持するためのCollectionを作成
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Collectionにコマンド名とコマンドのデータをセット
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`${filePath} に data または execute プロパティがありません。`);
	}
}

// Botが準備できたときに一度だけ実行
client.once('ready', () => {
	console.log(`${client.user.tag}としてログインしました！`);
});

// コマンドが実行されたときの処理
client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'コマンドの実行中にエラーが発生しました。', ephemeral: true });
	}
});

// Botをトークンでログインさせる
client.login(token);