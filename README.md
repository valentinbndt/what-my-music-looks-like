# CD Player — what my music looks like

> Projet d'apprentissage (cours Web Technologies) : une application web qui transforme mes dernières écoutes Last.fm en quelque chose à regarder.

## L'idée

Un lecteur CD façon vieux Windows (années 20 peu brumeux :

- **Un Discman argenté**, couvercle ouvert, tte du morceau en cours et qui tourne pendant l'écoute.
- **Une fenêtre « CD Player »** comme sur Wibleue, titre et artiste, écran LCD vert,barre de progression et boutons.
- **Les boutons ⏮ ⏭** font défiler mes derniune fenêtre « Mes CD » avec les pochettes.
- **À chaque nouvelle musique**, le CD est changé et la fenêtre se met à jour.

## Comment ça marche

Navigateur ──► mon serveur ──► Last.fm (user.getRecentTracks)

- Le navigateur ne parle **qu'à mon serveur**, jamais directement à Last.fm.
- La **clé API** reste sur le serveur, dans (fichier `.env`). Elle n'est jamais dans lecode ni sur GitHub.
- Le serveur **garde les réponses de Last.fm : beaucoup de visiteurs ne veulent pas direbeaucoup d'appels.
- Si Last.fm ne répond pas, la page affiche  blanc.
- La page fonctionne sur **téléphone** et sur **ordinateur**.

## Configuration

1. Créer une clé API Last.fm : <https://www.last.fm/api/account/create>
2. Copier le modèle de configuration :

   ```bash
   cp .env.example .env

3. Dans .env, remplacer colle-ta-cle-ici par sa clé et mettre son pseudo Last.fm.

Le fichier .env est listé dans .gitignore : il n'est jamais envoyé sur GitHub.

## Lancer l'application

En cours de construction : docker compose up arrive à la prochaine étape.

## Avancement

- [x] Initialisation du projet
- [ ] Serveur Flask avec Docker
- [ ] Appel à Last.fm
- [ ] Cache des réponses
- [ ] Gestion des erreurs
- [ ] Première page
- [ ] Fenêtre CD Player
- [ ] Discman
- [ ] Boutons et changement de CD
- [ ] Version téléphone