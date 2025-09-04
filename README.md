# Agentic - AI Agent Management Platform

Une application Angular moderne et responsive pour la gestion d'agents IA avec une architecture modulaire et des fonctionnalités avancées.

## 🚀 Fonctionnalités

### Gestion d'Agents
- ✅ Création, édition, suppression et exécution d'agents
- ✅ Configuration complète : nom, description, type, prompts, tools, MCP servers
- ✅ Système de tags et catégories
- ✅ Recherche et filtrage avancés
- ✅ Statistiques d'exécution

### Interface Utilisateur
- ✅ Design moderne avec TailwindCSS
- ✅ Thème clair/sombre avec localStorage
- ✅ Layout responsive (desktop, tablette, mobile)
- ✅ Sidebar de navigation
- ✅ Animations fluides
- ✅ Notifications toast

### Architecture
- ✅ Architecture modulaire Angular 16+
- ✅ Services réactifs avec RxJS
- ✅ Modèles TypeScript typés
- ✅ Mock data pour le développement
- ✅ Structure scalable pour API REST/GraphQL

## 🛠️ Technologies Utilisées

- **Frontend**: Angular 16.2.16
- **Styling**: TailwindCSS 3.x
- **State Management**: RxJS avec BehaviorSubject
- **Icons**: Heroicons (SVG)
- **Build Tool**: Angular CLI

## 📁 Structure du Projet

```
src/
├── app/
│   ├── core/                 # Services et intercepteurs globaux
│   │   ├── services/
│   │   │   ├── agent.service.ts
│   │   │   ├── notification.service.ts
│   │   │   └── theme.service.ts
│   │   ├── interceptors/    # Intercepteurs HTTP
│   │   └── guards/          # Guards de route
│   ├── shared/              # Composants réutilisables
│   │   ├── components/
│   │   │   └── notification-toast/
│   │   ├── pipes/
│   │   └── directives/
│   ├── features/            # Modules fonctionnels
│   │   ├── agents/          # Gestion des agents
│   │   ├── tools/           # Gestion des outils
│   │   ├── mcp/             # Gestion des serveurs MCP
│   │   └── settings/        # Paramètres
│   ├── models/              # Interfaces et types
│   │   ├── agent.model.ts
│   │   ├── notification.model.ts
│   │   └── theme.model.ts
│   └── app.component.*      # Composant principal
├── assets/                  # Ressources statiques
└── styles.css              # Styles globaux TailwindCSS
```

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 20.13+ (recommandé: 20.19+)
- npm 10.5+ ou yarn
- Docker et Docker Compose (optionnel)

### Installation

#### Option 1: Développement local

1. **Cloner le projet**
   ```bash
   git clone <repository-url>
   cd agentic-app
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Démarrer l'application**
   ```bash
   npm start
   ```

4. **Ouvrir dans le navigateur**
   ```
   http://localhost:4200
   ```

#### Option 2: Docker (Recommandé pour la production)

1. **Cloner le projet**
   ```bash
   git clone <repository-url>
   cd agentic-app
   ```

2. **Démarrer avec Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Ouvrir dans le navigateur**
   ```
   http://localhost:80
   ```

### Scripts Disponibles

- `npm start` - Démarre le serveur de développement
- `npm run build` - Build de production
- `npm run test` - Lance les tests unitaires
- `npm run lint` - Vérifie le code avec ESLint

## 🎯 Utilisation

### Navigation
- **Agents** : Gestion complète des agents IA
- **Tools** : Configuration des outils et API
- **MCP Servers** : Gestion des serveurs Model Context Protocol
- **Settings** : Paramètres de l'application

### Gestion des Agents
1. Cliquer sur "New Agent" pour créer un nouvel agent
2. Configurer le nom, description et type
3. Ajouter des prompts personnalisés
4. Connecter des tools et serveurs MCP
5. Ajouter des tags pour l'organisation
6. Exécuter l'agent pour tester

### Thème
- Utiliser le bouton de thème dans le header pour basculer entre clair/sombre
- Le thème est automatiquement sauvegardé dans localStorage
- Détection automatique des préférences système

## 🔧 Configuration

### TailwindCSS
Le fichier `tailwind.config.js` contient :
- Couleurs personnalisées (primary, secondary, success, warning, error)
- Animations personnalisées
- Support du mode sombre
- Plugins pour les formulaires et la typographie

### Variables d'Environnement
Créer un fichier `src/environments/environment.ts` :
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  // Autres configurations...
};
```

## 🧪 Tests

### Tests Unitaires
```bash
npm run test
```

### Tests E2E
```bash
npm run e2e
```

## 📦 Build et Déploiement

### Build de Production
```bash
npm run build
```

### Build avec Optimisations
```bash
npm run build --prod
```

### Analyse du Bundle
```bash
npm run build --stats-json
npx webpack-bundle-analyzer dist/agentic-app/stats.json
```

## 🚀 Déploiement

### Docker

#### Docker Compose (Recommandé)
```bash
# Démarrer l'application avec Docker Compose
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter l'application
docker-compose down

# Rebuild et redémarrer
docker-compose up -d --build
```

L'application sera accessible sur `http://localhost:80`

#### Docker Compose avec Proxy Nginx (Production)
```bash
# Démarrer avec le proxy Nginx pour la production
docker-compose --profile production up -d
```

#### Dockerfile seul
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist/agentic-app /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Commandes Docker individuelles
```bash
# Build de l'image
docker build -t agentic-app .

# Exécution du conteneur
docker run -d -p 80:80 --name agentic-app agentic-app

# Arrêter et supprimer le conteneur
docker stop agentic-app && docker rm agentic-app
```

### GitHub Pages
```bash
npm install -g angular-cli-ghpages
ng build --prod --base-href "https://username.github.io/repository-name/"
ngh
```

## 🔮 Roadmap

### Phase 1 (Actuelle)
- ✅ Interface de base avec gestion des agents
- ✅ Système de thème clair/sombre
- ✅ Notifications toast
- ✅ Mock data et services

### Phase 2
- [ ] Formulaires de création/édition d'agents
- [ ] Gestion des prompts avec variables
- [ ] Configuration des tools et MCP servers
- [ ] Drag & drop pour réorganiser les éléments

### Phase 3
- [ ] API REST/GraphQL backend
- [ ] Authentification JWT
- [ ] Service Worker (PWA)
- [ ] Export/Import JSON

### Phase 4
- [ ] Tests complets (unit, e2e)
- [ ] CI/CD avec GitHub Actions
- [ ] Documentation API
- [ ] Monitoring et analytics

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🔧 Dépannage Docker

### Problèmes courants

#### Port déjà utilisé
```bash
# Vérifier quel processus utilise le port 80
netstat -tulpn | grep :80

# Changer le port dans docker-compose.yml
ports:
  - "8080:80"  # Utiliser le port 8080 au lieu de 80
```

#### Problèmes de build
```bash
# Nettoyer le cache Docker
docker system prune -a

# Rebuild sans cache
docker-compose build --no-cache

# Voir les logs détaillés
docker-compose logs --tail=100 agentic-app
```

#### Problèmes de permissions
```bash
# Sur Linux/macOS, ajuster les permissions
sudo chown -R $USER:$USER .

# Ou utiliser Docker sans sudo
sudo usermod -aG docker $USER
```

### Commandes utiles
```bash
# Voir l'état des conteneurs
docker-compose ps

# Redémarrer un service
docker-compose restart agentic-app

# Accéder au shell du conteneur
docker-compose exec agentic-app sh

# Voir l'utilisation des ressources
docker stats agentic-app
```

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Contacter l'équipe de développement

---

**Agentic** - Gestion intelligente d'agents IA 🚀
