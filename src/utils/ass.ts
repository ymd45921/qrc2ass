import Lrc from 'lrc-utils';
import * as Lib from '../lib';
import * as utils from '../utils';
import {Line, Subtitle} from "../lib";

export type FuriganaMode = 'accurate' | 'simple' | 'none';

export const lrcLineToString = (
    line: Lrc.Line, furigana: FuriganaMode = 'none') => {
    const text = [];
    for (const part of line.content) {
        const during = part.end ? Math.round((part.end - part.start) * 100) : 0;
        let last = part.start;
        if (furigana !== 'none' && part.sup?.length > 0) {
            if (furigana === 'simple') {
                const str = part.sup.map(i => i.notation).join('');
                text.push(`\{\\kf${during}\}${part.text}|<${str}`);
            } else if (part.sup.length === 1) {
                text.push(`\{\\kf${during}\}${part.text}|<${part.sup[0].notation}`);
            } else for (const i in part.sup) {
                const syl = part.sup[i];

                if (syl.start !== last) console.log('Syllable split is not compatible to line', syl.start, last);
                const frag = Math.round(((syl.end ?? Math.max(last, part.end)) - last) * 100);
                text.push(`\{\\kf${frag}\}${!Number(i) ? (part.text + '|<') : '#|'}${syl.notation}`);
                last = syl.end ?? Math.max(last, part.end);
            }
        } else text.push(`\{\\kf${during}\}${part.text}`);
    }
    return text.join('');
}

export const lineToString = (
    line: Lib.Line, furigana: FuriganaMode = 'none'
): [number, string] => {
    const text = [], axis = [line.duration[0]];
    let i = 1;
    if (furigana === 'accurate') {
        for (const syl of line.content) axis.push(syl.start);
        axis.push(line.duration[1]);
        for (const syl of line.content) {
            const during = Math.round((axis[i + 1] - axis[i ++]) * 100);

            text.push(`\{\\kf${during}\}`);
            if (!syl.null) text.push(syl.text ?? '#');
            if (syl.ruby) text.push(syl.linked ? '|' : '|<', syl.ruby);
        }
    } else {
        for (const syl of line) axis.push(syl.start);
        axis.push(line.duration[1]);
        for (const syl of line) {
            const during = Math.round((axis[i + 1] - axis[i ++]) * 100);

            text.push(`\{\\kf${during}\}${syl.text}|<${syl.ruby ?? ''}`);
        }
    }
    return [axis[1] - axis[0], text.join('')];
}

export const assColor = (
    r: number, g: number, b: number, a?: number) => {
    const _ = (x: number) =>
        ("00" + (Math.round(x) % 256).toString(16)).slice(-2);
    const rr = _(r), gg = _(g), bb = _(b), aa = _(a ?? 255);
    if (!a) return `&H${bb + gg + rr}&`.toUpperCase();
    else return `&H${aa + bb + gg + rr}`.toUpperCase();
}

const package_json = require('../../package.json');

const scriptInfo = (
    x: number, y: number, ti: string = ''
) => `
[Script Info]
; Script generated by ${package_json.name}.
; Made with love by ${package_json.author}.
; ${package_json.repository}
ScriptType: v4.00+
Title: ${ti}
PlayResX: ${x}
PlayResY: ${y}
Timer: 100.0000
`

namespace AssRenderer {

    type LineRenderOption = {
        furigana: FuriganaMode
    }

    const lineRenderOption
        : Readonly<LineRenderOption> = {
        furigana: 'simple'
    }

    export const renderLine = (
        line: Lib.Line, op: Partial<LineRenderOption> = {}) => {
        op = utils.mix(op, lineRenderOption);
        const [lead, text] = lineToString(line, op.furigana);
        const [start, end] = line.duration;
        return new Lib.RenderHelper.RenderedLine(start, end, text, lead);
    }

    export const renderSubtitle = (
        sub: Subtitle, op: Partial<LineRenderOption> = {}) =>
        sub.reduce((arr, line) => {
            arr.push(line); return arr;}, Array<Line>()).map(i =>
        renderLine(i, op));



    export class V4PlusStyle {

        constructor(
            public name: string,
            public font: {
                name: string,
                size: number,
                bold: boolean,
                italic: boolean,
                underline: boolean,
                strikeout: boolean
            },
            public color: {
                primary: string,
                secondary: string,
                outline: string,
                back: string
            },
            public scale: {
                x: number,
                y: number
            },
            public spacing: number,
            public angle: number,
            public border: number,
            public outline: number,
            public shadow: number,
            public align: number,
            public margin: {
                l: number,
                r: number,
                v: number
            },
            public encoding: number
        ) {}

        static readonly format = 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding';

        static from(str: string) {
            str = str.trim();
            if (str.slice(0, 6).toLowerCase()
                === 'style:') str = str.slice(6).trim();
            const _ = str.split(',');
            if (_.length !== 23) return undefined;
            return new V4PlusStyle(_[0], {
                name: _[1], size: parseInt(_[2]), bold: !!parseInt(_[7]), italic: !!parseInt(_[8]),
                underline: !!parseInt(_[9]), strikeout: !!parseInt(_[10])
            }, {primary: _[3], secondary: _[4], outline: _[5], back: _[6]
            }, {x: parseInt(_[11]), y: parseInt(_[12])}, parseInt(_[13]),
                parseInt(_[14]), parseInt(_[15]), parseInt(_[16]), parseInt(_[17]),
                parseInt(_[18]), {l: parseInt(_[19]), r: parseInt(_[20]), v: parseInt(_[21])
            }, parseInt(_[22]));
        }

        toString() {
            const _ = (x: number | boolean) =>
                typeof x === 'boolean' ? (x ? '1' : '0') : x.toString()
            const builder = [
                this.name, this.font.name, _(this.font.size), this.color.primary,
                this.color.secondary, this.color.outline, this.color.back, _(this.font.bold),
                _(this.font.italic), _(this.font.underline), _(this.font.strikeout), _(this.scale.x),
                _(this.scale.y), _(this.spacing), _(this.angle), _(this.border), _(this.outline),
                _(this.shadow), _(this.align), _(this.margin.l), _(this.margin.r), _(this.margin.v),
                _(this.encoding)
            ];
            return 'Style: ' + builder.join(',');
        }

        clone() { return V4PlusStyle.from(this.toString()); }
    }

    export type EventType = 'Comment' | 'Dialogue';


    export class EventLine {

        static readonly format = 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text';

        constructor(
            public type: EventType,
            public layer: number,
            public start: number,
            public end: number,
            public style: string,
            public name: string,
            public margin: {
                l: number, r: number, v: number
            },
            public effect: string,
            public text: string
        ) {}

        static parseTime(str: string) {
            const [h, m, s] = str.trim().split(':');
            return parseInt(h) * 3600 + parseInt(m) * 60 + Number(s);
        }

        static formatTime(time: number) {
            const _ = (x: number) => ("00" + x).slice(-2);
            const i = Math.round(time * 100), f = i % 100, a = Math.floor(i / 100);
            const h = Math.floor(a / 3600), m = Math.floor(a % 3600 / 60);
            return `${h}:${_(m)}:${_(a % 60)}.${_(f)}`;
        }

        static from(str: string, type: EventType = 'Dialogue') {
            str = str.trim();
            if (str.slice(0, 8) === 'Comment:') {
                type = 'Comment';
                str = str.slice(8).trim()
            } else if (str.slice(0, 9) === 'Dialogue:')
                str = str.slice(9).trim();
            const [layer, start, end, style, name, ml, mr, mv, eff, txt, ..._txt
            ] = str.split(',');
            const text = (_txt?.length) ? txt + ',' + _txt.join(',') : txt;
            return new EventLine(type, parseInt(layer),
                EventLine.parseTime(start), EventLine.parseTime(end),
                style, name, {l: parseInt(ml), r: parseInt(mr), v: parseInt(mv)
            }, eff, text);
        }

        toString() {
            return this.type + ": " + [this.layer, EventLine.formatTime(this.start),
            EventLine.formatTime(this.end), this.style, this.name, this.margin.l.toString(),
            this.margin.r.toString(), this.margin.v.toString(), this.effect, this.text].join(',');
        }

        clone() { return EventLine.from(this.toString()); }

        inspect() { return utils.inspect(this); }

    }

    export class RenderedASS {

        public addon: Record<string, string[] | Record<string, string>> = {};

        constructor(
            public res: [number, number] = [1920, 1080],
            public styles: V4PlusStyle[] = [],
            public events: EventLine[] = []
        ) {}

        get styleMap(): Record<string, V4PlusStyle> {
            return this.styles.reduce((map, cur) => {
                map[cur.name] = cur; return map;}, {});
        }

        render() {
            const text = [scriptInfo(this.res[0], this.res[1]), `[V4+ Styles]`, V4PlusStyle.format];
            for (const style of this.styles) text.push(style.toString());
            for (const key in this.addon) {
                text.push(`\n[${key}]`);
                const section = this.addon[key];
                for (const k in section)
                    if (!isNaN(parseInt(k))) text.push(section[k]);
                    else text.push(`${k}: ${section[k]}`);
            }
            text.push(`\n[Events]`, EventLine.format);
            for (const line of this.events) text.push(line.toString());
            return text.join('\n');
        }

    }
}

export const addAegisubInfo = (
    ass: AssRenderer.RenderedASS, param: {
    audio?: string,
    video?: string } = {}
) => {
    const set = (ass.addon['Aegisub Project Garbage'] ??= {})
    set['Audio File'] = param.audio ?? '';
    set['Video File'] = param.video ?? '';
}

export default AssRenderer;