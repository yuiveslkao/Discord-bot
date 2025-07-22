const { SlashCommandBuilder } = require('discord.js');
const { updateTask } = require('../utils/taskManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('task_edit')
        .setDescription('今あるタスクを編集するよ！')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('編集するタスクのID')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('title')
                .setDescription('新しいタスクのタイトル'))
        .addStringOption(option =>
            option.setName('due_date')
                .setDescription('新しいタスクの期限'))
        .addStringOption(option =>
            option.setName('notes')
                .setDescription('新しいタスクの備考')),
    async execute(interaction) {
        const id = Number(interaction.options.getString('id'));
        const updates = {};
        if (interaction.options.getString('title')) updates.title = interaction.options.getString('title');
        if (interaction.options.getString('due_date')) updates.dueDate = interaction.options.getString('due_date');
        if (interaction.options.getString('notes')) updates.notes = interaction.options.getString('notes');

        if (Object.keys(updates).length === 0) {
            await interaction.reply({ content: '編集する項目を一つ以上指定してね！', ephemeral: true });
            return;
        }

        const updatedTask = updateTask(id, updates);
        if (updatedTask) {
            await interaction.reply({ content: `✅ タスク(ID: \`${id}\`)を更新したよ！`, ephemeral: true });
        } else {
            await interaction.reply({ content: `❌ タスク(ID: \`${id}\`)が見つからなかったよ...`, ephemeral: true });
        }
    },
};