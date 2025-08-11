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

    // リマインドする時間（時）のリスト
    const reminderHours = [0, 6, 9, 12, 15, 18, 21];
    let lastReminderHour = -1; // 最後にリマインドした時間を記録

    // 1分ごとに時間を確認
    setInterval(async () => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // 指定された時間であり、かつその時間の0分であるか、
        // そして、その時間にまだリマインドを送信していないかを確認
        if (reminderHours.includes(currentHour) && currentMinute === 0 && currentHour !== lastReminderHour) {
            lastReminderHour = currentHour; // リマインドした時間を記録

            try {
                // 未完了・作業中のタスクを取得
                const allTasks = readTasks();
                const tasks = allTasks.filter(t => t.status !== '完了');

                // 未完了タスクがなければ何もしない
                if (tasks.length === 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('⏰ リマインドだよ！')
                        .setColor(0x00FF00) // 緑色
                        .setDescription('現在、未完了のタスクはないよ！えらい！');
                    await client.channels.cache.get(reminderChannelId).send({ content: `<@${reminderUserId}>おにいちゃん、タスクのリマインドだよ!`, embeds: [embed] });
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

                for (const task of tasks.slice(0, 25)) { // 一度に25件まで表示
                    embed.addFields({
                        name: `【${task.status}】 ${task.title}`,
                        value: `**期限:** ${task.dueDate || 'なし'}\n**ID:** \`${task.id}\``,
                    });
                }

                // メンション付きでメッセージを送信
                await channel.send({
                    content: `<@${reminderUserId}>おにいちゃん、タスクのリマインドだよ!`,
                    embeds: [embed],
                });

                console.log('リマインダーを送信しました。');

            } catch (error) {
                console.error('リマインダーの送信中にエラーが発生しました:', error);
            }
        }
    }, 60000); // 1分ごとに実行

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
            await interaction.reply({ content: 'コマンド実行中にエラーが発生しました。', flags: 64 });
        }
    }
    
});

client.login(token);

// --- ここからヘルスチェック機能 ---
const express = require('express');

const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Discord bot is running!');
});

app.listen(port, () => {
  console.log(`Health check server listening on port ${port}`);
});
// --- ここまでヘルスチェック機能 ---