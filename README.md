# CD Player - what my music looks like

> Projet d'apprentissage (cours Web Technologies) : une application web qui transforme mes dernières écoutes Last.fm en quelque chose à regarder.

## L'idée

Un lecteur CD façon vieux Windows (années 2000), sur un fond bleu ciel un peu brumeux :

- **Un Discman argenté**, couvercle ouvert, avec un CD qui porte la pochette du morceau en cours et qui tourne pendant l'écoute.
- **Une fenêtre « CD Player »** comme sur Windows 98/XP : barre de titre bleue, titre et artiste, écran LCD vert, barre de progression et boutons.
- **Les boutons ⏮ ⏭** font défiler mes dernières écoutes, et **⏏** ouvre une fenêtre « Mes CD » avec les pochettes.
- **À chaque nouvelle musique**, le CD est changé et la fenêtre se met à jour.

## Comment ça marche

Navigateur --> mon serveur --> Last.fm (user.getRecentTracks)

- Le navigateur ne parle **qu'à mon serveur**, jamais directement à Last.fm.
- La **clé API** reste sur le serveur, dans une variable d'environnement (fichier `.env`). Elle n'est jamais dans le code ni sur GitHub.
- Le serveur **garde les réponses de Last.fm en cache** quelques instants : beaucoup de visiteurs ne veulent pas dire beaucoup d'appels.
- Si Last.fm ne répond pas, la page affiche un message au lieu d'un écran blanc.
- La page fonctionne sur **téléphone** et sur **ordinateur**.

## Configuration

1. Créer une clé API Last.fm : <https://www.last.fm/api/account/create>
2. Copier le modèle de configuration :

   ```bash
   cp .env.example .env

3. Dans .env, remplacer colle-ta-cle-ici par sa clé et mettre son pseudo Last.fm.

Le fichier .env est listé dans .gitignore : il n'est jamais envoyé sur GitHub.

## Lancer l'application

Prérequis : Docker et Docker Compose.

```bash
docker compose up --build
```

Puis ouvrir <http://localhost:8080>.

## Avancement

- [x] Initialisation du projet
- [x] Serveur Flask avec Docker
- [ ] Appel à Last.fm
- [ ] Cache des réponses
- [ ] Gestion des erreurs
- [ ] Première page
- [ ] Fenêtre CD Player
- [ ] Discman
- [ ] Boutons et changement de CD
- [ ] Version téléphone