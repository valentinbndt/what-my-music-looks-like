import os
import threading
import time

import requests
from flask import Flask, jsonify

API_KEY = os.environ["LASTFM_API_KEY"]
USER = os.environ["LASTFM_USER"]
LASTFM_URL = "https://ws.audioscrobbler.com/2.0/"
CACHE_SECONDS = 60

app = Flask(__name__)


cache = {"tracks": None, "time": 0.0}
cache_lock = threading.Lock()


def call_lastfm():
    app.logger.warning("Appel a Last.fm")
    reply = requests.get(
        LASTFM_URL,
        params={
            "method": "user.getrecenttracks",
            "user": USER,
            "api_key": API_KEY,
            "format": "json",
            "limit": 30,
        },
        timeout=5,
    )
    reply.raise_for_status()

    tracks = []
    for item in reply.json()["recenttracks"]["track"]:
        tracks.append(
            {
                "title": item["name"],
                "artist": item["artist"]["#text"],
                "album": item["album"]["#text"],
                "playing": item.get("@attr", {}).get("nowplaying") == "true",
                "time": int(item["date"]["uts"]) if "date" in item else None,
            }
        )
    return tracks


@app.get("/api/tracks")
def tracks():
    with cache_lock:
        age = time.time() - cache["time"]
        if cache["tracks"] is None or age >= CACHE_SECONDS:
            cache["tracks"] = call_lastfm()
            cache["time"] = time.time()
            age = 0
    return jsonify(user=USER, tracks=cache["tracks"], cache_age=round(age))