const fs = require('node:fs');
const path = require('node:path');

const tasksFilePath = path.join(__dirname, '..', 'tasks.json');

// tasks.jsonを読み込む
function readTasks() {
    if (!fs.existsSync(tasksFilePath)) {
        return [];
    }
    const data = fs.readFileSync(tasksFilePath, 'utf8');
    return JSON.parse(data);
}

// tasks.jsonに書き込む
function writeTasks(tasks) {
    fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2));
}

// 新しいタスクを追加
function addTask(task) {
    const tasks = readTasks();
    const newTask = {
        id: Date.now(), // ユニークIDとして現在時刻のタイムスタンプを使用
        ...task,
        status: '未着手',
        createdAt: new Date().toISOString(),
    };
    tasks.push(newTask);
    writeTasks(tasks);
    return newTask;
}

// IDでタスクを取得
function getTask(id) {
    const tasks = readTasks();
    return tasks.find(t => t.id === id);
}

// タスクを更新
function updateTask(id, updates) {
    let tasks = readTasks();
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return null;

    tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
    writeTasks(tasks);
    return tasks[taskIndex];
}

// タスクを削除
function deleteTask(id) {
    let tasks = readTasks();
    const initialLength = tasks.length;
    tasks = tasks.filter(t => t.id !== id);
    if (tasks.length === initialLength) return false;
    
    writeTasks(tasks);
    return true;
}

module.exports = {
    readTasks,
    addTask,
    getTask,
    updateTask,
    deleteTask,
};