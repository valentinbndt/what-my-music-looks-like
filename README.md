# CD Player — what my music looks like

> Projet d'apprentissage (cours Web Technologies) : une application web qui transforme mes dernières écoutes Last.fm en quelque chose à regarder.

## L'idée

Un lecteur CD façon vieux Windows (années 2000), sur un fond bleu ciel un peu brumeux :

- **Un Discman argenté en 3D**, couvercle ouvert, rendu en temps réel avec three.js (métal, reflets, ombre). Le CD porte la pochette du morceau imprimée dessus, et il tourne pendant l'écoute.
- **Une fenêtre « CD Player »** comme sur Windows 98/XP : barre de titre bleue, titre, artiste et moment de l'écoute (« En écoute en ce moment », « Écouté aujourd'hui à 09:31 »), écran LCD vert et barre de progression en segments.
- **L'écran LCD** affiche le numéro de piste (dans l'ordre chronologique : la plus ancienne est la `01`, la plus récente la dernière) et le temps : `0:53/2:27` pendant l'écoute, avec une barre qui avance au même rythme, ou la durée du morceau s'il est terminé.
- **Des boutons qui marchent** :
  - ⏮ (ou ←) passe au morceau précédent, plus ancien ; ⏭ (ou →) au suivant, plus récent. Arrivé au bout, on repart de l'autre extrémité, comme la répétition d'un CD ;
  - ⏸ met le Discman en pause (le temps clignote sur l'écran) ;
  - ⏹ revient au morceau actuel ;
  - ⏏ ouvre la fenêtre **« Mes CD »**, avec un boîtier par album. Cliquer sur un boîtier met ce CD dans le Discman.
- **À chaque nouvelle musique**, la page le remarque toute seule (elle redemande les écoutes toutes les 30 s), le CD sort du Discman et le nouveau prend sa place.

## Lancer l'application

Prérequis : Docker et Docker Compose, et une clé API Last.fm.

1. Créer une clé API Last.fm : <https://www.last.fm/api/account/create>
2. Copier le modèle de configuration :

   ```bash
   cp .env.example .env
   ```

3. Dans `.env`, remplacer `colle-ta-cle-ici` par sa clé, et mettre son pseudo Last.fm.
4. Lancer :

   ```bash
   docker compose up --build
   ```

5. Ouvrir <http://localhost:8080>.

Le fichier `.env` est listé dans `.gitignore` : il n'est jamais envoyé sur GitHub. Sans clé, l'application démarre quand même et affiche un message d'erreur à la place de la musique.

## Comment ça marche

```
Navigateur ──► nginx (port 8080) ──┬──► fichiers du site (index.html, style.css, app.js)
                                   └──► /api/... ──► gunicorn + Flask ──► Last.fm
```

| Service | Rôle |
|---|---|
| `site` (nginx) | La seule porte d'entrée. Sert les fichiers du dossier `site/` et transmet tout ce qui commence par `/api/` à l'API (reverse proxy, voir `nginx.conf`). |
| `api` (gunicorn + Flask) | Garde la clé, appelle Last.fm (`user.getRecentTracks`), simplifie la réponse, la garde en cache et relaie les pochettes. Demande aussi la durée des morceaux (`track.getInfo`), une seule fois par morceau. Aucun port ouvert vers l'extérieur. |

### La durée des morceaux

La liste des écoutes de Last.fm ne donne pas la durée des morceaux. Le serveur la demande avec `track.getInfo`, **une seule fois par morceau** (au plus 3 nouveaux morceaux à chaque rafraîchissement), puis la garde en mémoire pour toujours. Si Last.fm ne la connaît pas, l'écran affiche `--:--`.

Pour le morceau en cours, le temps écoulé est **estimé** : Last.fm note l'heure de *début* de chaque écoute, donc le morceau en cours a commencé quand le précédent s'est terminé (début du précédent + sa durée). Si ce n'est pas possible (pause entre deux morceaux, durée inconnue), l'écran affiche `LIVE` et la barre avance en boucle.

### Les routes de l'API

| Route | Réponse |
|---|---|
| `GET /api/tracks` | `{"user": …, "tracks": [{"title", "artist", "album", "cover", "playing", "time", "duration"}, …], "cache_age": …, "stale": …}`, ou `{"error": …}` avec le code 503 |
| `GET /api/cover/<id>` | L'image d'une pochette, téléchargée chez Last.fm par le serveur. Seules les pochettes fournies par Last.fm sont relayées : un identifiant inconnu donne 404. |

## Structure

```
.
├── api/
│   ├── app.py            le serveur Flask : clé, cache, appel à Last.fm, durées, pochettes
│   ├── Dockerfile        lance gunicorn (1 worker, 8 threads → un seul cache partagé)
│   └── requirements.txt  flask, gunicorn, requests
├── site/
│   ├── index.html        la structure : Discman, fenêtre CD Player, fenêtre Mes CD
│   ├── discman3d.js      le Discman en 3D (three.js) ; le dessin SVG sert de secours sans WebGL
│   ├── vendor/           three.js 0.170 (licence MIT), copié ici pour marcher sans internet
│   ├── style.css         l'apparence : fenêtres façon Windows, animations du Discman
│   └── app.js            récupère les écoutes, gère les boutons et le changement de CD
├── nginx.conf            les règles de nginx : fichiers ou /api/
├── compose.yaml          les deux services, et la clé transmise depuis .env
├── .env.example          le modèle de configuration (sans vraie clé)
└── .gitignore            ignore .env
```

## Les règles du sujet, et comment les vérifier

| Règle | Comment c'est fait | Comment vérifier |
|---|---|---|
| Une forme choisie, pas seulement une liste | Un Discman et un lecteur CD façon Windows | Ouvrir la page |
| Le navigateur ne parle qu'à mon serveur | La page n'appelle que `/api/...`. Même les pochettes passent par `/api/cover/<id>`. | `F12` → Network, filtrer `last` : aucune ligne |
| La clé n'est jamais sur GitHub | Elle est dans `.env` (ignoré par Git), transmise au seul conteneur `api` par une variable d'environnement | Chercher la clé dans le repo et l'historique : rien |
| Deux rechargements = un seul appel à Last.fm | Cache de 60 s dans la mémoire du serveur, protégé par un verrou. Les durées sont gardées pour toujours. | Recharger plusieurs fois, puis `docker compose logs api` : une seule ligne `Appel a Last.fm` (et `Duree demandee` seulement pour un morceau jamais vu) |
| Last.fm injoignable → un message, pas un écran blanc | Le serveur renvoie la dernière copie connue (`stale: true`), ou un 503 avec un message. Après un échec, il attend 15 s avant de réessayer. | Couper le Wi-Fi, attendre une minute, recharger |
| Téléphone et ordinateur | Mise en page qui s'adapte sous 520 px | Rétrécir la fenêtre, ou ouvrir sur un téléphone |
| `docker compose up` lance tout | Deux services, l'image de l'API est construite depuis `api/` | Cloner le repo, créer `.env`, lancer |

## Crédits

- [three.js](https://threejs.org) (licence MIT, voir `site/vendor/LICENSE`) pour le rendu 3D.
- Polices IBM Plex Mono et VT323 (Google Fonts).

## Avancement

- [x] Initialisation du projet
- [x] Serveur Flask avec Docker
- [x] Appel à Last.fm
- [x] Cache des réponses
- [x] Gestion des erreurs
- [x] Première page
- [x] Fenêtre CD Player
- [x] Discman
- [x] Boutons et changement de CD
- [x] Version téléphone
