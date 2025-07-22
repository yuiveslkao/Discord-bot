const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { readTasks } = require('../utils/taskManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('task_show')
        .setDescription('タスク一覧を表示するよ！')
        .addStringOption(option =>
            option.setName('status')
                .setDescription('表示するステータスで絞り込むよ！')
                .addChoices(
                    { name: '未着手', value: '未着手' },
                    { name: '作業中', value: '作業中' },
                    { name: '完了', value: '完了' }
                ))
        .addStringOption(option =>
            option.setName('keyword')
                .setDescription('タイトルや備考に含まれるキーワードで検索するよ！')),
    async execute(interaction) {
        let tasks = readTasks();
        const statusFilter = interaction.options.getString('status');
        const keywordFilter = interaction.options.getString('keyword');

        // フィルター処理
        if (statusFilter) {
            tasks = tasks.filter(t => t.status === statusFilter);
        } else {
            // デフォルトでは完了以外を表示
            tasks = tasks.filter(t => t.status !== '完了');
        }
        
        if (keywordFilter) {
            tasks = tasks.filter(t => 
                (t.title && t.title.includes(keywordFilter)) ||
                (t.notes && t.notes.includes(keywordFilter))
            );
        }

        if (tasks.length === 0) {
            await interaction.reply({ content: '表示するタスクがないよ！えらい！...おにいちゃんサボってないよね？', ephemeral: true });
            return;
        }

        // 埋め込みメッセージを作成
        const embed = new EmbedBuilder()
            .setTitle('📝 タスク一覧')
            .setColor(0x0099FF)
            .setDescription('タスクの詳細だよ。');

        for (const task of tasks.slice(0, 25)) { // 一度に表示するタスクは25件まで
            embed.addFields({
                name: `【${task.status}】 ${task.title}`,
                value: `**期限:** ${task.dueDate || 'なし'}\n**備考:** ${task.notes || 'なし'}\n**ID:** \`${task.id}\``,
            });
        }
        
        // ボタンを作成
        const row = new ActionRowBuilder();
        if (tasks.length > 0) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`task_done_${tasks[0].id}`) // 最初のタスクIDを仮で設定
                    .setLabel('完了にする')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`task_wip_${tasks[0].id}`)
                    .setLabel('作業中にする')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`task_delete_${tasks[0].id}`)
                    .setLabel('削除')
                    .setStyle(ButtonStyle.Danger)
            );
        }

        // 注: ボタンは表示された最初のタスクにのみ対応する簡易的な実装です
        // 本格的には、各タスクにボタンをつけたり、セレクトメニューで操作対象を選ぶ必要があります
        const replyContent = tasks.length > 0 ? 'IDを指定してボタンで操作してね（現在は表示された最初のタスクIDがボタンに設定されます）。' : ' ';

        await interaction.reply({ content: replyContent, embeds: [embed], components: [row] });
    },
};