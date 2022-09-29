import * as Lib from '../../lib';
import AssRenderer, {assColor, FuriganaMode} from "../../utils/ass";
import leadIn from "./lead-in";
import killNegative from "./kill-negative";

const stylePresets = {
    k2f: AssRenderer.V4PlusStyle.from('Style: K2-furigana,Noto Serif CJK SC Black,60,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,3,30,200,40,1'),
    k1f: AssRenderer.V4PlusStyle.from('Style: K1-furigana,Noto Serif CJK SC Black,60,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,1,200,30,150,1'),
    k1: AssRenderer.V4PlusStyle.from('Style: K1,Noto Serif CJK SC Black,130,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,4,0,1,120,30,220,1'),
    k2: AssRenderer.V4PlusStyle.from('Style: K2,Noto Serif CJK SC Black,130,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,4,0,3,30,120,40,1'),
    clone: () => [stylePresets.k1.clone(), stylePresets.k2.clone(), stylePresets.k1f.clone(), stylePresets.k2f.clone()]
}

type CodeTextParams = Record<string, any>;

const _CodePresets = {
    code: ['0', ',0,0,0,code syl all,', (p: CodeTextParams = {}) => `fxgroup.kara=syl.inline_fx==""`],
    ko: ['1', 'overlay,0,0,0,template syl noblank all fxgroup kara,', (p: CodeTextParams = {}) =>
        `{\\pos($center,$middle)\\an5\\shad0\\1c${p.color ?? '&HFF0000&'}\\3c&HFFFFFF&\\clip(!$sleft-3!,0,!$sleft-3!,1080)\\t($sstart,$send,\\clip(!$sleft-3!,0,!$sright+3!,1080))\\bord5}`],
    k: ['0', ',0,0,0,template syl all fxgroup kara,', (p: CodeTextParams = {}) => `{\\pos($center,$middle)\\an5}`],
    kfo: ['1', 'overlay,0,0,0,template furi all,', (p: CodeTextParams = {}) =>
        `{\\pos($center,!$middle+10!)\\an5\\shad0\\1c${p.color ?? '&HFF0000&'}\\3c&HFFFFFF&\\clip(!$sleft-3!,0,!$sleft-3!,1080)\\t($sstart,$send,\\clip(!$sleft-3!,0,!$sright+3!,1080))\\bord5}`],
    kf: ['0', ',0,0,0,template furi all,', (p: CodeTextParams = {}) => `{\\pos($center,!$middle+10!)\\an5}`],
    nok: ['0', 'music,0,0,0,template fx no_k,', (p: CodeTextParams = {}) => `{\\pos($center,!$middle!)\\an5\\1c&H505050&\\3c&HFFFFFFF&}`]
}

const defaultRetime = (
    base?: [number, number],
    overlay?: [number, number],
    nok?: [number, number]
) => ({
    code: undefined,
    ko: overlay ?? [-100, 500],
    kfo: overlay ?? [-100, 500],
    k: base ?? [-500, 500],
    kf: base ?? [-500, 500],
    nok: nok ?? (base ?? [-500, 500])
})

const retimeCode = (param?: [number, number], str = '') =>
    (param ? `!retime("line",${Math.floor(param[0])},${Math.floor(param[1])})!` : '') + str;

const codeString = (
    layer: number, info: string, text: string, retime?: [number, number]
) => {
    const common = ',0:00:00.00,0:00:00.00,K1,';
    return `${Math.floor(layer)}${common}${info}${retimeCode(retime)}${text}`
}

const codePreset = (
    overlayColor: [number, number, number] | string = '&HFF0000&',
    retime?: {base: [number, number], overlay: [number, number], nok?: [number, number]}
) => {
    const rt = defaultRetime(retime.base, retime.overlay, retime.nok);
    const color = typeof overlayColor === 'string' ?
        overlayColor : assColor(...overlayColor);
    const tmp = {color};
    return ['code', 'ko', 'k', 'kfo', 'kf', 'nok'].reduce((arr, k) => {
        const [layer, info, text] = _CodePresets[k];
        arr.push(AssRenderer.EventLine.from(codeString(layer, info, text(tmp), rt[k]), 'Comment'));
        return arr;
    }, Array<AssRenderer.EventLine>());
}

const toEventLine = (
    line: Lib.RenderHelper.RenderedLine,
    pos: 'K1' | 'K2',
) => new AssRenderer.EventLine('Comment', 0,
    line.start, line.end, pos, '', {l: 0, r: 0, v: 0}, 'karaoke',
    (!!line.lead ? `{\\k${Math.round(line.lead * 100)}}` : '') + line.text);

export type KaraokePassEnv = {
    log: (...data: any[]) => void,
    warn: (...data: any[]) => void,
    error: (...data: any[]) => void,
    debug: (...data: any[]) => void,
    [k : number | string | symbol]: any
}

const defaultPassEnv =
    (): KaraokePassEnv => ({
    ...console
})

const readonlyPassEnv =
    (): Readonly<KaraokePassEnv> =>
    defaultPassEnv()

const passEnv = readonlyPassEnv();


export type KaraokePass = {
    name?: string,
    desc?: string,
    author?: string,
    version?: string,
    exec: (kara: Karaoke, env?: Readonly<KaraokePassEnv>) => any
}


export type KaraokePassConstructor =
    (...params: any[]) => KaraokePass;

export type KaraokeConfig = {
    interval: number,
    res_x: number,
    res_y: number,
    title: string,
    color: [number, number, number],
    furigana: FuriganaMode,
    retime: {
        overlay: [number, number],
        base: [number, number],
        nok: [number, number]
    } | null,
}

const mixKaraokeConfig = (
    input: Partial<KaraokeConfig>
): KaraokeConfig => {
    const ret: KaraokeConfig = {
        interval: 1,
        res_x: 1920,
        res_y: 1080,
        title: '',
        color: [0, 0, 255],
        furigana: 'simple',
        retime: {overlay: [0, 0], base: [0, 0], nok: [0, 0]},
    };
    for (const k in input)
        if (input[k] !== undefined) ret[k] = input[k];
    return ret;
}

export class Karaoke {

    private readonly para: Lib.RenderHelper.Paragraph[];
    private readonly cfg: KaraokeConfig;
    public pass: KaraokePass[] = [];

    constructor(
        sub: Lib.Subtitle,
        cfg: Partial<KaraokeConfig> = {}
    ) {
        this.cfg = cfg = mixKaraokeConfig(cfg);
        const lines = AssRenderer.renderSubtitle(sub, {furigana: cfg.furigana});
        this.para = Lib.RenderHelper.divideParagraph(lines, cfg.interval);
    }

    static time(x: number | string) {
        return typeof x === 'number' ?
            AssRenderer.EventLine.formatTime(x) :
            AssRenderer.EventLine.parseTime(x);
    }

    get lines() {
        return this.para.reduce((arr, cur) => {
            arr.push(...cur.lines); return arr;}, Array<Lib.RenderHelper.RenderedLine>())
    }

    get content() { return this.para; }

    get config() { return this.cfg; }

    register(...pass: KaraokePass[]) { this.pass.push(...pass); }

    exec(...pass: KaraokePass[]) {
        const todo = (pass.length === 0) ? this.pass : pass;
        for (const script of todo) {
            console.log(`Executing script '${script.name}'...`);
            script.exec(this, passEnv);
        }
    }



    toASS(): AssRenderer.RenderedASS {
        const ass = new AssRenderer.RenderedASS(
            [this.cfg.res_x, this.cfg.res_y],
            stylePresets.clone(), [...codePreset(this.cfg.color, this.cfg.retime)]);
        ass.events.push(...this.para.map(p => {
            return p.lines.map((line, id) =>
                toEventLine(line, id & 1 ? 'K2' : 'K1'))
        }).flat());
        return ass;
    }

    inspect() {
        const log = [];
        for (const p in this.para) {
            if (parseInt(p)) log.push('---\n');
            for (const line of this.para[p].lines)
                log.push(
                    Karaoke.time(line.start), ' -> ',
                    Karaoke.time(line.end), ': ',
                    'wait=', line.lead.toString(), ' ',
                    line.text, '\n'
                );
        }
        return log.join('');
    }

}



const alignOffset: KaraokePassConstructor = (
    offset: number
) => ({
    name: 'Align offset to lines',
    exec: kara => kara.lines.forEach(i => i.offset(offset))
})







const plugins = {
    alignOffset, leadIn, killNegative
}

export default {
    plugins, Karaoke, passEnv,
}
