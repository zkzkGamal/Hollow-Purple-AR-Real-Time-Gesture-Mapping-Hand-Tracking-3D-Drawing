/**
 * colorMixer.js
 * Color blending math and result logic
 */

export class ColorMixer {
    constructor() {
        this.baseColors = {
            '#FF0000': { r: 255, g: 0, b: 0, name: 'Red' },
            '#FFFF00': { r: 255, g: 255, b: 0, name: 'Yellow' },
            '#0000FF': { r: 0, g: 0, b: 255, name: 'Blue' }
        };
    }

    /**
     * Subtractive mixing (pigment model)
     * Instruction provided logic:
     * r *= (c.r / 255);
     * g *= (c.g / 255);
     * b *= (c.b / 255);
     */
    mix(colorsArray) {
        if (colorsArray.length === 0) return null;
        if (colorsArray.length === 1) return this.hexToRgb(colorsArray[0]);

        let r = 255, g = 255, b = 255;
        
        for (const hex of colorsArray) {
            const rgb = this.hexToRgb(hex);
            // We need to avoid absolute zero in subtractive mixing to not get black immediately 
            // but the formula works. However, Standard subtractive mixing often uses CMYK 
            // or takes (255 - r). Let's follow the user's specific formula.
            r *= (rgb.r / 255);
            g *= (rgb.g / 255);
            b *= (rgb.b / 255);
        }

        return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    getColorName(r, g, b) {
        const hex = this.rgbToHex(r, g, b);
        
        // Logical mappings for standard mixes
        if (r > 200 && g < 50 && b < 50) return 'Red';
        if (r > 200 && g > 200 && b < 50) return 'Yellow';
        if (r < 50 && g < 50 && b > 200) return 'Blue';
        
        if (r > 100 && g < 50 && b > 100) return 'Purple';
        if (r > 200 && g > 100 && b < 50) return 'Orange';
        if (r < 50 && g > 100 && b < 50) return 'Green';
        
        if (r < 100 && g < 100 && b < 100) return 'Dark Brown';
        
        return `Mixed Color (${hex})`;
    }
}
