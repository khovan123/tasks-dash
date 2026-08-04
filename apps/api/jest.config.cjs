module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  testRegex: ".*\\.spec\\.ts$",
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.json",
      },
    ],
  },
  moduleNameMapper: {
    "^@tasks-dash/contracts$":
      "<rootDir>/../../packages/contracts/src/index.ts",
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/main.ts"],
};
