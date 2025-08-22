# 📢 WordPress → Telegram Job/Blog Posting Bot

This is a Node.js bot that **monitors a WordPress job/nlogs site** and **automatically posts new jobs/blogs** into a Telegram channel/group, using **Gemini AI** to generate short, professional summaries.

---

## ✨ Features
- Fetches new job/blogs posts from WordPress REST API
- Summarizes jobs/blogs with **Google Gemini AI**
- Posts formatted messages to a **Telegram group or channel**
- **Stores last posted job/blog ID** locally (no duplicates, restart-safe)
- Supports **multiple jobs/blog at once** (if several are published quickly)
- Clean Telegram-safe HTML formatting (`<b>`, `<i>`, `<a>`, etc.)

---

## ⚙️ Requirements
- Node.js 16+  
- NPM (comes with Node.js)  
- A **Telegram Bot Token** (via [@BotFather](https://t.me/BotFather))  
- Your **Telegram Group/Channel Chat ID**  
- A WordPress site with the REST API enabled (default: `https://yoursite.com/wp-json/wp/v2/posts`)  
- A [Gemini API Key](https://ai.google.dev/)  

---

## 🚀 Setup

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/telegram-wp-job-bot.git](https://github.com/gajanan0210/wordpress-telegram-bot
cd wordpress-telegram-bot
