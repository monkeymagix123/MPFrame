export class Settings {
   highQuality: boolean;
   resolutionScale: number;
   debugMode: boolean;

   clientInterpolation: boolean = true;

   constructor() {
      this.highQuality = false;
      this.resolutionScale = 2.0;
      this.debugMode = false;
   }
}
