import hashlib
import os
import threading
import time

import requests
from flask import Flask, Response, abort, jsonify

API_KEY = os.environ.get("LASTFM_API_KEY", "")
USER = os.environ.get("LASTFM_USER", "")
LASTFM_URL = "https://ws.audioscrobbler.com/2.0/"
LASTFM_NO_COVER = "2a96cbd8b46e442fc41c2b86b821562f"
CACHE_SECONDS = 60
RETRY_SECONDS = 15

app = Flask(__name__)

cache = {"tracks": None, "time": 0.0, "error_time": 0.0}
cache_lock = threading.Lock()

# Pochettes : le navigateur demande /api/cover/<id>, le serveur va chercher l'image lui-même.
cover_urls = {}   # id -> adresse de l'image chez Last.fm
cover_files = {}  # id -> (type de l'image, contenu de l'image)


def remember_cover(images):
    url = images[-1]["#text"] if images else ""
    if not url or LASTFM_NO_COVER in url:
        return None
    cover_id = hashlib.sha1(url.encode()).hexdigest()[:16]
    cover_urls[cover_id] = url
    return f"/api/cover/{cover_id}"


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
                "cover": remember_cover(item.get("image", [])),
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


@app.get("/api/cover/<cover_id>")
def cover(cover_id):
    url = cover_urls.get(cover_id)
    if url is None:
        abort(404)

    if cover_id not in cover_files:
        try:
            reply = requests.get(url, timeout=5)
            reply.raise_for_status()
        except requests.RequestException:
            abort(502)
        if len(cover_files) > 200:
            cover_files.clear()
        cover_files[cover_id] = (reply.headers.get("Content-Type", "image/jpeg"), reply.content)

    content_type, data = cover_files[cover_id]
    return Response(data, mimetype=content_type, headers={"Cache-Control": "public, max-age=86400"})