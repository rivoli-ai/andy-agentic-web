# Agentic - AI Agent Management Platform

A modern and responsive Angular application for managing AI agents with a modular architecture and advanced features.

## 🚀 Features

### Agent Management
- ✅ Create, edit, delete and execute agents
- ✅ Complete configuration: name, description, type, prompts, tools, MCP servers
- ✅ Tags and categories system
- ✅ Advanced search and filtering
- ✅ Execution statistics

### User Interface
- ✅ Modern design with TailwindCSS
- ✅ Light/dark theme with localStorage
- ✅ Responsive layout (desktop, tablet, mobile)
- ✅ Navigation sidebar
- ✅ Smooth animations
- ✅ Toast notifications

### Architecture
- ✅ Modular Angular 16+ architecture
- ✅ Reactive services with RxJS
- ✅ Typed TypeScript models
- ✅ Mock data for development
- ✅ Scalable structure for REST/GraphQL API

## 🛠️ Technologies Used

- **Frontend**: Angular 16.2.16
- **Styling**: TailwindCSS 3.x
- **State Management**: RxJS with BehaviorSubject
- **Icons**: Heroicons (SVG)
- **Build Tool**: Angular CLI

## 📁 Project Structure

```
src/
├── app/
│   ├── core/                 # Global services and interceptors
│   │   ├── services/
│   │   │   ├── agent.service.ts
│   │   │   ├── notification.service.ts
│   │   │   └── theme.service.ts
│   │   ├── interceptors/    # HTTP interceptors
│   │   └── guards/          # Route guards
│   ├── shared/              # Reusable components
│   │   ├── components/
│   │   │   └── notification-toast/
│   │   ├── pipes/
│   │   └── directives/
│   ├── features/            # Functional modules
│   │   ├── agents/          # Agent management
│   │   ├── tools/           # Tool management
│   │   ├── mcp/             # MCP server management
│   │   └── settings/        # Settings
│   ├── models/              # Interfaces and types
│   │   ├── agent.model.ts
│   │   ├── notification.model.ts
│   │   └── theme.model.ts
│   └── app.component.*      # Main component
├── assets/                  # Static resources
└── styles.css              # Global TailwindCSS styles
```

## 🚀 Installation and Setup

### Prerequisites
- Node.js 20.13+ (recommended: 20.19+)
- npm 10.5+ or yarn
- Docker and Docker Compose (optional)

### Installation

#### Option 1: Local Development

1. **Clone the project**
   ```bash
   git clone <repository-url>
   cd agentic-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

4. **Open in browser**
   ```
   http://localhost:4200
   ```

#### Option 2: Docker (Recommended for production)

1. **Clone the project**
   ```bash
   git clone <repository-url>
   cd agentic-app
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Open in browser**
   ```
   http://localhost:8080
   ```

### Available Scripts

- `npm start` - Start development server
- `npm run build` - Production build
- `npm run test` - Run unit tests
- `npm run lint` - Check code with ESLint

## 🎯 Usage

### Navigation
- **Agents**: Complete AI agent management
- **Tools**: Tool and API configuration
- **MCP Servers**: Model Context Protocol server management
- **Settings**: Application settings

### Agent Management
1. Click "New Agent" to create a new agent
2. Configure name, description and type
3. Add custom prompts
4. Connect tools and MCP servers
5. Add tags for organization
6. Execute the agent to test

### Theme
- Use the theme button in the header to toggle between light/dark
- Theme is automatically saved in localStorage
- Automatic detection of system preferences

## 🔧 Configuration

### TailwindCSS
The `tailwind.config.js` file contains:
- Custom colors (primary, secondary, success, warning, error)
- Custom animations
- Dark mode support
- Plugins for forms and typography

### Environment Variables
Create a `src/environments/environment.ts` file:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  // Other configurations...
};
```

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run e2e
```

## 📦 Build and Deployment

### Production Build
```bash
npm run build
```

### Build with Optimizations
```bash
npm run build --prod
```

### Bundle Analysis
```bash
npm run build --stats-json
npx webpack-bundle-analyzer dist/agentic-app/stats.json
```

## 🚀 Deployment

### Docker

#### Docker Compose (Recommended)
```bash
# Start the application with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

The application will be accessible at `http://localhost:8080`

#### Docker Compose with Nginx Proxy (Production)
```bash
# Start with Nginx proxy for production
docker-compose --profile production up -d
```

#### Dockerfile only
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

#### Individual Docker commands
```bash
# Build the image
docker build -t agentic-app .

# Run the container
docker run -d -p 8080:80 --name agentic-app agentic-app

# Stop and remove the container
docker stop agentic-app && docker rm agentic-app
```

### GitHub Pages
```bash
npm install -g angular-cli-ghpages
ng build --prod --base-href "https://username.github.io/repository-name/"
ngh
```

## 🔮 Roadmap

### Phase 1 (Current)
- ✅ Base interface with agent management
- ✅ Light/dark theme system
- ✅ Toast notifications
- ✅ Mock data and services

### Phase 2
- [ ] Agent creation/editing forms
- [ ] Prompt management with variables
- [ ] Tools and MCP servers configuration
- [ ] Drag & drop for element reordering

### Phase 3
- [ ] REST/GraphQL backend API
- [ ] JWT authentication
- [ ] Service Worker (PWA)
- [ ] JSON export/import

### Phase 4
- [ ] Complete testing (unit, e2e)
- [ ] CI/CD with GitHub Actions
- [ ] API documentation
- [ ] Monitoring and analytics

## 🤝 Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License. See the `LICENSE` file for more details.

## 🔧 Docker Troubleshooting

### Common Issues

#### Port already in use
```bash
# Check which process is using port 80
netstat -tulpn | grep :80

# Change the port in docker-compose.yml
ports:
  - "8080:80"  # Use port 8080 instead of 80
```

#### Build issues
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# View detailed logs
docker-compose logs --tail=100 agentic-app
```

#### Permission issues
```bash
# On Linux/macOS, adjust permissions
sudo chown -R $USER:$USER .

# Or use Docker without sudo
sudo usermod -aG docker $USER
```

### Useful Commands
```bash
# View container status
docker-compose ps

# Restart a service
docker-compose restart agentic-app

# Access container shell
docker-compose exec agentic-app sh

# View resource usage
docker stats agentic-app
```

## 📞 Support

For any questions or issues:
- Open an issue on GitHub
- Contact the development team

---

**Agentic** - Intelligent AI Agent Management 🚀
