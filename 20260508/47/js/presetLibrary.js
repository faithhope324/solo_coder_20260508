class PresetLibrary {
    constructor() {
        this.presets = {
            glider: {
                name: '滑翔机',
                pattern: [
                    [0, 1, 0],
                    [0, 0, 1],
                    [1, 1, 1]
                ]
            },
            blinker: {
                name: '闪烁器',
                pattern: [
                    [1, 1, 1]
                ]
            },
            toad: {
                name: '蟾蜍',
                pattern: [
                    [0, 1, 1, 1],
                    [1, 1, 1, 0]
                ]
            },
            beacon: {
                name: '灯塔',
                pattern: [
                    [1, 1, 0, 0],
                    [1, 1, 0, 0],
                    [0, 0, 1, 1],
                    [0, 0, 1, 1]
                ]
            },
            pulsar: {
                name: '脉冲星',
                pattern: [
                    [0,0,1,1,1,0,0,0,1,1,1,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [1,0,0,0,0,1,0,1,0,0,0,0,1],
                    [1,0,0,0,0,1,0,1,0,0,0,0,1],
                    [1,0,0,0,0,1,0,1,0,0,0,0,1],
                    [0,0,1,1,1,0,0,0,1,1,1,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,1,1,1,0,0,0,1,1,1,0,0],
                    [1,0,0,0,0,1,0,1,0,0,0,0,1],
                    [1,0,0,0,0,1,0,1,0,0,0,0,1],
                    [1,0,0,0,0,1,0,1,0,0,0,0,1],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,1,1,1,0,0,0,1,1,1,0,0]
                ]
            },
            gliderGun: {
                name: '滑翔机枪',
                pattern: [
                    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                    [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                    [1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [1,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,1,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
                ]
            },
            spaceship: {
                name: '宇宙飞船',
                pattern: [
                    [0, 1, 1, 1, 1],
                    [1, 0, 0, 0, 1],
                    [0, 0, 0, 0, 1],
                    [1, 0, 0, 1, 0]
                ]
            },
            copperhead: {
                name: '铜头蛇',
                pattern: [
                    [1, 1, 0, 1, 1],
                    [0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0],
                    [1, 0, 1, 0, 1],
                    [1, 0, 1, 0, 1],
                    [0, 0, 0, 0, 0],
                    [1, 0, 1, 0, 1],
                    [0, 1, 1, 1, 0],
                    [0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0],
                    [0, 1, 1, 1, 0],
                    [1, 0, 0, 0, 1],
                    [0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0],
                    [1, 0, 0, 0, 1],
                    [0, 1, 1, 1, 0]
                ]
            }
        };
    }

    getPreset(key) {
        return this.presets[key] || null;
    }

    getAllPresetKeys() {
        return Object.keys(this.presets);
    }

    getPresetName(key) {
        return this.presets[key]?.name || '';
    }

    placePreset(gridManager, key, centerRow, centerCol) {
        const preset = this.getPreset(key);
        if (!preset) return false;

        const pattern = preset.pattern;
        const startRow = centerRow - Math.floor(pattern.length / 2);
        const startCol = centerCol - Math.floor(pattern[0].length / 2);

        gridManager.placePattern(pattern, startRow, startCol);
        return true;
    }

    placePresetAtCenter(gridManager, key) {
        const centerRow = Math.floor(gridManager.rows / 2);
        const centerCol = Math.floor(gridManager.cols / 2);
        return this.placePreset(gridManager, key, centerRow, centerCol);
    }
}
