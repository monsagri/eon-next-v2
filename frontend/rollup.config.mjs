import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import litcss from "rollup-plugin-lit-css";

const production = !process.env.ROLLUP_WATCH;
const outDir = "../custom_components/eon_next/frontend";

function plugins() {
  return [
    resolve(),
    litcss(),
    typescript({ outDir }),
    production && terser({ format: { comments: false } }),
  ];
}

export default [
  {
    input: "src/panel.ts",
    output: {
      file: `${outDir}/entrypoint.js`,
      format: "es",
      sourcemap: false,
    },
    plugins: plugins(),
  },
  {
    input: "src/cards/register.ts",
    output: {
      file: `${outDir}/cards.js`,
      format: "es",
      sourcemap: false,
    },
    plugins: plugins(),
  },
];
