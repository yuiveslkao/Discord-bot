const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { readTasks, updateTask, deleteTask } = require('../utils/taskManager');

// 日付文字列をパースするヘルパー関数
function parseDueDate(dueDate) {
    if (!dueDate) return null;
    // "月/日 時:分" 形式をパースする簡易的な実装
    const parts = dueDate.match(/(\d+)\/(\d+)(?:\s+(\d+):(\d+))?/);
    if (!parts) return null;
    const now = new Date();
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const hours = parts[3] ? parseInt(parts[3], 10) : 0;
    const minutes = parts[4] ? parseInt(parts[4], 10) : 0;
    return new Date(now.getFullYear(), month, day, hours, minutes);
}

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
                .setDescription('タイトルや備考に含まれるキーワードで検索するよ！'))
        .addStringOption(option =>
            option.setName('sort')
                .setDescription('タスクの並び順')
                .addChoices(
                    { name: '期限が近い順', value: 'dueDate_asc' },
                    { name: '期限が遠い順', value: 'dueDate_desc' },
                    { name: '作成日が新しい順', value: 'createdAt_desc' },
                    { name: '作成日が古い順', value: 'createdAt_asc' }
                )),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const statusFilter = interaction.options.getString('status');
        const keywordFilter = interaction.options.getString('keyword');
        const sortOrder = interaction.options.getString('sort') || 'createdAt_desc';

        let tasks; // getFilteredTasksによって設定される

        const getFilteredTasks = () => {
            let allTasks = readTasks();
            // フィルター
            if (statusFilter) {
                allTasks = allTasks.filter(t => t.status === statusFilter);
            } else {
                allTasks = allTasks.filter(t => t.status !== '完了');
            }
            if (keywordFilter) {
                allTasks = allTasks.filter(t =>
                    (t.title && t.title.includes(keywordFilter)) ||
                    (t.notes && t.notes.includes(keywordFilter))
                );
            }
            // ソート
            allTasks.sort((a, b) => {
                switch (sortOrder) {
                    case 'dueDate_asc': {
                        const dateA = parseDueDate(a.dueDate);
                        const dateB = parseDueDate(b.dueDate);
                        if (!dateA) return 1;
                        if (!dateB) return -1;
                        return dateA - dateB;
                    }
                    case 'dueDate_desc': {
                        const dateA = parseDueDate(a.dueDate);
                        const dateB = parseDueDate(b.dueDate);
                        if (!dateA) return 1;
                        if (!dateB) return -1;
                        return dateB - dateA;
                    }
                    case 'createdAt_asc':
                        return new Date(a.createdAt) - new Date(b.createdAt);
                    case 'createdAt_desc':
                    default:
                        return new Date(b.createdAt) - new Date(a.createdAt);
                }
            });
            return allTasks;
        };

        tasks = getFilteredTasks();

        if (tasks.length === 0) {
            await interaction.editReply({ content: '表示するタスクがないよ！えらい！...おにいちゃんサボってないよね？' });
            return;
        }

        const tasksPerPage = 5;
        let currentPage = 0;
        let selectedTaskId = null;

        const generateReply = (page) => {
            const totalPages = Math.ceil(tasks.length / tasksPerPage) || 1;
            const start = page * tasksPerPage;
            const end = start + tasksPerPage;
            const currentTasks = tasks.slice(start, end);

            const embed = new EmbedBuilder()
                .setTitle('📝 タスク一覧')
                .setColor(0x0099FF)
                .setDescription(`**${tasks.length}件**のタスクが見つかったよ。下から操作したいタスクを選んでね。`)
                .setFooter({ text: `ページ ${page + 1} / ${totalPages}` });

            if (currentTasks.length === 0 && tasks.length > 0) {
                 embed.setDescription('このページに表示するタスクはないよ！');
            } else {
                for (const task of currentTasks) {
                    embed.addFields({
                        name: `【${task.status}】 ${task.title}`,
                        value: `**期限:** ${task.dueDate || 'なし'}\n**備考:** ${task.notes || 'なし'}\n**ID:** \`${task.id}\``,
                    });
                }
            }
            
            const components = [];

            // タスク選択のセレクトメニュー
            if (currentTasks.length > 0) {
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_task')
                    .setPlaceholder('ここからタスクを選択...')
                    .addOptions(currentTasks.map(task => ({
                        label: task.title.substring(0, 100),
                        description: `ID: ${task.id}`,
                        value: task.id.toString(),
                    })));
                components.push(new ActionRowBuilder().addComponents(selectMenu));
            }

            // アクションボタン (タスク選択時に有効化)
            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('task_done')
                    .setLabel('✅ 完了')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(!selectedTaskId),
                new ButtonBuilder()
                    .setCustomId('task_wip')
                    .setLabel('💪 作業中')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!selectedTaskId),
                new ButtonBuilder()
                    .setCustomId('task_delete')
                    .setLabel('🗑️ 削除')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!selectedTaskId)
            );
            components.push(actionRow);

            // ページネーションボタン
            const paginationRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_page')
                    .setLabel('◀️ 前へ')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('next_page')
                    .setLabel('次へ ▶️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= totalPages - 1)
            );
            components.push(paginationRow);

            return { embeds: [embed], components };
        };

        const reply = await interaction.editReply(generateReply(currentPage));
        const collector = reply.createMessageComponentCollector({ time: 300000 }); // 5分間

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                await i.reply({ content: 'コマンドを使った本人しか操作できないよ！', ephemeral: true });
                return;
            }

            await i.deferUpdate();

            if (i.isStringSelectMenu()) {
                if (i.customId === 'select_task') {
                    selectedTaskId = i.values[0];
                }
            } else if (i.isButton()) {
                if (i.customId === 'next_page' || i.customId === 'prev_page') {
                    selectedTaskId = null; // ページ変更時は選択をリセット
                    currentPage += (i.customId === 'next_page' ? 1 : -1);
                } else if (selectedTaskId) {
                    const taskId = parseInt(selectedTaskId, 10);
                    let actionTaken = false;
                    if (i.customId === 'task_done') {
                        updateTask(taskId, { status: '完了' });
                        actionTaken = true;
                    } else if (i.customId === 'task_wip') {
                        updateTask(taskId, { status: '作業中' });
                        actionTaken = true;
                    } else if (i.customId === 'task_delete') {
                        deleteTask(taskId);
                        actionTaken = true;
                    }

                    if (actionTaken) {
                        // データを再取得して状態をリセット
                        tasks = getFilteredTasks();
                        selectedTaskId = null;
                        const totalPages = Math.ceil(tasks.length / tasksPerPage) || 1;
                        if (currentPage >= totalPages && currentPage > 0) {
                            currentPage = totalPages - 1;
                        }
                    }
                }
            }
            
            await interaction.editReply(generateReply(currentPage));
        });

        collector.on('end', async () => {
            const finalReply = generateReply(currentPage);
            finalReply.components.forEach(row => row.components.forEach(c => c.setDisabled(true)));
            await interaction.editReply(finalReply).catch(() => {});
        });
    },
};