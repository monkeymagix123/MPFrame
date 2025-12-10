export class Settings {
   highQuality: boolean;
   resScale: number;
   logSocket: boolean;
   showFPS: boolean;

   clientInterpolation: boolean = true;

   constructor() {
      this.highQuality = false;
      this.resScale = 2.0;
      this.logSocket = false;
      this.showFPS = false;
   }
}

export class ColorSettings {
   good: string;
   bad: string;
   neutral: string;

   constructor() {
      this.good = "green";
      this.bad = "red";
      this.neutral = "black";
   }
}

export const colorSettings = new ColorSettings();