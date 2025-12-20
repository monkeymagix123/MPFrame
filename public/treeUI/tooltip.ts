import { Application, Graphics, Container, HTMLTextStyle, HTMLText } from "pixi.js";
import tooltipCss from "./tooltip.css?raw";

import { COLOR_CONFIG } from "./colorConfig";
import type { Vec2 } from "@shared/v2";
import { getTooltip } from "../treeHelper";

const style = new HTMLTextStyle({
    fontSize: 14,
    fill: COLOR_CONFIG.tooltip.text,
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    wordWrap: true,
    wordWrapWidth: 240,
    lineHeight: 20,
    cssOverrides: [tooltipCss],
})

export interface Tooltip {
    name: string;
    desc: string;
    cost: number;
    prereq?: string;
    effects?: string[];
}

export class TooltipManager {
    app: Application;
    ui: Container;

    tooltipContainer = new Container();
    tooltipText!: HTMLText;
    tooltipBg!: Graphics;

    constructor(ui: Container, app: Application) {
        this.app = app;
        this.ui = ui;
        ui.addChild(this.tooltipContainer);

        this.createTooltip();
    }

    private createTooltip(): void {
        this.tooltipBg = new Graphics();
        
        this.tooltipText = new HTMLText({
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
    
        const tooltip = getTooltip(skillId);
        this.setText(parseTooltip(tooltip));
    
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
        const padding = { x: 16, y: 12 };
        const cornerRadius = 8;

        this.tooltipText.position.set(padding.x, padding.y);

        const width = this.tooltipText.width + 2 * padding.x;
        const height = this.tooltipText.height + 2 * padding.y;
        
        this.tooltipBg
            .clear()
            .roundRect(0, 0, width, height, cornerRadius)
            .fill({
                color: COLOR_CONFIG.tooltip.background,
                alpha: COLOR_CONFIG.tooltip.backgroundAlpha
            })
            .stroke({
                width: 2,
                color: COLOR_CONFIG.tooltip.border,
                alpha: COLOR_CONFIG.tooltip.borderAlpha,
                alignment: 0,
            });
    }
}

/**
 * Parses an html tooltip from an array of text strings
 * @example
 * text = [
 *  name,
 *  description,
 *  Cost: (cost),
 *  Prereqs: 1, 2, 3
 *  Effects: 1, 2, 3
 * ]
 */
function parseTooltip(tooltip: Tooltip): string {
    let result =
        `<div class="name">${tooltip.name}</div>` +
        `<div class="desc">${tooltip.desc}</div>` +
        `<div class="divider"></div>` +
        `<div class="cost">Cost: ${tooltip.cost}</div>`;
    
    if (tooltip.prereq) {
        result += `<div class="prereqs">Prereqs: ${tooltip.prereq}</div>`;
    }

    if (tooltip.effects) {
        result += `<div class="effects-label">Effects: </div>`;

        for (const effect of tooltip.effects) {
            if (!effect.includes(':')) continue;

            const split = effect.split(': ', 2);
            const key = split[0];
            const value = split[1];
            console.log(split);
            result += `<div><span class="effects-name">${key}:</span> <span class="effects-value">${value}</span></div>`;
        }
    }

    return result;
}