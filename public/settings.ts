class Settings {
   highQuality: boolean;
   resolutionScale: number;
   debugMode?: boolean;

   constructor() {
      this.highQuality = true;
      this.resolutionScale = 2.0;
      this.debugMode = true;
   }
}

export const settings = new Settings();