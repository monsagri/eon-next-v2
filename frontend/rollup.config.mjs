import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import litcss from "rollup-plugin-lit-css";

const watching = !!process.env.ROLLUP_WATCH;
const production = !watching;

// In dev mode, output to dev/ so the harness can load them.
// In production, output to the custom_components frontend dir.
const outDir = watching ? "dev" : "../custom_components/eon_next/frontend";

function plugins() {
  return [
    resolve(),
    litcss(),
    typescript({ outDir, ...(watching && { sourceMap: true }) }),
  ];
}

function prodPlugins() {
  return [...plugins(), terser({ format: { comments: false } })];
}

/** Core bundles — always built. */
const bundles = [
  {
    input: "src/panel.ts",
    output: { file: `${outDir}/entrypoint.js`, format: "es", sourcemap: watching },
    plugins: production ? prodPlugins() : plugins(),
  },
  {
    input: "src/cards/register.ts",
    output: {
      file: `${outDir}/cards.js`,
      format: "es",
      sourcemap: watching,
      inlineDynamicImports: true,
    },
    plugins: production ? prodPlugins() : plugins(),
  },
];

/** Dev-only: serve dev/ directory with livereload. */
if (watching) {
  const serve = (await import("rollup-plugin-serve")).default;
  const livereload = (await import("rollup-plugin-livereload")).default;

  // Attach serve + livereload to the first bundle (only needs one instance)
  bundles[0].plugins = [
    ...plugins(),
    serve({ contentBase: "dev", port: 5050, open: false }),
    livereload("dev"),
  ];
}

export default bundles;
