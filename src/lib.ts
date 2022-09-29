
import {Lyric} from 'lrc-utils';

type BiDirectIteratorRef<T> = {
    value: T | undefined, done: boolean, start: boolean, id: number
}

export type BiDirectIterator<T> = {
    [k: string | number | symbol]: any,
    next: () => BiDirectIteratorRef<T>,
    prev: () => BiDirectIteratorRef<T>,
    hasNext: () => boolean,
    hasPrev: () => boolean,
    valid: () => boolean,
    index: () => number,
    ref: () => BiDirectIteratorRef<T>
}

type BiDirectIteratorConstructor<T> = () => BiDirectIterator<T>

type CompareResult = -1 | 0 | 1

const createBiDirectIterator = <T>(
    i: number, n: number,
    findPrev: (i: number) => number,
    findNext: (i: number) => number,
    getRef: (i: number) => BiDirectIteratorRef<T>
): BiDirectIterator<T> => ({
    next: () => {
        const ret = getRef(i);
        i = findNext(i);
        return ret;
    },
    prev: () => {
        const ret = getRef(i);
        i = findPrev(i);
        return ret;
    },
    hasNext: () => i >= -1 && i < n,
    hasPrev: () => i > -1 && i <= n,
    valid: () => i > -1 && i < n,
    index: () => i,
    ref: () => getRef(i)
})

const presets = {
    subtitleMaxLength: 3600,
    paragraphInterval: 1,
    timeStampFixed: 2,
}

export class Syllable {

    constructor(
        public readonly start: number,
        public readonly text: string | null,
        public readonly ruby: string | null
    ) {}

    public static link(
        master: Syllable,
        ...slave: Syllable[]
    ): Syllable[] {
        const text = slave.reduce((arr, ii) => {
            if (ii.text) arr.push(ii.text);
            return arr;
        }, [master.text]).join('');
        return slave.reduce((ret, ii) => {
            const {start, ruby} = ii;
            if (ruby === '' || ruby === null) {
                console.log('Empty syl tag detected, ignored.');
                return ret;
            } else ret.push(new Syllable(start, null, ruby));
            return ret;
        }, [new Syllable(master.start, text, master.ruby)]);
    }

    public static combine(
        master: Syllable,
        ...slave: Syllable[]
    ): Syllable {
        const ruby = slave.reduce((str, cur) =>
            str + (cur.ruby ?? ''), master.ruby ?? '');
        return new Syllable(master.start, master.text, ruby);
    }

    public static compare(a: Syllable, b: Syllable): CompareResult {
        return a.start > b.start ? 1 : (a.start < b.start ? -1 : 0);
    }

    get linked() { return this.text === null; }

    get null() { return this.linked && this.ruby === null; }

    compareTo(x: Syllable) { return Syllable.compare(this, x); }

    inspect(expand = false) {
        if (expand) return `${this.start.toFixed(presets.timeStampFixed)}` +
            ' ' + (this.text ?? '<Linked>') + ' ' + (this.ruby ?? '');
        else return `[${this.start.toFixed(presets.timeStampFixed)}]${this.text ?? ''}(${this.ruby ?? ''})`
    }
}

export class Line {

    public [Symbol.iterator]: BiDirectIteratorConstructor<Syllable>

    private static iterateWord =
        (line: Line): BiDirectIterator<Syllable> => {
        let n = line.syl.length, i = 0;
        const validator = (id: number) => id >= 0 && id < n
        const findPrev = (ii: number) => {
            while (-- ii >= 0) if (!line.syl[ii].linked) return ii;
            return -1;
        }
        const findNext = (ii: number) => {
            while (++ ii < n) if (!line.syl[ii].linked) return ii;
            return n;
        }
        const merge = (ii: number) => {
            if (!validator(ii)) return undefined;
            const todo = [], main = line.syl[ii];
            while (++ ii < n)
                if (line.syl[ii].linked) todo.push(line.syl[ii])
                else break;
            return Syllable.combine(main, ...todo);
        }
        const getRef = (ii: number): BiDirectIteratorRef<Syllable> => ({
            start: !~ii, done: ii === n, value: merge(ii), id: ii});
        return createBiDirectIterator(i, n, findPrev, findNext, getRef);
    }

    constructor(
        private start: number,
        private end: number,
        private syl: Syllable[],
    ) {
        this[Symbol.iterator] = () => Line.iterateWord(this);
    }

    public static compare(a: Line, b: Line): CompareResult {
        if (a.start === b.start)
            return a.end < b.end ? -1 : (a.end > b.end ? 1 : 0);
        else return a.start > b.start ? 1 : -1;
    }

    get duration() { return [this.start, this.end]; }

    get content() { return this.syl; }

    get begin() { return Line.iterateWord(this); }

    reduce<T>(fn: (prev?: T, cur?: Syllable) => T, init: T) {
        for (const syl of this) init = fn(init, syl);
        return init;
    }

    forEach(fn: (cur?: Syllable, prev?: Syllable, next?: Syllable) => any) {
        const i = this.begin, j = this.begin, k = this.begin;
        j.prev(); k.next();
        while (i.valid())
            fn(i.next().value, j.next().value, k.next().value);
    }

    count(word = true) {
        if (word) return this.reduce(i => i + 1, 0);
        else return this.content.length;
    }

    compareTo(x: Line) { return Line.compare(this, x); }

    sort() { this.syl.sort(Syllable.compare); }

    adjust(start?: number, end?: number) {
        this.start = (start ?? this.start);
        this.end = (end ?? this.end);
    }


    retime(ds = 0, de = 0, mode?: 'pre' | 'post') {
        const [start, end] = this.duration;
        ds /= 1000; de /= 1000;
        this.start = (mode !== 'post' ? start : end) + ds;
        this.end = (mode !== 'pre' ? end : start) + de;
    }


    inspect(expand = [false, false, false]) {
        const [time, ruby, link] = expand;
        const head = `${this.start.toFixed(presets.timeStampFixed)}` +
            '->' + `${this.end.toFixed(presets.timeStampFixed)}`;
        if (!this.syl.length) return head + '  <Empty>';
        else return head + ` <${this.syl.length}>:` +
            this.syl.reduce((arr, cur) => {
                arr.push(' ');
                time && (cur.linked ? link : true)
                    && arr.push(`[${cur.start.toFixed(presets.timeStampFixed)}]`);
                arr.push(cur.text ?? '', ruby && cur.ruby ? `(${cur.ruby})` : '');
                return arr;
            } ,<string[]>[]).join('');
    }
}

type LineAppendix = {
    comment: boolean
}

export class Subtitle {

    private readonly state: Array<LineAppendix>;
    public [Symbol.iterator]: BiDirectIteratorConstructor<Line>;

    private static defaultAppendix:
        Readonly<LineAppendix> = {
        comment: false
    };

    private static iterateDialogue =
        (sub: Subtitle): BiDirectIterator<Line> => {
        let n = sub.lines.length, i = 0;
        const validator = (id: number) => id >= 0 && id < n
        const isDialogue = (i: number) =>
            validator(i) && !sub.state[i].comment;
        const findPrev = (ii: number) => {
            while (-- ii >= 0) if (isDialogue(ii)) return ii;
            return -1;
        }
        const findNext = (ii: number) => {
            while (++ ii < n) if (isDialogue(ii)) return ii;
            return n;
        }
        const getRef = (id: number): BiDirectIteratorRef<Line> => ({start: !~id,
            done: id === n, value: validator(i) ? sub.lines[id] : undefined, id});
        while (i < n && !isDialogue(i)) ++ i;
        return createBiDirectIterator(i, n, findPrev, findNext, getRef);
    }

    constructor(
        private lines: Line[] = [],
        private length?: number,
    ) {
        this.state = new Array<LineAppendix>(lines.length);
        this.state.fill(Subtitle.defaultAppendix, 0, lines.length);
        this[Symbol.iterator] = () => Subtitle.iterateDialogue(this)
    }

    reduce<T>(fn: (prev?: T, cur?: Line) => T, init: T) {
        for (const line of this) init = fn(init, line);
        return init;
    }

    forEach(fn: (cur?: Line, prev?: Line, next?: Line) => any) {
        const i = this.begin, j = this.begin, k = this.begin;
        j.prev(); k.next();
        while (i.valid())
            fn(i.next().value, j.next().value, k.next().value);
    }

    count(all = false) {
        if (all) return this.lines.length;
        else return this.reduce(i => i + 1, 0);
    }

    get duration() { return this.length; }

    push(line: Line) {
        this.lines.push(line);
        this.state.push(Subtitle.defaultAppendix);
    }

    get detail(): [readonly Line[], readonly LineAppendix[]] {
        return [this.lines, this.state]; }

    get content() { return this.lines; }

    get begin() { return Subtitle.iterateDialogue(this); }

    apply(start: number | number[], end: number,
          exec: (i: LineAppendix, ...rest: any[]) => LineAppendix) {
        if (typeof start !== 'number') {
            const n = end > -1 && end < start.length ? end : start.length;
            for (let i = 0; i < n; ++ i) {
                const ii = start[i];
                if (ii > -1 && ii < this.lines.length)
                    this.state[ii] = exec(this.state[ii])
            }
        } else {
            start = Math.max(0, Math.min(start, this.lines.length));
            end = Math.max(start, Math.min(end, this.lines.length));
            while (start < end) this.state[start ++] = exec(this.state[start]);
        }
    }

    hide(start: number | number[], end: number = this.lines.length) {
        this.apply(start, end, i => ({...i, comment: true}))}

    show(start: number | number[], end: number = this.lines.length) {
        this.apply(start, end, i => ({...i, comment: false}))}

    sort() { this.lines.sort(Line.compare); }


    static fromLyric(lyric: Lyric,
              inf = presets.subtitleMaxLength) {
        const n = lyric.lines.length, lines = [];
        for (let i = 0; i < n; ++ i) {
            const line = lyric.lines[i];
            const start = line.start, end = line.end ??
                (i + 1 === n ? inf : lyric.lines[i + 1].start);
            if (!line.content.length) continue;
            const syl: Syllable[] = [];
            for (const ii of line.content)
                if (ii.sup?.length > 1) {
                    const m = ii.sup.length;
                    syl.push(new Syllable(ii.start, ii.text, ii.sup[0].notation));
                    for (let j = 1; j < m; ++ j) syl.push(new Syllable(
                        ii.sup[j].start, null, ii.sup[j].notation));
                } else syl.push(new Syllable(ii.start, ii.text,
                    ii.sup && ii.sup.length ? ii.sup[0].notation : null));
            lines.push(new Line(start, end, syl));
        }
        return new Subtitle(lines, inf);
    }


}

export namespace RenderHelper {

    export class Paragraph {

        constructor(
            public lines: RenderedLine[] = []
        ) {}

        push(...line: RenderedLine[]) { this.lines.push(...line); }
    }

    export const divideParagraph = (lines: RenderedLine[],
                                    threshold = presets.paragraphInterval
    ): Paragraph[] => {
        const ret = [], n = lines.length;
        for (let i = 0; i < n; ++ i) {
            if (i === 0 ||
                Math.abs(lines[i].start - lines[i - 1].end) > threshold)
                ret.push(Array<RenderedLine>(lines[i]));
            else ret[ret.length - 1].push(lines[i]);
        }
        return ret.map(i => new Paragraph(i));
    }

    export class RenderedLine {

        constructor(
            public start: number,
            public end: number,
            public text: string,
            public lead: number = 0
        ) {}

        offset(lrcOffset: number) {
            this.start -= lrcOffset / 1000;
            this.end -= lrcOffset / 1000;
        }


        retime(ds = 0, de = 0, mode?: 'pre' | 'post') {
            const {start, end} = this;
            ds /= 1000; de /= 1000;
            this.start = (mode !== 'post' ? start : end) + ds;
            this.end = (mode !== 'pre' ? end : start) + de;
        }
    }































































}
