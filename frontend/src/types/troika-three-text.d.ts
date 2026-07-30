declare module 'troika-three-text' {
  export interface TextBuilderConfig {
    defaultFontURL?: string | null
    unicodeFontsURL?: string | null
    sdfGlyphSize?: number
    sdfMargin?: number
    sdfExponent?: number
    textureWidth?: number
    useWorker?: boolean
  }

  export function configureTextBuilder(config: TextBuilderConfig): void
}
