const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add')
		.setDescription('新しいタスクを追加します。')
		.addStringOption(option =>
			option.setName('task')
				.setDescription('タスクの内容')
				.setRequired(true)), // このオプションを必須にする
	async execute(interaction) {
		// オプションから値を取得
		const task = interaction.options.getString('task');
		// ここにタスクを保存する処理などを書く

		await interaction.reply(`タスク「${task}」を追加しました！`);
	},
};