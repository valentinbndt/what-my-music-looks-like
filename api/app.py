import os
import threading
import time

import requests
from flask import Flask, jsonify

API_KEY = os.environ.get("LASTFM_API_KEY", "")
USER = os.environ.get("LASTFM_USER", "")
LASTFM_URL = "https://ws.audioscrobbler.com/2.0/"
CACHE_SECONDS = 60
RETRY_SECONDS = 15

app = Flask(__name__)

cache = {"tracks": None, "time": 0.0, "error_time": 0.0}
cache_lock = threading.Lock()


def call_lastfm():
    if not API_KEY or not USER:
        raise RuntimeError("LASTFM_API_KEY ou LASTFM_USER manquant dans .env")

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
    body = reply.json()
    if "error" in body:
        raise RuntimeError(f"Last.fm a repondu l'erreur {body['error']} : {body['message']}")
    reply.raise_for_status()

    tracks = []
    for item in body["recenttracks"]["track"]:
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
        now = time.time()
        too_old = cache["tracks"] is None or now - cache["time"] >= CACHE_SECONDS
        failed_recently = now - cache["error_time"] < RETRY_SECONDS

        if too_old and not failed_recently:
            try:
                cache["tracks"] = call_lastfm()
                cache["time"] = now
            except Exception as error:
                app.logger.warning("Last.fm ne repond pas : %s", error)
                cache["error_time"] = now

        if cache["tracks"] is None:
            return jsonify(error="Last.fm ne répond pas pour le moment."), 503

        age = time.time() - cache["time"]

    return jsonify(
        user=USER,
        tracks=cache["tracks"],
        cache_age=round(age),
        stale=age >= CACHE_SECONDS,
    )