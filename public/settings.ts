export class Settings {
   highQuality: boolean;
   resScale: number;
   debugMode: boolean;

   clientInterpolation: boolean = true;

   constructor() {
      this.highQuality = false;
      this.resScale = 2.0;
      this.debugMode = false;
   }
}
