# Telegram News Channel Bot

Auto-posts **politics, foreign affairs, national, international, state, sports, business, weather and stock updates**.

## 1. Create the channel and bot (5 min)
1. Telegram → **New Channel** → set a public username, e.g. `@my_news_channel`.
2. Open **@BotFather** → `/newbot` → copy the **token**.
3. Channel → Administrators → **Add Admin** → select your bot → allow **Post Messages**.

## 2. Install and run
```bash
pip install -r requirements.txt
export TELEGRAM_BOT_TOKEN="123456:ABC..."
export TELEGRAM_CHANNEL="@my_news_channel"
export TZ="Asia/Kolkata"            # your timezone
export WEATHER_CITY="Your City" WEATHER_LAT=12.97 WEATHER_LON=77.59

python newsbot.py test     # check connection
python newsbot.py run      # run continuously
```

## 3. Customise (top of `newsbot.py`)
- `FEEDS`: add or replace RSS URLs, especially the **State** feed for your state.
- `NEWS_EVERY_MIN`, `MAX_PER_CATEGORY_PER_RUN`, `WEATHER_TIMES`, `MARKET_HOURS`
- `INDICES`: any Yahoo Finance symbol.

## 4. Keep it running 24/7
- **VPS / Raspberry Pi:** `nohup python newsbot.py run &` or a systemd service.
- **Free option:** run `python newsbot.py news` every 20 min via cron or GitHub Actions
  (commit `seen.json` between runs, or it will re-post).

Cron example:
```
*/20 * * * *  cd /path/to/bot && python newsbot.py news
0 7,18 * * *  cd /path/to/bot && python newsbot.py weather
0 9-16 * * 1-5 cd /path/to/bot && python newsbot.py stocks
```

## Notes
- Verify RSS URLs open in a browser; publishers change them occasionally.
- Posts only headline + link (credits the source). Don't copy full articles.
- Telegram allows ~20 messages/minute to a channel; the bot already throttles.
