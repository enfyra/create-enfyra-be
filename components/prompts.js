const validators = require("./validators");
const chalk = require("chalk");

function getPrompts(availableManagers, projectNameArg) {
  const prompts = [
    {
      type: "input",
      name: "projectName",
      message: "Project name:",
      default: projectNameArg || "my-enfyra-server",
      validate: validators.projectName,
      when: () => !projectNameArg,
    },

    {
      type: "list",
      name: "packageManager",
      message: "Package manager:",
      choices: availableManagers.map((pm) => ({
        name: `${pm.name} (v${pm.version})`,
        value: pm.value,
      })),
      default:
        availableManagers.find((pm) => pm.value === "yarn")?.value ||
        availableManagers[0]?.value,
    },

    {
      type: "list",
      name: "dbType",
      message: "Database type:",
      choices: [
        { name: "MySQL", value: "mysql" },
        { name: "PostgreSQL", value: "postgres" },
        { name: "MongoDB", value: "mongodb" },
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
          case "mongodb":
            return "27017";
          case "mysql":
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
      default: (answers) => {
        return answers.dbType === "mongodb" ? "enfyra_admin" : "root";
      },
      validate: validators.required,
    },
    {
      type: "password",
      name: "dbPassword",
      message: (answers) => {
        return answers.dbType === "mongodb" 
          ? "Database password:" 
          : "Database password (can be empty):";
      },
      mask: "*",
      validate: (input, answers) => {
        if (answers.dbType === "mongodb" && !input) {
          return "Password is required for MongoDB";
        }
        return true;
      },
    },
    {
      type: "input",
      name: "dbName",
      message: "Database name:",
      default: "enfyra",
      validate: validators.databaseName,
    },
    {
      type: "input",
      name: "mongoAuthSource",
      message: "MongoDB auth source:",
      default: "admin",
      when: (answers) => answers.dbType === "mongodb",
      validate: validators.required,
    },

    // REDIS CONFIGURATION
    {
      type: "input",
      name: "redisUri",
      message: "Redis URI:",
      default: "redis://localhost:6379",
      validate: validators.redisUri,
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
      name: "backendUrl",
      message: "Backend URL (for Swagger):",
      default: (answers) => `http://localhost:${answers.appPort || "1105"}`,
      validate: validators.backendUrl,
    },

    {
      type: "confirm",
      name: "configureAdvanced",
      message: "Configure advanced settings?",
      default: false,
    },

    {
      type: "confirm",
      name: "configurePool",
      message: "Configure database pool settings?",
      default: false,
      when: (answers) => answers.configureAdvanced && answers.dbType !== "mongodb",
    },
    {
      type: "input",
      name: "dbPoolMinSize",
      message: "Minimum connections in pool:",
      default: "2",
      when: (answers) => answers.configureAdvanced && answers.configurePool,
      validate: validators.positiveNumber,
    },
    {
      type: "input",
      name: "dbPoolMaxSize",
      message: "Maximum connections in pool:",
      default: "100",
      when: (answers) => answers.configureAdvanced && answers.configurePool,
      validate: validators.positiveNumber,
    },
    {
      type: "input",
      name: "dbAcquireTimeout",
      message: "Acquire timeout (ms):",
      default: "60000",
      when: (answers) => answers.configureAdvanced && answers.configurePool,
      validate: validators.nonNegativeNumber,
    },
    {
      type: "input",
      name: "dbIdleTimeout",
      message: "Idle timeout (ms):",
      default: "30000",
      when: (answers) => answers.configureAdvanced && answers.configurePool,
      validate: validators.nonNegativeNumber,
    },

    {
      type: "confirm",
      name: "configureHandlerTimeouts",
      message: "Configure handler timeouts?",
      default: false,
      when: (answers) => answers.configureAdvanced,
    },
    {
      type: "input",
      name: "handlerTimeout",
      message: "Default handler timeout (ms):",
      default: "20000",
      when: (answers) => answers.configureAdvanced && answers.configureHandlerTimeouts,
      validate: validators.timeout,
    },
    {
      type: "input",
      name: "prehookTimeout",
      message: "Default prehook timeout (ms):",
      default: "20000",
      when: (answers) => answers.configureAdvanced && answers.configureHandlerTimeouts,
      validate: validators.timeout,
    },
    {
      type: "input",
      name: "afterhookTimeout",
      message: "Default afterhook timeout (ms):",
      default: "20000",
      when: (answers) => answers.configureAdvanced && answers.configureHandlerTimeouts,
      validate: validators.timeout,
    },
    {
      type: "input",
      name: "adminEmail",
      message: "Admin email:",
      validate: validators.email,
    },
    {
      type: "password",
      name: "adminPassword",
      message: () => {
        const question = "Admin password:";
        const hint = chalk.gray("\n  (This password will be stored in Git. Change it after first login)");
        return question + hint;
      },
      mask: "*",
      validate: validators.adminPassword,
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
