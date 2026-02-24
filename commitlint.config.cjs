module.exports = {
  extends: ["@commitlint/config-conventional"],
  // Lint every commit message, including merge commits.
  defaultIgnores: false,
  rules: {
    "header-max-length": [2, "always", 100]
  }
};
