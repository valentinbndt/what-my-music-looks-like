const els = {
  cover: document.getElementById("cover"),
  title: document.getElementById("title"),
  artist: document.getElementById("artist"),
  lcd: document.getElementById("lcd"),
  lcdTrack: document.getElementById("lcd-track"),
  lcdStatus: document.getElementById("lcd-status"),
  progress: document.getElementById("progress"),
  pause: document.getElementById("btn-pause"),
  message: document.getElementById("message"),
};

let tracks = [];
let index = 0;

function pad(number) {
  return String(number).padStart(2, "0");
}

function clock(seconds) {
  return new Date(seconds * 1000).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(seconds) {
  const minutes = Math.round((Date.now() / 1000 - seconds) / 60);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

function showCover(track) {
  els.cover.replaceChildren();
  if (track.cover) {
    const img = document.createElement("img");
    img.src = track.cover;
    img.alt = `Pochette de ${track.album || track.title}`;
    els.cover.append(img);
  } else {
    els.cover.textContent = "♪";
  }
}

function showTrack() {
  const track = tracks[index];
  showCover(track);
  els.title.textContent = track.title;
  els.artist.textContent = track.artist;
  els.lcdTrack.textContent = `${pad(index + 1)}/${pad(tracks.length)}`;
  els.lcdStatus.textContent = track.playing ? "LIVE" : clock(track.time);
  els.lcd.classList.toggle("is-playing", track.playing);
  els.progress.classList.toggle("is-playing", track.playing);
  els.progress.classList.toggle("is-done", !track.playing);
  els.pause.classList.toggle("is-active", track.playing);
}

function showError(text) {
  els.cover.replaceChildren();
  els.cover.textContent = "✕";
  els.title.textContent = "Pas de disque";
  els.artist.textContent = "";
  els.lcdTrack.textContent = "--/--";
  els.lcdStatus.textContent = "ERR";
  els.lcd.classList.remove("is-playing");
  els.progress.classList.remove("is-playing", "is-done");
  els.pause.classList.remove("is-active");
  els.message.textContent = text;
}

fetch("/api/tracks")
  .then((r) => r.json())
  .then((d) => {
    if (d.error) {
      showError(d.error);
      return;
    }
    if (d.tracks.length === 0) {
      showError("Aucune écoute pour l'instant. Lance un morceau !");
      return;
    }

    tracks = d.tracks;
    index = 0;
    showTrack();

    const first = tracks[0];
    let text = first.playing
      ? `En écoute sur le compte de ${d.user}`
      : `Dernière écoute ${timeAgo(first.time)}`;
    if (d.stale) {
      text += " · Last.fm ne répond pas, dernières infos connues";
    }
    els.message.textContent = text;
  })
  .catch(() => showError("Le serveur ne répond pas."));