// Telegram webhook for the PDF editor bot (Vercel serverless function).
// Environment variables (Vercel → Settings → Environment Variables):
//   BOT_TOKEN    – the token from @BotFather (required)
//   MINI_APP_URL – optional, defaults to the GitHub Pages link below

const APP_URL = process.env.MINI_APP_URL || 'https://5520220050-star.github.io/pdfeditor/';

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

const keyboard = {
  inline_keyboard: [[{ text: '📂 فتح المحرر', web_app: { url: APP_URL } }]]
};

async function tg(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

module.exports = async function handler(req, res) {
  // Opening the link in a browser just confirms the function is alive.
  if (req.method !== 'POST') return res.status(200).send('PDF editor bot is running.');

  try {
    const msg = req.body && req.body.message;
    // Only reply in private chats with the bot.
    if (msg && msg.chat && msg.chat.type === 'private') {
      const text = (msg.text || '').trim();
      const isStart = text.startsWith('/start') || text.startsWith('/help');
      await tg('sendMessage', {
        chat_id: msg.chat.id,
        text: isStart ? WELCOME : SHORT,
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    }
  } catch (e) {
    console.error(e);
  }
  // Always answer 200 so Telegram doesn't keep re-sending the same update.
  res.status(200).send('ok');
}
