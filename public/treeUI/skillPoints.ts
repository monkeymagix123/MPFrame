// Skill Points Display
import { Application, Container, Text, TextStyle } from "pixi.js";
import { COLOR_CONFIG } from "./colorConfig";
import { type Player } from "../../shared/player";

const style = new TextStyle({
    fontSize: 24,
    fill: COLOR_CONFIG.skillPoints.text,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: 'bold',
});

export class SkillPtsManager {
    app: Application;
    ui: Container;
    
    textArea!: Text;

    constructor(app: Application, ui: Container, pts: number) {
        this.app = app;
        this.ui = ui;
        this.createSkillPointsDisplay(pts);
        
        // add to ui
        ui.addChild(this.textArea);
    }

    createSkillPointsDisplay(pts: number): void {
        this.textArea = new Text({
            text: '0',
            style: style
        });
        this.textArea.resolution = window.devicePixelRatio || 1;
        this.textArea.anchor.set(0.5, 0);
        
        this.updateSkillPointsDisplay(pts);
    }
    
    updateSkillPointsDisplay(pts: number): void {
        if (!this.textArea || !this.app) return;
        
        this.textArea.text = pts.toString();
        
        // Center the text at the top of the screen
        this.textArea.position.set(this.app.screen.width / 2, 20);
    }
}