## FEATURE:

Create a "golden simple template repository" that serves as a state-of-the-art foundation for Node.js full-stack projects. This template should embody modern development best practices and provide a complete, working development environment out of the box.

### Core Components:

**1. Project Structure & Organization**
- Industry-standard directory structure following Node.js best practices
- Clear separation of concerns between frontend, backend, and shared code
- Modular architecture supporting scalability and maintainability
- Configuration management with environment-based settings

**2. Development Tooling & Automation**
- Comprehensive Makefile with all development workflow commands
- Modern build system with hot reload and development server
- Code quality tools: ESLint, Prettier, TypeScript support
- Git hooks for automated quality checks (pre-commit, pre-push)
- Professional .gitignore covering all common scenarios

**3. Testing Infrastructure**
- **Frontend Tests:** Jest + React Testing Library for unit and component tests
- **Backend Tests:** Jest + Supertest for unit and API tests
- **Integration Tests:** End-to-end API and database integration testing
- **System Tests:** Cypress for full application workflow testing
- Test coverage reporting and quality gates
- Dummy test suites demonstrating all test types

**4. Dummy Applications**
- **Frontend:** React.js SPA with routing, state management, and API integration
- **Backend:** Express.js REST API with middleware, routing, and error handling
- Working integration between frontend and backend
- Example components, services, and API endpoints
- Basic authentication flow demonstration

**5. Docker & Deployment**
- Multi-stage Dockerfile optimized for production
- Docker Compose setup for development and production
- Environment variable configuration
- Health checks and proper container lifecycle management
- Ready for deployment to any container platform

**6. Documentation & Guidelines**
- Comprehensive README.md with setup, development, and deployment instructions
- AGENTS.md specifically for AI assistant collaboration
- Code commenting and documentation standards
- Contributing guidelines and project conventions

### Technical Architecture:

**Frontend:** React.js 18+ with TypeScript, React Router, Context API
**Backend:** Node.js + Express.js with TypeScript, middleware architecture
**Build Tools:** Vite for frontend, nodemon for backend development
**Testing:** Jest ecosystem with comprehensive test utilities
**Containerization:** Docker with multi-stage builds and compose orchestration
**Code Quality:** ESLint + Prettier + Husky git hooks

### Directory Structure:
```
template-repo/
├── Makefile                    # Development workflow automation
├── README.md                   # Comprehensive project documentation
├── AGENTS.md                   # AI assistant collaboration guide
├── docker-compose.yml          # Container orchestration
├── Dockerfile                  # Production container build
├── .gitignore                  # Comprehensive ignore patterns
├── .env.example               # Environment configuration template
├── package.json               # Root package management
├── frontend/                  # React application
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── __tests__/         # Frontend unit/component tests
│   └── cypress/               # E2E system tests
├── backend/                   # Express API server
│   ├── package.json
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── utils/
│   │   └── __tests__/         # Backend unit tests
│   └── tests/                 # Integration tests
├── shared/                    # Shared TypeScript types and utilities
└── docs/                      # Additional documentation
```

## EXAMPLES:

**Makefile Commands:**
- `make setup` - Complete project initialization
- `make dev` - Start development servers (frontend + backend)
- `make test` - Run all test suites
- `make test-unit` - Unit tests only
- `make test-integration` - Integration tests only  
- `make test-e2e` - End-to-end system tests
- `make lint` - Code quality checks
- `make build` - Production build
- `make docker-dev` - Start in Docker development mode
- `make docker-prod` - Build and run production container

**Dummy Frontend Features:**
- Home page with navigation
- User authentication mock (login/logout)
- Dashboard with API data display
- Form submission with validation
- Error boundary and loading states
- Responsive design components

**Dummy Backend Features:**
- RESTful API endpoints (/api/users, /api/health)
- Authentication middleware
- Error handling middleware
- Request logging and validation
- CORS configuration
- Rate limiting setup

**Test Examples:**
```javascript
// Frontend component test
test('LoginForm submits with valid credentials', () => {
  render(<LoginForm onSubmit={mockSubmit} />);
  // ... test implementation
});

// Backend API test
describe('GET /api/users', () => {
  it('returns user list with valid auth', async () => {
    const response = await request(app).get('/api/users');
    expect(response.status).toBe(200);
  });
});

// Integration test
describe('User Authentication Flow', () => {
  it('authenticates user end-to-end', async () => {
    // ... full flow test
  });
});
```

**Docker Multi-stage Build:**
```dockerfile
# Development stage
FROM node:18-alpine AS development
# ... dev dependencies and setup

# Build stage  
FROM node:18-alpine AS build
# ... production build

# Production stage
FROM node:18-alpine AS production
# ... minimal runtime image
```

## DOCUMENTATION:

**Node.js Best Practices:**
- https://nodejs.org/en/docs/guides/nodejs-docker-webapp/ - Docker deployment patterns
- https://github.com/goldbergyoni/nodebestpractices - Comprehensive Node.js guidelines
- https://expressjs.com/en/advanced/best-practice-security.html - Express security practices

**React & Frontend Architecture:**
- https://react.dev/learn/thinking-in-react - React mental models
- https://vitejs.dev/guide/ - Modern build tooling with Vite
- https://testing-library.com/docs/react-testing-library/intro/ - Component testing best practices

**Testing Strategies:**
- https://jestjs.io/docs/getting-started - Jest testing framework
- https://docs.cypress.io/guides/overview/why-cypress - End-to-end testing
- https://github.com/visionmedia/supertest - API testing utilities

**Docker & Containerization:**
- https://docs.docker.com/develop/dev-best-practices/ - Docker development best practices
- https://docs.docker.com/compose/ - Multi-container orchestration
- https://github.com/BretFisher/node-docker-good-defaults - Node.js Docker optimization

**Code Quality & Tooling:**
- https://eslint.org/docs/latest/ - ESLint configuration and rules
- https://prettier.io/docs/en/configuration.html - Code formatting standards
- https://typicode.github.io/husky/ - Git hooks automation

## OTHER CONSIDERATIONS:

**Security Best Practices:**
- Helmet.js for Express security headers
- Input validation and sanitization
- Environment variable security (no secrets in code)
- Docker security scanning and non-root user setup
- HTTPS redirect configuration for production

**Performance Optimization:**
- Frontend code splitting and lazy loading
- Backend response compression and caching headers
- Docker image layer optimization
- Asset optimization and minification
- Database connection pooling setup (for future database integration)

**Development Experience:**
- Hot module replacement for instant feedback
- Source maps for debugging in development
- Comprehensive error messages and stack traces
- Development vs production environment configuration
- IDE configuration files (.vscode/settings.json)

**Monitoring & Observability:**
- Health check endpoints for container orchestration
- Structured logging with correlation IDs
- Basic metrics collection points
- Error tracking integration points
- Performance monitoring hooks

**Extensibility & Future-Proofing:**
- Plugin architecture for middleware
- Configuration-driven feature flags
- Database abstraction layer preparation
- API versioning strategy
- Internationalization (i18n) foundation

**CI/CD Preparation:**
- GitHub Actions workflow templates
- Automated testing in CI pipeline
- Docker image building and tagging
- Security vulnerability scanning
- Automated dependency updates

**Success Criteria:**
1. Complete project setup with single `make setup` command
2. Development environment starts with `make dev` and provides hot reload
3. All test suites pass and demonstrate different testing strategies
4. Frontend and backend integration works seamlessly
5. Docker container builds and runs in both development and production modes
6. Code quality tools (lint, format, type check) work automatically
7. Documentation is comprehensive and enables immediate contribution
8. Project structure follows industry best practices and scales well
9. Template can be cloned and immediately productive for new projects
10. AI assistants can effectively collaborate using AGENTS.md guidance
11. Repository achieves "golden template" status: clean, professional, and comprehensive
12. Zero configuration needed for common development workflows