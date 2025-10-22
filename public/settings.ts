class Settings {
   highQuality: boolean;
   resolutionScale: number;
   debugMode?: boolean;

   constructor() {
      this.highQuality = false;
      this.resolutionScale = 2.0;
      this.debugMode = false;
   }
}

export const settings = new Settings();