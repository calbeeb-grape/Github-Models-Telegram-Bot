import TelegramBot from 'node-telegram-bot-api';
import { setModelName, setTemperature } from './chat.js'
import dotenv from 'dotenv';
dotenv.config();

const token = process.env['TELEGRAM_TOKEN'];
const bot = new TelegramBot(token, { polling: true });

// 定义允许响应的用户ID列表
const allowedUserIds = process.env['ALLOWED_USER_IDS'].split(',');

// 发送消息的功能, 加入错误处理
export async function sendMessage(userId, message) {
    try {
        await bot.sendMessage(userId, message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error(`发送消息到 ${userId} 失败:`, error); 
    }
}

// 初始化机器人并设置消息接收的回调
export function initializeBot(onMessage, onStart, onStop) {
    // 设置命令菜单
    bot.setMyCommands([
        { command: '/start', description: '开始对话' },
        { command: '/stop', description: '停止本轮对话' },
        { command: '/models', description: '选择模型' },
        { command: '/temperature', description: '对话温度' },
    ]);

    // 命令处理
    bot.on('message', async (msg) => {
        const userId = msg.chat.id;
        const userFirstName = msg.from.first_name;
        const userLastName = msg.from.last_name;
        if (!('text' in msg)) {
            return sendMessage(userId, "本机器人只接受文本消息，请不要发送图片、表情包或其他文件类型。");
        }
        const text = msg.text;

        if (!allowedUserIds.includes(userId.toString())) {
            return sendMessage(userId, "对不起，您没有权限使用这个机器人。");
        }

        switch (text) {
            case '/start':
                onStart(userId, userFirstName, userLastName);
                break;
            case '/stop':
                onStop(userId);
                break;
            case '/models':
                const modelOptions = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'GPT 4.1', callback_data: 'model:gpt-4.1' }],
                            [{ text: 'GPT 4.1 Mini(L)', callback_data: 'model:gpt-4.1-mini' }],
                            [{ text: 'GPT 4o', callback_data: 'model:gpt-4o' }],
                            [{ text: 'Deepseek v3 0324', callback_data: 'model:DeepSeek-V3-0324' }],
                            [{ text: 'Meta 4 Scout', callback_data: 'model:Llama-4-Scout-17B-16E-Instruct' }],
                            [{ text: 'Meta 4 Maverick', callback_data: 'model:Llama-4-Maverick-17B-128E-Instruct-FP8' }],
                            [{ text: 'Phi 4 Multimodal(L)', callback_data: 'model:Phi-4-multimodal-instruct' }],
                            [{ text: 'MAI-DS-R1', callback_data: 'model:MAI-DS-R1' }],
                        ]
                    }
                };
                bot.sendMessage(userId, '请选择您需要的模型：', modelOptions);
                break;
            case '/temperature':
                const tempOptions = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '最严谨 0.1', callback_data: 'temp:0.1' }],
                            [{ text: '较严谨 0.3', callback_data: 'temp:0.3' }],
                            [{ text: '中性 0.5', callback_data: 'temp:0.5' }],
                            [{ text: '较发散 0.7', callback_data: 'temp:0.7' }],
                            [{ text: '最发散 1.0', callback_data: 'temp:1' }]
                        ]
                    }
                };
                bot.sendMessage(userId, '请选择您需要的温度：', tempOptions);
                break;
            default: 
                // 过滤掉已经处理过的命令消息
                if (text.startsWith('/')) return; 
                onMessage(userId, text);
        }
    });

    // 监听模型选择
    bot.on('callback_query', (callbackQuery) => {
        const userId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;
    
        bot.answerCallbackQuery(callbackQuery.id);
    
        if (data.startsWith('model:')) {
            const modelName = data.split(':')[1];
            setModelName(userId, modelName);
            sendMessage(userId, `模型已经切换为：${modelName}`);
        } else if (data.startsWith('temp:')) {
            const temperature = parseFloat(data.split(':')[1]);
            setTemperature(userId, temperature);
            sendMessage(userId, `对话温度已设置为：${temperature}`);
        }
    });
    

    // 错误处理
    bot.on('polling_error', (error) => {
        console.error('Polling error occurred:', error);
    });
}
