import { Application, Graphics, GraphicsContext, Container, TextStyle, Text } from "pixi.js";

import { COLOR_CONFIG } from "./colorConfig";
import type { Vec2 } from "../../shared/v2";
import { getTooltip } from "../treeHelper";

const style = new TextStyle({
    fontSize: 14,
    fill: COLOR_CONFIG.tooltip.text,
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    wordWrap: true,
    wordWrapWidth: 240,
    lineHeight: 20,
    leading: 2
});

export class TooltipManager {
    app: Application;
    ui: Container;

    tooltipContainer = new Container();
    tooltipText!: Text;
    tooltipBg!: Graphics;

    constructor(ui: Container, app: Application) {
        this.app = app;
        this.ui = ui;
        ui.addChild(this.tooltipContainer);

        this.createTooltip();
    }

    private createTooltip(): void {
        this.tooltipBg = new Graphics();
        
        this.tooltipText = new Text({
            text: 'Hello',
            style: style
        });
        this.tooltipText.resolution = window.devicePixelRatio || 1;
        this.tooltipText.position.set(10, 8);
    
        this.tooltipContainer.addChild(this.tooltipBg, this.tooltipText);
        this.tooltipContainer.visible = false;
    }

    showSkillTooltip(skillId: string, pos: Vec2): void {
        this.tooltipContainer.visible = true;
    
        this.setText(getTooltip(skillId));
    
        this.updateTooltipPosition(pos);
    }

    updateTooltipPosition(pos: Vec2): void {
        const margin = 15;
        let x = pos.x + margin;
        let y = pos.y + margin;
    
        // Clamp right edge
        if (x + this.tooltipContainer.width > this.app.screen.width) {
            x = pos.x - this.tooltipContainer.width - margin;
        }
    
        // Clamp bottom edge
        if (y + this.tooltipContainer.height > this.app.screen.height) {
            y = pos.y - this.tooltipContainer.height - margin;
        }
    
        // Clamp left/top
        x = Math.max(margin, x);
        y = Math.max(margin, y);
    
        this.tooltipContainer.position.set(Math.round(x), Math.round(y));
    }

    hideTooltip(): void {
        this.tooltipContainer.visible = false;
    }

    setText(value: string) {
        this.tooltipText.text = value;

        // Padding for background
        const padding = { x: 10, y: 8 };
        this.tooltipText.position.set(padding.x, padding.y);
        
        this.tooltipBg.clear();
        const width = this.tooltipText.width + 2 * padding.x;
        const height = this.tooltipText.height + 2 * padding.y;
        
        this.tooltipBg
            .rect(0, 0, width, height)
            .fill({ color: COLOR_CONFIG.tooltip.background, alpha: COLOR_CONFIG.tooltip.backgroundAlpha })
            .stroke({ width: 2, color: COLOR_CONFIG.tooltip.border, alpha: COLOR_CONFIG.tooltip.borderAlpha });
    }
}