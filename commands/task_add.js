const { SlashCommandBuilder } = require('discord.js');
const { addTask } = require('../utils/taskManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('task_add')
        .setDescription('新しいタスクを追加するよ！')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('タスクのタイトル')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('due_date')
                .setDescription('タスクの期限 (例: 8/15 18:00)'))
        .addStringOption(option =>
            option.setName('notes')
                .setDescription('タスクの備考')),
    async execute(interaction) {
        const title = interaction.options.getString('title');
        const dueDate = interaction.options.getString('due_date');
        const notes = interaction.options.getString('notes');

        const newTask = addTask({ title, dueDate, notes });

        await interaction.reply({
            content: `✅ タスクを追加したよ！頑張ってね！おにいちゃん！\n**タイトル:** ${newTask.title}\n**ID:** \`${newTask.id}\``,
            ephemeral: true // 自分にだけ見えるメッセージ
        });
    },
};