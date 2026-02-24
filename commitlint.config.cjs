module.exports = {
  extends: ["@commitlint/config-conventional"],
  // Use default ignore behavior so auto-generated merge commits are not linted.
  rules: {
    "header-max-length": [2, "always", 100]
  }
};
