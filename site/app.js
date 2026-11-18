const list = document.getElementById("list");
const message = document.getElementById("message");

function timeAgo(seconds) {
  const minutes = Math.round((Date.now() / 1000 - seconds) / 60);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

function showTracks(tracks) {
  list.replaceChildren();

  for (const t of tracks) {
    const li = document.createElement("li");

    const cover = document.createElement(t.cover ? "img" : "div");
    cover.className = "cover";
    if (t.cover) {
      cover.src = t.cover;
      cover.alt = `Pochette de ${t.album}`;
    }

    const text = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = t.title;
    const info = document.createElement("span");
    info.textContent = `${t.artist} · ${t.playing ? "en écoute" : timeAgo(t.time)}`;
    text.append(title, info);

    li.append(cover, text);
    list.append(li);
  }
}

fetch("/api/tracks")
  .then((r) => r.json())
  .then((d) => {
    if (d.error) {
      message.textContent = d.error;
      return;
    }
    if (d.tracks.length === 0) {
      message.textContent = "Aucune écoute pour l'instant. Lance un morceau !";
      return;
    }
    message.textContent = d.stale
      ? "Last.fm ne répond pas : voici les dernières écoutes connues."
      : "";
    showTracks(d.tracks);
  })
  .catch(() => (message.textContent = "Le serveur ne répond pas."));