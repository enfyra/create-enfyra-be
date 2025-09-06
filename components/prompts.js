const validators = require("./validators");

function getPrompts(availableManagers, projectNameArg) {
  const prompts = [
    // BASIC INFO - Always ask if not provided as argument
    {
      type: "input",
      name: "projectName",
      message: "Project name:",
      default: projectNameArg || "my-enfyra-app",
      validate: validators.projectName,
      when: () => !projectNameArg, // Only ask if not provided
    },

    // PACKAGE MANAGER
    {
      type: "list",
      name: "packageManager",
      message: "Package manager:",
      choices: availableManagers.map(pm => ({
        name: `${pm.name} (v${pm.version})`,
        value: pm.value
      })),
      default: availableManagers.find(pm => pm.value === "yarn")?.value || availableManagers[0]?.value,
    },

    // NODE NAME
    {
      type: "input",
      name: "nodeName",
      message: "Node name (for clustering/identification):",
      default: (answers) => answers.projectName || projectNameArg,
      validate: validators.required,
    },

    // DATABASE CONFIGURATION
    {
      type: "list",
      name: "dbType",
      message: "Database type:",
      choices: [
        { name: "MySQL", value: "mysql" },
        { name: "MariaDB", value: "mariadb" },
        { name: "PostgreSQL", value: "postgres" },
      ],
      default: "mysql",
    },
    {
      type: "input",
      name: "dbHost",
      message: "Database host:",
      default: "localhost",
      validate: validators.required,
    },
    {
      type: "input",
      name: "dbPort",
      message: "Database port:",
      default: (answers) => {
        switch (answers.dbType) {
          case "postgres":
            return "5432";
          case "mysql":
          case "mariadb":
            return "3306";
          default:
            return "3306";
        }
      },
      validate: validators.port,
    },
    {
      type: "input",
      name: "dbUsername",
      message: "Database username:",
      default: "root",
      validate: validators.required,
    },
    {
      type: "password",
      name: "dbPassword",
      message: "Database password (can be empty):",
      mask: "*",
    },
    {
      type: "input",
      name: "dbName",
      message: "Database name:",
      default: "enfyra",
      validate: validators.databaseName,
    },

    // DATABASE POOL SETTINGS
    {
      type: "confirm",
      name: "configurePool",
      message: "Configure database pool settings?",
      default: false,
    },
    {
      type: "input",
      name: "dbPoolSize",
      message: "Database pool size:",
      default: "100",
      when: (answers) => answers.configurePool,
      validate: validators.positiveNumber,
    },
    {
      type: "input",
      name: "dbConnectionLimit",
      message: "Connection limit:",
      default: "100",
      when: (answers) => answers.configurePool,
      validate: validators.positiveNumber,
    },
    {
      type: "input",
      name: "dbAcquireTimeout",
      message: "Acquire timeout (ms):",
      default: "60000",
      when: (answers) => answers.configurePool,
      validate: validators.nonNegativeNumber,
    },
    {
      type: "input",
      name: "dbIdleTimeout",
      message: "Idle timeout (ms):",
      default: "30000",
      when: (answers) => answers.configurePool,
      validate: validators.nonNegativeNumber,
    },

    // REDIS CONFIGURATION
    {
      type: "input",
      name: "redisUri",
      message: "Redis URI:",
      default: "redis://localhost:6379",
      validate: validators.redisUri,
    },
    {
      type: "input",
      name: "redisTTL",
      message: "Default cache TTL (seconds):",
      default: "5",
      validate: validators.nonNegativeNumber,
    },

    // APP SETTINGS
    {
      type: "input",
      name: "appPort",
      message: "Application port:",
      default: "1105",
      validate: validators.port,
    },

    {
      type: "input",
      name: "saltRounds",
      message: "Password salt rounds:",
      default: "10",
      validate: validators.saltRounds,
    },
  ];

  return prompts;
}

function getConfirmationPrompt() {
  return {
    type: "confirm",
    name: "confirm",
    message: "Create project with this configuration?",
    default: true,
  };
}

module.exports = {
  getPrompts,
  getConfirmationPrompt,
};
