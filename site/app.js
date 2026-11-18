// Tout passe par notre serveur (/api/...), jamais directement par Last.fm.
const REFRESH_MS = 30000; // la page redemande les écoutes toutes les 30 s
const SWAP_MS = 450;      // durée de l'animation « on change de CD »

const els = {
  discman: document.getElementById("discman"),
  cdCover: document.getElementById("cd-cover"),
  now: document.getElementById("now"),
  cover: document.getElementById("cover"),
  title: document.getElementById("title"),
  artist: document.getElementById("artist"),
  when: document.getElementById("when"),
  lcd: document.getElementById("lcd"),
  lcdTrack: document.getElementById("lcd-track"),
  lcdStatus: document.getElementById("lcd-status"),
  progress: document.getElementById("progress"),
  progressFill: document.querySelector(".progress__fill"),
  prev: document.getElementById("btn-prev"),
  pause: document.getElementById("btn-pause"),
  stop: document.getElementById("btn-stop"),
  next: document.getElementById("btn-next"),
  eject: document.getElementById("btn-eject"),
  message: document.getElementById("message"),
  cds: document.getElementById("cds"),
  cdsList: document.getElementById("cds-list"),
  cdsCount: document.getElementById("cds-count"),
  cdsClose: document.getElementById("cds-close"),
};

// L'état de la page
let tracks = [];      // les écoutes reçues du serveur (tracks[0] = la plus récente)
let index = 0;        // le morceau affiché (0 = le plus récent)
let paused = false;   // le bouton pause a été pressé
let stale = false;    // les infos sont peut-être plus à jour (Last.fm ou serveur en panne)
let user = "";

// ---------- Petits outils ----------
const songKey = (t) => `${t.artist}|${t.title}`;
const playKey = (t) => `${t.artist}|${t.title}|${t.time}`;
const albumKey = (t) => `${t.artist}|${t.album || t.title}`;

function pad(number) {
  return String(number).padStart(2, "0");
}

// 225 → "3:45"
function duration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

// Numéro de piste dans l'ordre chronologique : la plus ancienne = 01, la plus récente = la dernière.
function trackNumber(i) {
  return tracks.length - i;
}

function timeAgo(seconds) {
  const minutes = Math.round((Date.now() / 1000 - seconds) / 60);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

// "aujourd'hui à 09:31", "hier à 22:10", "le 14 nov. à 18:02"
function listenedOn(seconds) {
  const date = new Date(seconds * 1000);
  const hour = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return `aujourd'hui à ${hour}`;
  if (date.toDateString() === yesterday.toDateString()) return `hier à ${hour}`;
  const day = date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return `le ${day} à ${hour}`;
}

// Combien de secondes du morceau en cours ont été écoutées ?
// Last.fm note l'heure de DÉBUT de chaque écoute. Si le morceau d'avant a été écouté
// juste avant, le morceau en cours a commencé à : début du précédent + sa durée.
function elapsedSeconds() {
  const current = tracks[0];
  const previous = tracks[1];
  if (!current || !current.playing || !current.duration) return null;
  if (!previous || !previous.time || !previous.duration) return null;
  const elapsed = Date.now() / 1000 - (previous.time + previous.duration);
  if (elapsed < 0 || elapsed > current.duration + 60) return null; // pas écoutés à la suite
  return Math.min(elapsed, current.duration);
}

function coverImage(track) {
  if (!track.cover) return null;
  const img = document.createElement("img");
  img.src = track.cover;
  img.alt = `Pochette de ${track.album || track.title}`;
  img.onerror = () => img.remove();
  return img;
}

// ---------- L'écran LCD et la barre de progression ----------
function paintTime() {
  const track = tracks[index];
  let status;
  let width = null; // null = la barre avance en boucle

  if (track.playing) {
    const elapsed = index === 0 ? elapsedSeconds() : null;
    if (elapsed !== null) {
      status = `${duration(elapsed)}/${duration(track.duration)}`;
      width = (elapsed / track.duration) * 100;
    } else {
      status = track.duration ? `LIVE ${duration(track.duration)}` : "LIVE";
    }
    if (paused) status = "PAUSE";
  } else {
    status = track.duration ? duration(track.duration) : "--:--";
    width = 100; // morceau terminé : barre pleine
  }

  els.lcdStatus.textContent = status;
  const looping = width === null && !paused;
  els.progress.classList.toggle("is-looping", looping);
  els.progressFill.style.width = looping ? "" : `${width ?? 0}%`;
}

// ---------- La fenêtre principale et le Discman ----------
function paint() {
  const track = tracks[index];
  const spinning = track.playing && !paused;

  els.cover.replaceChildren();
  const img = coverImage(track);
  if (img) els.cover.append(img);
  else els.cover.textContent = "♪";

  els.title.textContent = track.title;
  els.artist.textContent = track.artist;
  els.when.textContent = track.playing
    ? "En écoute en ce moment"
    : `Écouté ${listenedOn(track.time)} (${timeAgo(track.time)})`;
  els.when.classList.toggle("is-live", track.playing);

  els.lcdTrack.textContent = `PISTE ${pad(trackNumber(index))}/${pad(tracks.length)}`;
  paintTime();

  els.lcd.classList.toggle("is-paused", paused);
  els.discman.classList.toggle("is-playing", spinning);
  if (track.cover) els.cdCover.setAttribute("href", track.cover);
  else els.cdCover.removeAttribute("href");

  els.pause.classList.toggle("is-active", paused);
  els.pause.setAttribute("aria-pressed", String(paused));
  const single = tracks.length < 2;
  els.prev.disabled = single;
  els.next.disabled = single;
  els.stop.disabled = index === 0 && !paused;

  let text = `Compte Last.fm : ${user} · ${tracks.length} écoutes récentes`;
  if (index !== 0) text += " · ⏹ pour revenir au morceau actuel";
  if (paused) text += " · en pause";
  if (stale) text += " · pas de nouvelles de Last.fm, dernières infos connues";
  els.message.textContent = text;

  markCurrentCd();
}

// Change le morceau affiché, avec ou sans l'animation du CD qu'on remplace.
function showTrack(animate) {
  if (!animate) {
    paint();
    return;
  }
  els.discman.classList.add("is-swapping");
  els.now.classList.add("is-swapping");
  setTimeout(() => {
    paint();
    els.discman.classList.remove("is-swapping");
    els.now.classList.remove("is-swapping");
  }, SWAP_MS);
}

function showError(text) {
  els.cover.replaceChildren();
  els.cover.textContent = "✕";
  els.title.textContent = "Pas de disque";
  els.artist.textContent = "";
  els.when.textContent = "";
  els.when.classList.remove("is-live");
  els.lcdTrack.textContent = "PISTE --/--";
  els.lcdStatus.textContent = "ERR";
  els.lcd.classList.remove("is-paused");
  els.progress.classList.remove("is-looping");
  els.progressFill.style.width = "0%";
  els.discman.classList.remove("is-playing");
  els.cdCover.removeAttribute("href");
  for (const button of [els.prev, els.pause, els.stop, els.next]) button.disabled = true;
  els.message.textContent = text;
}

// ---------- La fenêtre « Mes CD » ----------
function renderCds() {
  const seen = new Set();
  const items = [];

  tracks.forEach((track, i) => {
    const key = albumKey(track);
    if (seen.has(key)) return; // un seul boîtier par album
    seen.add(key);

    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cd-case";
    button.dataset.album = key;

    const sleeve = document.createElement("span");
    sleeve.className = "cd-case__sleeve";
    const img = coverImage(track);
    if (img) sleeve.append(img);
    else sleeve.textContent = "♪";

    const name = document.createElement("span");
    name.className = "cd-case__name";
    name.textContent = track.album || track.title;

    const artist = document.createElement("span");
    artist.className = "cd-case__artist";
    artist.textContent = track.artist;

    button.append(sleeve, name, artist);
    button.addEventListener("click", () => goTo(i));
    li.append(button);
    items.push(li);
  });

  els.cdsList.replaceChildren(...items);
  els.cdsCount.textContent = `${items.length} CD · ${tracks.length} écoutes récentes`;
  markCurrentCd();
}

function markCurrentCd() {
  if (!tracks.length) return;
  const current = albumKey(tracks[index]);
  for (const button of els.cdsList.querySelectorAll(".cd-case")) {
    const active = button.dataset.album === current;
    button.classList.toggle("is-current", active);
    button.setAttribute("aria-current", active ? "true" : "false");
  }
}

function openCds(open) {
  els.cds.hidden = !open;
  els.eject.classList.toggle("is-active", open);
  els.eject.setAttribute("aria-expanded", String(open));
  if (open) els.cds.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ---------- Les boutons ----------
function goTo(newIndex) {
  if (!tracks.length || newIndex === index) return;
  index = newIndex;
  showTrack(true);
}

// ⏮ précédent = plus ancien. Arrivé à la piste 01, on repart de la plus récente.
function previous() {
  goTo(index === tracks.length - 1 ? 0 : index + 1);
}

// ⏭ suivant = plus récent. Arrivé à la plus récente, on repart de la piste 01.
function next() {
  goTo(index === 0 ? tracks.length - 1 : index - 1);
}

els.prev.addEventListener("click", previous);
els.next.addEventListener("click", next);

els.pause.addEventListener("click", () => {
  paused = !paused;
  paint();
});

els.stop.addEventListener("click", () => {
  paused = false;
  if (index === 0) paint();
  else goTo(0);
});

els.eject.addEventListener("click", () => openCds(els.cds.hidden));
els.cdsClose.addEventListener("click", () => openCds(false));

document.addEventListener("keydown", (event) => {
  if (!tracks.length) return;
  if (event.key === "ArrowLeft") previous();
  if (event.key === "ArrowRight") next();
  if (event.key === "Escape") openCds(false);
});

// ---------- Les données ----------
async function refresh() {
  try {
    const reply = await fetch("/api/tracks");
    const d = await reply.json().catch(() => null);
    if (!d) throw new Error("Le serveur ne répond pas.");
    if (d.error) throw new Error(d.error);

    user = d.user;
    stale = d.stale;

    if (d.tracks.length === 0) {
      if (!tracks.length) showError("Aucune écoute pour l'instant. Lance un morceau !");
      return;
    }

    const firstLoad = tracks.length === 0;
    const newSong = !firstLoad && songKey(d.tracks[0]) !== songKey(tracks[0]);

    // Si on regardait un ancien morceau, on le retrouve dans la nouvelle liste.
    let newIndex = 0;
    if (!firstLoad && index > 0) {
      const shown = playKey(tracks[index]);
      newIndex = Math.max(0, d.tracks.findIndex((t) => playKey(t) === shown));
    }

    tracks = d.tracks;
    index = newIndex;
    renderCds();
    showTrack(newSong && index === 0); // nouveau morceau → on change de CD
  } catch (error) {
    if (tracks.length) {
      stale = true; // on garde ce qu'on a déjà, avec un avertissement
      paint();
    } else {
      showError(error.message === "Failed to fetch" ? "Le serveur ne répond pas." : error.message);
    }
  }
}

// Le compteur « 1:23/3:45 » avance chaque seconde.
setInterval(() => {
  if (tracks.length && !paused) paintTime();
}, 1000);

if (location.hash === "#mes-cd") openCds(true);
refresh();
setInterval(refresh, REFRESH_MS);
