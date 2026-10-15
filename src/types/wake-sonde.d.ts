// Sonde de supervision Wake Systems, chargée via le <script> du <head>.
// Toujours appeler en optionnel (window.wakeSonde?.erreur) : le script est en
// defer et absent tant que VITE_WAKE_SONDE_CLE n'est pas définie.
interface WakeSonde {
  erreur(error: unknown, contexte?: { ou?: string } & Record<string, unknown>): void
}

interface Window {
  wakeSonde?: WakeSonde
}
