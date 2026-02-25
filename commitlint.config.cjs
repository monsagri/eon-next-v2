module.exports = {
  extends: ["@commitlint/config-conventional"],
  // Use default ignore behavior so auto-generated merge commits are not linted.
  rules: {
    "header-max-length": [2, "always", 100],
    "type-enum": [
      2,
      "always",
      [
        "build", "chore", "ci", "docs", "feat", "fix",
        "merge", "perf", "refactor", "revert", "style", "test"
      ]
    ]
  }
};
