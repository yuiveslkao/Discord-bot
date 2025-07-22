const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.js');
const { updateTask, deleteTask } = require('./utils/taskManager.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`${filePath} に data または execute プロパティがありません。`);
    }
}

client.once('ready', () => {
    console.log(`${client.user.tag}としてログインしました！`);
});

// interactionCreateイベントのリスナー
client.on('interactionCreate', async interaction => {
    // スラッシュコマンドの処理
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'コマンド実行中にエラーが発生しました。', ephemeral: true });
        }
    }
    // ボタンの処理
    else if (interaction.isButton()) {
        const [action, status, taskId] = interaction.customId.split('_');

        if (action !== 'task') return;
        
        const id = Number(taskId);
        let responseMessage = '';

        if (status === 'done' || status === 'wip') {
            const newStatus = status === 'done' ? '完了' : '作業中';
            const updated = updateTask(id, { status: newStatus });
            responseMessage = updated
                ? `✅ タスク(ID: \`${id}\`)のステータスを「${newStatus}」に変更しました。`
                : `❌ タスク(ID: \`${id}\`)が見つかりませんでした。`;
        } else if (status === 'delete') {
            const deleted = deleteTask(id);
            responseMessage = deleted
                ? `🗑️ タスク(ID: \`${id}\`)を削除しました。`
                : `❌ タスク(ID: \`${id}\`)が見つかりませんでした。`;
        }

        await interaction.update({ content: responseMessage, components: [] }); // ボタンを消してメッセージを更新
    }
});

client.login(token);