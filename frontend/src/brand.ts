/**
 * Provider branding for the dashboard shell.
 *
 * The visual system - layout, design tokens, components - is shared across
 * providers; only the wordmark, logo glyph and web-font stack change per brand.
 * A provider swaps these by supplying a BrandConfig. The default is E.ON Next.
 *
 * (Colours/radii/fonts live as CSS custom properties in dashboard-tokens.css; a
 * brand that also restyles those ships a token-override block. This config
 * covers the shell chrome the tokens can't express: name, sub-label and logo.)
 */

export interface BrandConfig {
  /** Wordmark shown in the rail, e.g. `EON Next`. */
  name: string
  /** Sub-label under the wordmark, e.g. `home energy`. */
  sub: string
  /** SVG path (authored in a `0 0 48 48` viewBox) for the rail logo glyph. */
  logoPath: string
  /** Web-font stylesheet URL injected into the document head, or `null`. */
  fontsUrl: string | null
  /** DOM id for the injected font `<link>` (dedupes injection). */
  fontsId: string
}

/** E.ON Next - the default brand. */
export const EON_NEXT_BRAND: BrandConfig = {
  name: 'EON Next',
  sub: 'home energy',
  logoPath: 'M27 4 11 27h11l-2 17 18-24H26z',
  fontsUrl:
    'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800' +
    '&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Space+Mono&display=swap',
  fontsId: 'eon-next-fonts'
}

/** The active brand. Swap for another provider's BrandConfig to reskin. */
export const BRAND: BrandConfig = EON_NEXT_BRAND
