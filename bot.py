#!/usr/bin/env python3
"""
Telegram News Channel Bot
Posts: politics, foreign affairs, national, international, state, sports,
weather and stock-market updates to a Telegram channel.

Usage:
  python newsbot.py run        # run forever (news / weather / stocks on schedule)
  python newsbot.py news       # fetch and post new headlines once
  python newsbot.py weather    # post weather once
  python newsbot.py stocks     # post market snapshot once
  python newsbot.py test       # send a test message

Env vars:
  TELEGRAM_BOT_TOKEN   token from @BotFather
  TELEGRAM_CHANNEL     e.g. @my_news_channel  (or numeric id like -100123...)
"""
import html
import json
import logging
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import feedparser
import requests

# Load settings from a ".env" file next to this script (if present)
_env = Path(__file__).with_name(".env")
if _env.exists():
    for _line in _env.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))

# ----------------------------- CONFIG ---------------------------------
# Credentials come ONLY from environment variables (never hardcode them).
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "8875077750:AAHFZluUtFx47q9CMknNwss-JKSLc4BZZbw").strip()
CHANNEL = os.environ.get("TELEGRAM_CHANNEL", "@SuddiVaahini_bot").strip()

# Edit the feeds freely. Verify each URL still works in a browser.
FEEDS = {
    "🏛 Politics": {
        "tag": "#Politics",
        "urls": [
            "https://indianexpress.com/section/political-pulse/feed/",
            "https://www.thehindu.com/news/national/feeder/default.rss",
        ],
    },
    "🌐 Foreign Affairs": {
        "tag": "#ForeignAffairs",
        "urls": [
            "https://www.aljazeera.com/xml/rss/all.xml",
            "http://feeds.bbci.co.uk/news/world/rss.xml",
        ],
    },
    "🇮🇳 National": {
        "tag": "#National",
        "urls": [
            "https://feeds.feedburner.com/ndtvnews-top-stories",
            "https://indianexpress.com/section/india/feed/",
        ],
    },
    "🌍 International": {
        "tag": "#International",
        "urls": [
            "https://www.thehindu.com/news/international/feeder/default.rss",
            "http://feeds.bbci.co.uk/news/world/rss.xml",
        ],
    },
    "📍 State": {  # change to YOUR state's feed
        "tag": "#State",
        "urls": [
            "https://www.thehindu.com/news/national/karnataka/feeder/default.rss",
        ],
    },
    "🏅 Sports": {
        "tag": "#Sports",
        "urls": [
            "https://www.thehindu.com/sport/feeder/default.rss",
            "http://feeds.bbci.co.uk/sport/rss.xml",
        ],
    },
    "💹 Business": {
        "tag": "#Markets",
        "urls": [
            "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
        ],
    },
}

MAX_PER_CATEGORY_PER_RUN = 3      # avoids flooding the channel
NEWS_EVERY_MIN = 20               # news check interval
STOCKS_EVERY_MIN = 60             # market snapshot interval (weekdays, market hours)
MARKET_HOURS = (9, 16)            # local hours (set TZ env var for your timezone)
WEATHER_TIMES = ["07:00", "18:00"]

# Weather location (Open-Meteo, no API key needed)
WEATHER_CITY = os.environ.get("WEATHER_CITY", "New Delhi")
WEATHER_LAT = float(os.environ.get("WEATHER_LAT", "28.6139"))
WEATHER_LON = float(os.environ.get("WEATHER_LON", "77.2090"))

# Yahoo Finance symbols
INDICES = {
    "Nifty 50": "^NSEI",
    "Sensex": "^BSESN",
    "Bank Nifty": "^NSEBANK",
    "S&P 500": "^GSPC",
    "Nasdaq": "^IXIC",
    "Gold (USD)": "GC=F",
    "Brent Crude": "BZ=F",
    "USD/INR": "INR=X",
}

SEEN_FILE = Path(__file__).with_name("seen.json")
UA = {"User-Agent": "Mozilla/5.0 (compatible; TelegramNewsBot/1.0)"}
# ----------------------------------------------------------------------

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("newsbot")


def send(text: str, preview: bool = False) -> bool:
    if not BOT_TOKEN or not CHANNEL:
        log.error("Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL environment variables.")
        sys.exit(1)
    r = requests.post(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
        json={
            "chat_id": CHANNEL,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": not preview,
        },
        timeout=20,
    )
    if r.status_code == 429:  # rate limited
        wait = r.json().get("parameters", {}).get("retry_after", 10)
        log.warning("Rate limited, sleeping %ss", wait)
        time.sleep(wait + 1)
        return send(text, preview)
    if not r.ok:
        log.error("Telegram error %s: %s", r.status_code, r.text)
    return r.ok


# ------------------------------ NEWS ----------------------------------
def load_seen() -> set:
    if SEEN_FILE.exists():
        try:
            return set(json.loads(SEEN_FILE.read_text()))
        except Exception:
            pass
    return set()


def save_seen(seen: set) -> None:
    SEEN_FILE.write_text(json.dumps(list(seen)[-5000:]))


def entry_time(e) -> float:
    t = e.get("published_parsed") or e.get("updated_parsed")
    return time.mktime(t) if t else 0.0


def post_news() -> None:
    seen = load_seen()
    for category, cfg in FEEDS.items():
        fresh = []
        for url in cfg["urls"]:
            try:
                feed = feedparser.parse(url, request_headers=UA)
            except Exception as ex:
                log.warning("Feed failed %s: %s", url, ex)
                continue
            for e in feed.entries[:15]:
                uid = e.get("id") or e.get("link")
                if uid and uid not in seen:
                    fresh.append((entry_time(e), uid, e))
        fresh.sort(key=lambda x: x[0], reverse=True)

        posted = 0
        for _, uid, e in fresh:
            seen.add(uid)
            if posted >= MAX_PER_CATEGORY_PER_RUN:
                continue  # mark as seen, but don't post (keeps channel tidy)
            title = html.escape(e.get("title", "").strip())
            link = e.get("link", "")
            if not title or not link:
                continue
            msg = f"<b>{category}</b>\n\n{title}\n\n<a href=\"{html.escape(link)}\">Read more</a>  {cfg['tag']}"
            if send(msg, preview=True):
                posted += 1
            time.sleep(3)  # Telegram limit ~20 msgs/min per channel
        log.info("%s: posted %d", category, posted)
    save_seen(seen)


# ----------------------------- WEATHER --------------------------------
WMO = {
    0: "Clear sky ☀️", 1: "Mainly clear 🌤", 2: "Partly cloudy ⛅", 3: "Overcast ☁️",
    45: "Fog 🌫", 48: "Rime fog 🌫", 51: "Light drizzle 🌦", 53: "Drizzle 🌦",
    55: "Heavy drizzle 🌧", 61: "Light rain 🌦", 63: "Rain 🌧", 65: "Heavy rain 🌧",
    71: "Light snow 🌨", 73: "Snow 🌨", 75: "Heavy snow ❄️", 80: "Rain showers 🌦",
    81: "Rain showers 🌧", 82: "Violent showers ⛈", 95: "Thunderstorm ⛈",
    96: "Thunderstorm + hail ⛈", 99: "Severe thunderstorm ⛈",
}


def post_weather() -> None:
    r = requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": WEATHER_LAT, "longitude": WEATHER_LON,
            "current": "temperature_2m,apparent_temperature,relative_humidity_2m,"
                       "wind_speed_10m,weather_code",
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
            "timezone": "auto", "forecast_days": 1,
        },
        timeout=20,
    )
    r.raise_for_status()
    d = r.json()
    c, day = d["current"], d["daily"]
    msg = (
        f"<b>🌦 Weather – {html.escape(WEATHER_CITY)}</b>\n\n"
        f"{WMO.get(c['weather_code'], 'N/A')}\n"
        f"🌡 Now: {c['temperature_2m']}°C (feels {c['apparent_temperature']}°C)\n"
        f"🔺 High {day['temperature_2m_max'][0]}°C · 🔻 Low {day['temperature_2m_min'][0]}°C\n"
        f"💧 Humidity {c['relative_humidity_2m']}% · 💨 Wind {c['wind_speed_10m']} km/h\n"
        f"☔ Rain chance today: {day['precipitation_probability_max'][0]}%\n\n"
        f"#Weather"
    )
    send(msg)


# ------------------------------ STOCKS --------------------------------
def quote(symbol: str):
    r = requests.get(
        f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}",
        params={"interval": "1d", "range": "5d"}, headers=UA, timeout=20,
    )
    r.raise_for_status()
    meta = r.json()["chart"]["result"][0]["meta"]
    price = meta["regularMarketPrice"]
    prev = meta.get("chartPreviousClose") or meta.get("previousClose")
    pct = (price - prev) / prev * 100 if prev else 0.0
    return price, pct


def post_stocks() -> None:
    lines = []
    for name, sym in INDICES.items():
        try:
            price, pct = quote(sym)
            arrow = "🟢▲" if pct >= 0 else "🔴▼"
            lines.append(f"{arrow} <b>{name}</b>: {price:,.2f} ({pct:+.2f}%)")
        except Exception as ex:
            log.warning("Quote failed %s: %s", sym, ex)
    if lines:
        now = datetime.now().strftime("%d %b, %H:%M")
        send(f"<b>📈 Market Update</b> · {now}\n\n" + "\n".join(lines) + "\n\n#Stocks #Markets")


# ------------------------------ SCHEDULER -----------------------------
def check_setup() -> None:
    """Fail early with a clear message if token/channel are wrong."""
    if not BOT_TOKEN or not CHANNEL:
        log.error("Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL environment variables.")
        sys.exit(1)
    base = f"https://api.telegram.org/bot{BOT_TOKEN}"
    if not requests.get(f"{base}/getMe", timeout=20).ok:
        log.error("Bot token is invalid. Check TELEGRAM_BOT_TOKEN.")
        sys.exit(1)
    r = requests.get(f"{base}/getChat", params={"chat_id": CHANNEL}, timeout=20)
    if not r.ok:
        log.error("Channel %s not found. Use @username of a PUBLIC channel and add "
                  "the bot as admin with Post Messages.", CHANNEL)
        sys.exit(1)
    log.info("Setup OK. Posting to %s", CHANNEL)


def start_keepalive_server() -> None:
    """Tiny web server so Render 'Web Service' sees an open port (PORT env)."""
    port = os.environ.get("PORT")
    if not port:
        return
    from http.server import BaseHTTPRequestHandler, HTTPServer
    from threading import Thread

    class H(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"news bot running")

        def do_HEAD(self):
            self.send_response(200)
            self.end_headers()

        def log_message(self, *a):
            pass

    Thread(target=lambda: HTTPServer(("0.0.0.0", int(port)), H).serve_forever(),
           daemon=True).start()
    log.info("Keep-alive server on port %s", port)


def run_forever() -> None:
    check_setup()
    start_keepalive_server()
    last = {"news": 0.0, "stocks": 0.0}
    weather_done = set()
    log.info("Bot running. Ctrl+C to stop.")
    while True:
        now = time.time()
        lt = datetime.now()
        try:
            if now - last["news"] >= NEWS_EVERY_MIN * 60:
                post_news()
                last["news"] = time.time()

            if (lt.weekday() < 5 and MARKET_HOURS[0] <= lt.hour < MARKET_HOURS[1]
                    and now - last["stocks"] >= STOCKS_EVERY_MIN * 60):
                post_stocks()
                last["stocks"] = time.time()

            key = (lt.date(), lt.strftime("%H:%M"))
            if lt.strftime("%H:%M") in WEATHER_TIMES and key not in weather_done:
                post_weather()
                weather_done.add(key)
        except Exception as ex:
            log.exception("Loop error: %s", ex)
        time.sleep(30)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "run"
    {
        "run": run_forever,
        "news": post_news,
        "weather": post_weather,
        "stocks": post_stocks,
        "test": lambda: send("✅ News bot connected."),
    }.get(cmd, lambda: print(__doc__))()
