import { config } from "../shared/config";

class Settings {
   highQuality: boolean;
   resolutionScale: number;
   debugMode?: boolean;

   interpolatingFactor: number;

   constructor() {
      this.highQuality = true;
      this.resolutionScale = 2.0;
      this.debugMode = false;

      this.interpolatingFactor = config.defaultInterpolatingFactor;
   }
}

export const settings = new Settings();