import * as fs from "fs";
import Lrc from "lrc-utils";
import qrc from "../plugins/qrc";
import * as util from 'util';

export const timeString = (time: number, fix: number = 2) => {
    const int = Math.floor(time), dec = Math.round((time - int) * (10 ** fix));
    const s = int % 60, m = Math.floor(int / 60) % 60, h = Math.floor(int / 3600);
    const str = (x: number, i = 2) => ("00" + x).slice(-i);
    return `${h}:${str(m)}:${str(s)}.${str(dec, fix)}`;
}

export const hexToBuffer = (hex: string) =>
    Buffer.from(hex.trim(), 'hex');

export const absolutePath = (path: string) => {
    if (path[0] === '/' || path[0] === '\\')
        path = path.slice(1);
    if (process.platform === 'win32') {
        return `${process.cwd()}\\${path.replace(/\/ /g, '\\')}`
    } else return `${process.cwd()}/${path.replace(/\\/g, '/')}`
}

export const loadLyricText = (path: string) => {
    switch (path.slice(-4)) {
        case '.lrc':
            return fs.readFileSync(path).toString();
        case '.qrc':
            return qrc.decode(path);
        default:
            console.warn('Extension not support.');
            return '';
    }
}

export const loadLyric = (
    path: string, mode: 'lrc' | 'lrc-legacy' = 'lrc'
) => {
    if (path.slice(-4) === '.qrc') mode = 'lrc';
    return Lrc.parse(loadLyricText(path), {mode, kana: true});
}

export const inspect = (obj: any) => util.inspect(obj, {depth: null});

export const mix = <T>(usr: Partial<T>, def: T): T => {
    const ret = { ...def };
    for (const k in usr) ret[k] = usr[k] ?? def[k];
    return ret;
}
