# Sofathek

Sofathek is a self-hosted family media center that provides a Netflix-like streaming experience with YouTube download capabilities. Built with React 19 and Express.js, it offers multi-profile theme customization and comprehensive media management features.

## Installation

Use [Docker Compose](https://docs.docker.com/compose/) to install and run Sofathek.

```bash
# Clone the repository
git clone https://github.com/yourusername/sofathek.git
cd sofathek

# Copy and configure environment
cp .env.example .env
# Edit .env with your configuration

# Start the application
docker-compose up -d
```

## Usage

```bash
# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001

# Download YouTube videos
# Navigate to /downloads and paste YouTube URLs

# Manage profiles and themes
# Go to /themes to customize your experience

# Stream your media
# Browse your library at /library
```

### Development

```bash
# Install dependencies
npm run setup

# Start development servers
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate and follow the existing code style.

## License

[MIT](https://choosealicense.com/licenses/mit/)
