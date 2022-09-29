import * as lib from '../src/lib';
import * as utils from './utils';
import * as fs from "fs";
import { addAegisubInfo } from "../src/utils/ass";
import karaoke from "../src/plugins/karaoke";
import qrc from "../src/plugins/qrc";

export const convert = (
    inputPath: string,
    mvPath: string,
    outputPath: string,
    viewInConsole: boolean = true,
    deletedLines: number[] = [],
    divideInterval: number = 1.8,
    offset: number = 0,
    resolution: [number, number] = [1920, 1080],
    color?: [number, number, number],
    fontSize?: [number, number],
) => {
    const lrc = utils.loadLyric(inputPath);
    if (!fs.existsSync('temp')) fs.mkdirSync('temp');
    fs.writeFileSync('temp/output.lrc', qrc.decode(inputPath)); 
    const sub = lib.Subtitle.fromLyric(lrc);
    sub.hide(deletedLines);
    const kara = new karaoke.Karaoke(sub, {
        interval: divideInterval,
        res_x: resolution[0], 
        res_y: resolution[1]});
    if (viewInConsole) console.log(kara.inspect());
    kara.exec(
        karaoke.plugins.leadIn(),
        karaoke.plugins.alignOffset(offset ?? 0),
        karaoke.plugins.killNegative);
    if (color) kara.config.color = color;
    const ass = kara.toASS();
    if (fontSize) {
        const map = ass.styleMap;
        const [textSize, kanaSize] = fontSize;
        map['K1'].font.size = map['K2'].font.size = textSize;
        map['K1-furigana'].font.size = map['K2-furigana'].font.size = kanaSize;
    }
    addAegisubInfo(ass, {audio: mvPath, video: mvPath});
    fs.writeFileSync(outputPath, ass.render());
}