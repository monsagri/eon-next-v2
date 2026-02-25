/** Allow importing .css files as Lit CSSResult via rollup-plugin-lit-css. */
declare module '*.css' {
  import type { CSSResult } from 'lit'
  const styles: CSSResult
  export default styles
}
