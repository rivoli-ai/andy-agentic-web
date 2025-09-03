# Andy Agentic Web

A modern web platform built with ASP.NET Core 8.0 MVC that enables seamless integration of any Large Language Model (LLM), API, and Model Context Protocol (MCP) server through an intuitive web interface.

> ⚠️ **ALPHA RELEASE WARNING** ⚠️
> 
> This software is in ALPHA stage. **NO GUARANTEES** are made about its functionality, stability, or safety.
> 
> **CRITICAL WARNINGS:**
> - This library performs **DESTRUCTIVE OPERATIONS** on files and directories
> - Permission management is **NOT FULLY TESTED** and may have security vulnerabilities
> - **DO NOT USE** in production environments
> - **DO NOT USE** on systems with critical or irreplaceable data
> - **DO NOT USE** on systems without complete, verified backups
> - The authors assume **NO RESPONSIBILITY** for data loss, system damage, or security breaches
> 
> **USE AT YOUR OWN RISK**

## Overview

Andy Agentic Web provides a unified web-based interface for orchestrating AI agents across different LLM providers, APIs, and MCP servers. It acts as a bridge between various AI services and tools, allowing you to create powerful agentic workflows without being locked into a single provider or protocol.

## Key Features

- **Universal LLM Support**: Connect to any LLM provider (OpenAI, Anthropic, Google, local models, etc.)
- **API Integration**: Seamlessly integrate with any REST or GraphQL API
- **MCP Server Compatibility**: Full support for Model Context Protocol servers
- **Web-Based Interface**: Modern, responsive UI for configuring and managing agents
- **Agent Orchestration**: Create complex multi-agent workflows
- **Real-time Monitoring**: Track agent activities and performance
- **Extensible Architecture**: Plugin system for custom integrations

## Technology Stack

- **Framework**: ASP.NET Core 8.0 MVC
- **View Engine**: Razor Pages
- **Testing**: xUnit
- **Platform**: Cross-platform (.NET 8)
- **Styling**: Bootstrap 5.3 & Font Awesome
- **Database**: Entity Framework Core (ready for integration)

## Prerequisites

- .NET 8.0 SDK or later
- A modern web browser

## Getting Started

### Running the Application

```bash
# Clone the repository
git clone https://github.com/rivoli-ai/andy-agentic-web.git
cd andy-agentic-web

# Restore dependencies
dotnet restore

# Build the solution
dotnet build

# Run the application
dotnet run --project src/Andy.Agentic.Web
```

The application will start on `http://localhost:5030`. Open your browser and navigate to this URL to access the web interface.

### Running Tests

```bash
# Run all tests
dotnet test

# Run tests with coverage
dotnet test --collect:"XPlat Code Coverage"

# Run tests with detailed output
dotnet test --verbosity normal
```

## Project Structure

```
andy-agentic-web/
├── src/
│   └── Andy.Agentic.Web/         # Main ASP.NET Core MVC application
│       ├── Controllers/          # MVC controllers
│       ├── Models/              # Data models
│       ├── Views/               # Razor views
│       │   ├── Home/            # Home controller views
│       │   ├── Shared/          # Shared layouts and partials
│       │   ├── _ViewImports.cshtml
│       │   └── _ViewStart.cshtml
│       ├── wwwroot/             # Static files
│       │   ├── css/             # Stylesheets
│       │   ├── js/              # JavaScript files
│       │   └── lib/             # Client libraries
│       ├── Services/            # Business logic
│       ├── appsettings.json     # Configuration
│       └── Program.cs           # Application entry point
├── tests/
│   └── Andy.Agentic.Web.Tests/  # Unit and integration tests
├── docs/                         # Documentation
├── assets/                       # Project assets
└── .github/
    └── workflows/
        └── ci.yml               # CI/CD pipeline
```

## Configuration

[Configuration documentation will be added as the project develops]

## Development

### MVC Architecture
The application follows the Model-View-Controller pattern with:
- **Models**: Data structures and business entities
- **Views**: Razor views for server-side rendering
- **Controllers**: Handle HTTP requests and return appropriate views or data

### Adding New Features
1. Create a new controller in the Controllers folder
2. Add corresponding views in Views/[ControllerName]/
3. Update navigation in Views/Shared/_Layout.cshtml
4. Add any required styling to wwwroot/css/site.css

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## Security Considerations

This is an alpha release intended for development and testing purposes only. The application:
- May have unpatched security vulnerabilities
- Should not be exposed to public networks
- Should not be used with sensitive data
- Requires careful permission configuration

Always run in isolated environments with appropriate security measures.

## License

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.

## Support

This is an alpha release. Community support is available through:
- GitHub Issues for bug reports and feature requests
- Discussions for general questions and ideas

## Roadmap

- [ ] Core agent orchestration engine
- [ ] LLM provider integrations
- [ ] MCP server support
- [ ] Web UI implementation
- [ ] Authentication and authorization
- [ ] Agent workflow designer
- [ ] Performance monitoring dashboard
- [ ] Plugin marketplace

## Disclaimer

This software is provided "as is" without warranty of any kind. Use at your own risk. The authors are not responsible for any damages or losses arising from its use.