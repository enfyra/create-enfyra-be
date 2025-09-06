# @enfyra/create-enfyra-be

Create a new Enfyra backend application with an interactive CLI setup.

## 🚀 Quick Start

Create a new Enfyra backend project with a single command:

```bash
# Using npx (recommended)
npx @enfyra/create-enfyra-be
npx @enfyra/create-enfyra-be my-project

# Using npm init
npm init @enfyra/enfyra-be
npm init @enfyra/enfyra-be my-project

# Using yarn
yarn create @enfyra/enfyra-be
yarn create @enfyra/enfyra-be my-project

# Using bun
bun create @enfyra/enfyra-be
bun create @enfyra/enfyra-be my-project
```

## 📋 Requirements

Before creating a new Enfyra project, ensure you have:

- **Node.js** >= 20.0.0
- **Package manager** (npm ≥8.0.0, yarn ≥1.22.0, or bun ≥1.0.0)
- **Database** server (MySQL, MariaDB, or PostgreSQL)
- **Redis** server
- **Git** (for cloning the repository)

## 🎯 Features

The CLI will guide you through configuring:

### Core Settings
- Project name and directory
- Package manager selection (npm/yarn/bun)
- Node environment (development/production/test)

### Database Configuration
- Database type (MySQL/MariaDB/PostgreSQL)
- Connection settings (host, port, credentials)
- Database pool configuration (optional)
- Connection limits and timeouts

### Cache
- Redis URI and TTL settings

### Security
- JWT secret key (auto-generated or custom)
- Password salt rounds
- Token expiration settings
  - Access token expiry
  - Refresh token expiry (with/without remember me)

### Application
- Application port
- VM execution timeout
- Node name for clustering

## 🛠️ What Gets Created

After running the setup, you'll have:

```
my-enfyra-app/
├── .env                 # Environment configuration  
├── package.json         # Dependencies and scripts
├── src/                 # Source code
│   ├── app.module.ts   # Main NestJS app module
│   ├── main.ts         # Application entry point
│   ├── core/           # Core business logic
│   ├── modules/        # Feature modules
│   ├── infrastructure/ # External services
│   └── shared/         # Shared utilities
├── data/               # Database schemas & snapshots
├── docs/               # Documentation
├── test/               # Test files
├── public/             # Static assets
└── scripts/            # Utility scripts
```

## 📝 Post-Installation Steps

After the project is created:

1. **Navigate to your project:**
   ```bash
   cd my-enfyra-app
   ```

2. **Ensure services are running:**
   - Start your database server
   - Start Redis server
   - Create the database if it doesn't exist

3. **Run database migrations:**
   ```bash
   npm run migration:run
   # or
   yarn migration:run
   # or
   bun run migration:run
   ```

4. **Start the development server:**
   ```bash
   npm run start:dev
   # or
   yarn start:dev
   # or
   bun run start:dev
   ```

## 🔧 Environment Configuration

The `.env` file created contains all your configuration. You can modify it anytime:

```env
#DB SETTING
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=yourpassword
DB_NAME=enfyra

#REDIS SETTING
REDIS_URI=redis://localhost:6379
DEFAULT_TTL=5

#APP SETTING
NODE_NAME=my-enfyra-app
PORT=1105

#AUTH_SETTING
SECRET_KEY=your-secret-key
SALT_ROUNDS=10
ACCESS_TOKEN_EXP=15m
REFRESH_TOKEN_NO_REMEMBER_EXP=1d
REFRESH_TOKEN_REMEMBER_EXP=7d
```

## 📦 Publishing Your Own Version

If you want to customize and publish your own version:

1. **Fork or clone this repository**
2. **Modify the configuration options in `index.js`**
3. **Update package.json with your details**
4. **Publish to npm:**
   ```bash
   npm login
   npm publish
   ```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [Enfyra Backend Repository](https://github.com/dothinh115/enfyra_be)
- [Documentation](https://github.com/dothinh115/enfyra_be#readme)
- [Issue Tracker](https://github.com/dothinh115/create-enfyra-be/issues)

## ⚠️ Troubleshooting

### Common Issues

**Node.js version error:**
- Upgrade to Node.js 20.0.0 or higher
- Use nvm: `nvm install 20 && nvm use 20`

**Package manager version error:**
- Update npm: `npm install -g npm@latest` 
- Update yarn: `npm install -g yarn@latest`
- Install bun: `curl -fsSL https://bun.sh/install | bash`

**Git clone fails:**
- Check your internet connection
- Verify the repository URL is correct
- Ensure Git is installed: `git --version`

**Dependencies installation fails:**
- Try running the install command manually
- Clear package manager cache:
  - npm: `npm cache clean --force`
  - yarn: `yarn cache clean`
  - bun: `bun pm cache rm`

**Database connection fails:**
- Verify database server is running
- Check credentials and port
- Ensure database exists or create it manually

**Redis connection fails:**
- Verify Redis server is running: `redis-cli ping`
- Check Redis URI format: `redis://localhost:6379`

## 📞 Support

For issues or questions:
- Open an issue on [GitHub](https://github.com/dothinh115/create-enfyra-be/issues)
- Check existing documentation
- Contact the maintainers