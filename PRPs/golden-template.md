name: "Golden Template Repository PRP"
description: |
  Create a state-of-the-art Node.js full-stack template repository that serves as the foundation for modern web applications with comprehensive tooling, testing, and deployment infrastructure.

## Goal
Build a "golden simple template repository" that embodies modern development best practices and provides a complete, working development environment out of the box. This template should be immediately productive for new projects and serve as the foundation for the Sofathek application.

## Why
- **Reusability**: Create a foundation template for multiple future projects
- **Best Practices**: Establish industry-standard patterns and tooling
- **Developer Experience**: Provide zero-configuration development workflow
- **Quality Assurance**: Built-in testing, linting, and validation at all levels
- **Production Ready**: Docker deployment and monitoring capabilities

## What
A complete full-stack Node.js template with React frontend, Express backend, comprehensive testing suite, Docker deployment, and professional documentation. Every component should be working and demonstrable.

### Success Criteria
- [ ] Complete project setup with single `make setup` command
- [ ] Development environment starts with `make dev` and provides hot reload
- [ ] All test suites pass (unit, integration, e2e) demonstrating different strategies
- [ ] Frontend and backend integration works seamlessly
- [ ] Docker container builds and runs in both development and production modes
- [ ] Code quality tools (lint, format, type check) work automatically
- [ ] Documentation enables immediate contribution and AI collaboration
- [ ] Project structure follows industry best practices and scales well
- [ ] Template can be cloned and immediately productive for new projects
- [ ] Repository achieves "golden template" status: clean, professional, comprehensive

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://nodejs.org/en/docs/guides/nodejs-docker-webapp/
  why: Docker deployment patterns and best practices for Node.js

- url: https://github.com/goldbergyoni/nodebestpractices
  why: Comprehensive Node.js guidelines and project structure standards

- url: https://expressjs.com/en/advanced/best-practice-security.html
  why: Express security practices and middleware patterns

- url: https://react.dev/learn/thinking-in-react
  why: React mental models and component architecture

- url: https://vitejs.dev/guide/
  why: Modern build tooling configuration and optimization

- url: https://testing-library.com/docs/react-testing-library/intro/
  why: Component testing best practices and patterns

- url: https://jestjs.io/docs/getting-started
  why: Jest testing framework setup and configuration

- url: https://docs.cypress.io/guides/overview/why-cypress
  why: End-to-end testing implementation

- url: https://eslint.org/docs/latest/
  why: ESLint configuration and modern rules

- url: https://prettier.io/docs/en/configuration.html
  why: Code formatting standards and automation

- url: https://typicode.github.io/husky/
  why: Git hooks automation for quality gates

- url: https://docs.docker.com/develop/dev-best-practices/
  why: Docker development best practices

- url: https://docs.docker.com/compose/
  why: Multi-container orchestration patterns
```

### Current Codebase tree
```bash
.
├── .claude/
│   └── commands/
│       ├── execute-prp.md
│       └── generate-prp.md
├── examples/
├── .gitignore
├── INITIAL.md
├── INITIAL_SOFATHEK.md
├── INITIAL_TEMPLATE.md
├── LICENSE
├── PRPs/
│   ├── ai_docs/
│   └── templates/
│       └── prp_base.md
└── README.md

# This is a basic project with PRP framework - needs complete template implementation
```

### Desired Codebase tree with files to be added and responsibility
```bash
template-repo/
├── Makefile                    # Development workflow automation
├── README.md                   # Comprehensive project documentation  
├── AGENTS.md                   # AI assistant collaboration guide
├── docker-compose.yml          # Container orchestration
├── docker-compose.dev.yml      # Development environment
├── Dockerfile                  # Multi-stage production build
├── .dockerignore              # Docker build optimization
├── .gitignore                  # Comprehensive ignore patterns
├── .env.example               # Environment configuration template
├── .eslintrc.js               # ESLint configuration
├── .prettierrc                # Prettier formatting rules
├── package.json               # Root package management and scripts
├── tsconfig.json              # TypeScript configuration
├── jest.config.js             # Jest testing configuration
├── .husky/                    # Git hooks
│   ├── pre-commit
│   └── pre-push
├── .vscode/                   # IDE configuration
│   └── settings.json
├── frontend/                  # React application
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── src/
│   │   ├── App.tsx            # Main application component
│   │   ├── main.tsx           # Application entry point
│   │   ├── components/        # Reusable UI components
│   │   │   ├── Layout/
│   │   │   ├── LoginForm/
│   │   │   ├── Dashboard/
│   │   │   └── ErrorBoundary/
│   │   ├── pages/             # Route components
│   │   │   ├── Home/
│   │   │   ├── Login/
│   │   │   └── Dashboard/
│   │   ├── services/          # API integration layer
│   │   │   └── api.ts
│   │   ├── hooks/             # Custom React hooks
│   │   │   └── useAuth.ts
│   │   ├── context/           # React Context providers
│   │   │   └── AuthContext.tsx
│   │   ├── types/             # TypeScript type definitions
│   │   │   └── index.ts
│   │   ├── utils/             # Utility functions
│   │   │   └── helpers.ts
│   │   └── __tests__/         # Frontend unit/component tests
│   │       ├── components/
│   │       └── services/
│   └── cypress/               # E2E system tests
│       ├── e2e/
│       └── support/
├── backend/                   # Express API server
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app.ts             # Express application setup
│   │   ├── server.ts          # Server entry point
│   │   ├── routes/            # API route handlers
│   │   │   ├── index.ts
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   └── health.ts
│   │   ├── middleware/        # Express middleware
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── logger.ts
│   │   │   └── validation.ts
│   │   ├── services/          # Business logic layer
│   │   │   ├── authService.ts
│   │   │   └── userService.ts
│   │   ├── utils/             # Utility functions
│   │   │   ├── logger.ts
│   │   │   └── config.ts
│   │   ├── types/             # TypeScript type definitions
│   │   │   └── index.ts
│   │   └── __tests__/         # Backend unit tests
│   │       ├── routes/
│   │       ├── services/
│   │       └── utils/
│   └── tests/                 # Integration tests
│       ├── integration/
│       └── fixtures/
├── shared/                    # Shared TypeScript types and utilities
│   ├── types/
│   │   └── api.ts
│   └── utils/
│       └── validation.ts
├── docs/                      # Additional documentation
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
└── logs/                      # Log files directory (gitignored)
```

### Known Gotchas of our codebase & Library Quirks
```javascript
// CRITICAL: Modern Node.js and React ecosystem specifics
// - Use ES modules with .js extensions in imports for Node.js
// - React 18+ requires React.StrictMode for development
// - Vite requires explicit file extensions for imports
// - Express middleware order is critical - auth before routes
// - TypeScript strict mode requires proper type definitions
// - Jest requires ESM configuration for modern Node.js
// - Docker multi-stage builds need careful layer caching
// - Husky v8+ uses different initialization pattern
// - ESLint v8+ flat config is optional but recommended
// - Cypress v12+ has component testing capabilities
```

## Implementation Blueprint

### Data models and structure
Create the core project configuration and type definitions for consistency across frontend and backend.

```typescript
// Shared types for API consistency
interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Configuration types for environment management
interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  corsOrigin: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
```

### List of tasks to be completed to fulfill the PRP in the order they should be completed

```yaml
Task 1: Project Foundation Setup
CREATE package.json:
  - SET UP monorepo structure with workspaces
  - CONFIGURE scripts for development, testing, building
  - ADD husky for git hooks management

CREATE .gitignore:
  - INCLUDE all Node.js, React, TypeScript patterns
  - ADD IDE files, OS files, log directories
  - EXCLUDE sensitive files and build artifacts

CREATE .env.example:
  - DEFINE all required environment variables
  - PROVIDE sensible defaults for development

Task 2: Build and Development Tooling
CREATE tsconfig.json:
  - CONFIGURE strict TypeScript settings
  - SET UP path mapping for clean imports
  - ENABLE modern ES modules

CREATE .eslintrc.js:
  - CONFIGURE React, TypeScript, Node.js rules
  - SET UP import ordering and formatting
  - ENABLE accessibility and performance rules

CREATE .prettierrc:
  - STANDARDIZE code formatting
  - INTEGRATE with ESLint configuration

CREATE jest.config.js:
  - SET UP testing environment for both frontend and backend
  - CONFIGURE coverage reporting and thresholds
  - ENABLE TypeScript support

Task 3: Frontend Application Structure
CREATE frontend/package.json:
  - CONFIGURE React 18+ with TypeScript
  - ADD Vite build tooling and development server
  - INCLUDE testing libraries and utilities

CREATE frontend/vite.config.ts:
  - CONFIGURE development server with proxy
  - SET UP build optimization and chunking
  - ENABLE hot module replacement

CREATE frontend/src structure:
  - BUILD component library with Login, Dashboard, Layout
  - IMPLEMENT React Router for navigation
  - CREATE authentication context and hooks
  - ADD API service layer with error handling

Task 4: Backend API Implementation
CREATE backend/package.json:
  - CONFIGURE Express.js with TypeScript
  - ADD middleware libraries (helmet, cors, compression)
  - INCLUDE testing utilities (supertest)

CREATE backend/src structure:
  - BUILD Express application with proper middleware order
  - IMPLEMENT authentication routes (/login, /logout, /profile)
  - CREATE user management endpoints (/api/users)
  - ADD health check and monitoring endpoints

Task 5: Testing Infrastructure
CREATE comprehensive test suites:
  - FRONTEND: Component tests with React Testing Library
  - BACKEND: API tests with Supertest and Jest
  - INTEGRATION: Full request/response cycle tests
  - E2E: Cypress tests for critical user flows

ENSURE test patterns demonstrate:
  - Unit testing best practices
  - Mocking strategies for external dependencies
  - Async testing patterns
  - Error handling validation

Task 6: Docker Containerization
CREATE Dockerfile:
  - USE multi-stage build (development, build, production)
  - OPTIMIZE layer caching and image size
  - CONFIGURE non-root user for security
  - ADD health check for container orchestration

CREATE docker-compose.yml:
  - SET UP production-ready container
  - CONFIGURE volume mounts for data persistence
  - ADD environment variable management

CREATE docker-compose.dev.yml:
  - CONFIGURE development environment with hot reload
  - MOUNT source code for live development
  - SET UP development database if needed

Task 7: Development Workflow Automation
CREATE Makefile:
  - AUTOMATE setup: `make setup`
  - PROVIDE development: `make dev`
  - ENABLE testing: `make test`, `make test-unit`, `make test-e2e`
  - ADD linting: `make lint`
  - BUILD production: `make build`
  - DOCKER commands: `make docker-dev`, `make docker-prod`

CREATE .husky git hooks:
  - PRE-COMMIT: Run linting and formatting
  - PRE-PUSH: Run tests and type checking
  - ENSURE code quality gates

Task 8: Documentation and Guidelines
CREATE README.md:
  - DOCUMENT setup and development workflow
  - PROVIDE API documentation overview
  - INCLUDE deployment instructions
  - ADD troubleshooting section

CREATE AGENTS.md:
  - DEFINE AI assistant collaboration patterns
  - DOCUMENT codebase conventions and patterns
  - PROVIDE context for effective code generation

CREATE docs/ directory:
  - API.md: Complete API documentation
  - DEPLOYMENT.md: Production deployment guide
  - CONTRIBUTING.md: Development guidelines
```

### Per task pseudocode as needed

```javascript
// Task 3: Frontend Structure Pseudocode
// App.tsx - Main application setup
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            </Routes>
          </Layout>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}

// Task 4: Backend Structure Pseudocode  
// app.ts - Express application setup
function createApp() {
  const app = express();
  
  // PATTERN: Security middleware first
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  
  // PATTERN: Parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(compression());
  
  // PATTERN: Logging middleware
  app.use(loggerMiddleware);
  
  // PATTERN: Routes with prefix
  app.use('/api', apiRoutes);
  app.use('/api/auth', authRoutes);
  
  // PATTERN: Error handling last
  app.use(errorHandlerMiddleware);
  
  return app;
}
```

### Integration Points
```yaml
FRONTEND_BACKEND:
  - api_base_url: "http://localhost:3001/api"
  - authentication: "JWT tokens in Authorization header"
  - error_handling: "Standardized error response format"

DOCKER_DEVELOPMENT:
  - frontend_port: "3000 (Vite dev server)"
  - backend_port: "3001 (Express server)"
  - proxy_config: "Vite proxy to backend for /api routes"

TESTING_INTEGRATION:
  - unit_tests: "Jest with TypeScript support"
  - component_tests: "React Testing Library"
  - api_tests: "Supertest for Express endpoints"
  - e2e_tests: "Cypress for full application flows"

BUILD_DEPLOYMENT:
  - frontend_build: "Vite production build to dist/"
  - backend_build: "TypeScript compilation to dist/"
  - docker_build: "Multi-stage with optimized layers"
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
npm run lint                         # ESLint with auto-fix
npm run format                       # Prettier formatting
npm run type-check                   # TypeScript compilation check

# Expected: No errors. If errors, READ the error and fix.
# Common issues: Missing imports, type errors, formatting inconsistencies
```

### Level 2: Unit Tests - Each component and service
```javascript
// Frontend component test example
describe('LoginForm', () => {
  test('submits form with valid credentials', async () => {
    const mockSubmit = jest.fn();
    render(<LoginForm onSubmit={mockSubmit} />);
    
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));
    
    expect(mockSubmit).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'password123'
    });
  });
  
  test('displays error for invalid input', async () => {
    render(<LoginForm onSubmit={jest.fn()} />);
    
    await user.click(screen.getByRole('button', { name: /login/i }));
    
    expect(screen.getByText(/username is required/i)).toBeInTheDocument();
  });
});

// Backend API test example
describe('POST /api/auth/login', () => {
  test('returns JWT token for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'password123' })
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.user.username).toBe('testuser');
  });
  
  test('returns error for invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'invalid', password: 'wrong' })
      .expect(401);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Invalid credentials');
  });
});
```

```bash
# Run and iterate until passing:
npm run test:unit
# If failing: Read error, understand root cause, fix code, re-run
# Never mock away real functionality - test actual behavior
```

### Level 3: Integration & E2E Tests
```bash
# Start development environment
make dev

# Wait for servers to be ready
curl http://localhost:3001/api/health
# Expected: {"status": "ok", "timestamp": "..."}

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Test Docker build
make docker-prod
docker run -d -p 3000:3000 template-repo:latest
curl http://localhost:3000/api/health
# Expected: Working application in production mode
```

### Level 4: Makefile Commands Validation
```bash
# Test complete workflow
make setup      # Should install all dependencies
make lint       # Should pass with no errors  
make test       # Should run all test suites successfully
make build      # Should create production builds
make docker-dev # Should start development environment
make docker-prod # Should build and run production container

# Each command should complete without errors and produce expected results
```

## Final Validation Checklist
- [ ] All tests pass: `make test`
- [ ] No linting errors: `make lint`
- [ ] No type errors: `npm run type-check`
- [ ] Frontend loads at http://localhost:3000 with working navigation
- [ ] Backend API responds at http://localhost:3001/api/health
- [ ] Authentication flow works (login/logout/protected routes)
- [ ] Docker builds successfully: `make docker-prod`
- [ ] Documentation is comprehensive and accurate
- [ ] Git hooks prevent commits with errors
- [ ] Production build is optimized and deployable

## Anti-Patterns to Avoid
- ❌ Don't create overly complex abstractions in a template
- ❌ Don't skip validation because "it's just a template"
- ❌ Don't ignore test failures - fix them properly
- ❌ Don't hardcode values that should be configurable
- ❌ Don't create patterns that don't scale
- ❌ Don't forget to document important decisions
- ❌ Don't make the template too opinionated about business logic
- ❌ Don't skip Docker optimization for faster builds
- ❌ Don't create unnecessary dependencies between components

**PRP Confidence Score: 9/10** - High confidence due to comprehensive context, clear validation steps, and well-established patterns in the Node.js ecosystem.