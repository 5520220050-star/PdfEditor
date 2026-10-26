import { api } from 'sdk';

// Link to the mini app (Telegram hosting)
const APP_URL = 'https://app8362779333.tgcloud.ai/';

const WELCOME = [
  'أهلاً بك في <b>محرر PDF</b> 📄',
  '',
  'عدّل ملفاتك بسهولة من داخل تيليجرام:',
  '🗑️ حذف صفحات   ➕ إضافة صفحات',
  '🔄 تدوير   📐 تغيير الحجم',
  '💧 علامة مائية   🔗 دمج ملفات',
  '🖼️ صور إلى PDF   📸 PDF إلى صور',
  '✂️ تقسيم   🔒 إضافة أو إزالة كلمة المرور',
  '',
  'كل المعالجة تتم داخل جهازك، ولا تُرفع ملفاتك إلى أي خادم.',
  '',
  'اضغط الزر بالأسفل لفتح المحرر 👇'
].join('\n');

const SHORT = 'لتعديل ملفات PDF اضغط الزر بالأسفل لفتح المحرر 👇';

export default async function (message, ctx) {
  // Reply only in private chats with the bot
  if (message.chat.type !== 'private') return;

  const text = (message.text || '').trim();
  const isStart = text.startsWith('/start') || text.startsWith('/help');

  await api.sendMessage({
    chat_id: message.chat.id,
    text: isStart ? WELCOME : SHORT,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: '📂 فتح المحرر', web_app: { url: APP_URL } }]]
    }
  });
}
