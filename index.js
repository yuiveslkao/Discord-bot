const fs = require('node:fs');
const path = require('node:path');
// ↓↓ EmbedBuilder を discord.js からインポート
const { Client, Collection, GatewayIntentBits, EmbedBuilder } = require('discord.js');
// ↓↓ リマインダー用のIDを config.js からインポート
const { token, reminderUserId, reminderChannelId } = require('./config.js');
// ↓↓ readTasks を taskManager.js からインポート
const { updateTask, deleteTask, readTasks } = require('./utils/taskManager.js');

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

// Botが準備できたときに一度だけ実行
client.once('ready', () => {
	console.log(`${client.user.tag}としてログインしました！`);

    // ▼▼▼ ここからリマインダー処理を追記 ▼▼▼

    // リマインダーを送る間隔（ミリ秒単位）
    // 例: 1時間ごと = 60 * 60 * 1000 = 3600000
    const reminderInterval = 3600000; 

    // 定期実行処理
    setInterval(async () => {
        try {
            // 未完了・作業中のタスクを取得
            const allTasks = readTasks();
            const tasks = allTasks.filter(t => t.status !== '完了');

            // 未完了タスクがなければ何もしない
            if (tasks.length === 0) {
                console.log('リマインダー：未完了タスクがないため、通知をスキップしました。');
                return;
            }

            // リマインド先のチャンネルを取得
            const channel = await client.channels.fetch(reminderChannelId);
            if (!channel) return;

            // 埋め込みメッセージを作成
            const embed = new EmbedBuilder()
                .setTitle('⏰ リマインドだよ！')
                .setColor(0xFFD700) //金色
                .setDescription(`現在、未完了のタスクが ${tasks.length} 件あるよ！ちゃんと全部やってね？`);
            
            for (const task of tasks.slice(0, 5)) { // 一度に5件まで表示
                embed.addFields({
                    name: `【${task.status}】 ${task.title}`,
                    value: `**期限:** ${task.dueDate || 'なし'}\n**ID:** \`${task.id}\``,
                });
            }

            // メンション付きでメッセージを送信
            await channel.send({
                content: `<@${reminderUserId}>おにいちゃん、タスクのリマインドだよ！`,
                embeds: [embed],
            });

            console.log('リマインダーを送信しました。');

        } catch (error) {
            console.error('リマインダーの送信中にエラーが発生しました:', error);
        }
    }, reminderInterval);

    // ▲▲▲ ここまでリマインダー処理 ▲▲▲
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
            const taskToUpdate = readTasks().find(t => t.id === id); // タイトル取得のため
            const updated = updateTask(id, { status: newStatus });
            responseMessage = updated
                ? `✅ タスク「${taskToUpdate.title}」を「${newStatus}」に変更したよ！`
                : `❌ タスク(ID: \`${id}\`)が見つからなかったよ...`;
        } else if (status === 'delete') {
            const taskToDelete = readTasks().find(t => t.id === id); // タイトル取得のため
            const deleted = deleteTask(id);
            responseMessage = deleted
                ? `🗑️ タスク「${taskToDelete.title}」を削除したよ！`
                : `❌ タスク(ID: \`${id}\`)が見つからなかったよ...`;
        }

        await interaction.update({ content: responseMessage, components: [] }); // ボタンを消してメッセージを更新
    }
});

client.login(token);