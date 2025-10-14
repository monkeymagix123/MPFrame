class Settings {
   highQuality: boolean;
   resolutionScale: number;

   constructor() {
      this.highQuality = true;
      this.resolutionScale = 2.0;
   }
}

export const settings = new Settings();