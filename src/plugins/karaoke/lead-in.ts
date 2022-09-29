import * as Lib from "../../lib";
import * as utils from "../../utils";
import {KaraokePassConstructor, KaraokePassEnv} from "./index";

type AutoLeadOptions = {

    mode: 'aegisub' | 'txt2ass' | 'default',
    extend: number,
    extend2: number
}

const standardAutoLead = (
    select: Lib.RenderHelper.Paragraph,
    param: AutoLeadOptions,
    env: KaraokePassEnv
) => {
    const {lines} = select, n = lines.length;
    let minDur = null
    for (let i = 1; i < n; ++ i) {
        const prev = lines[i - 1], cur = lines[i];
        const dur = cur.start - prev.end;
        if (dur > 0) {
            minDur = minDur ? Math.min(minDur, dur) : dur;
            cur.start = prev.end;
            cur.lead += dur;
        } else env.warn(
            'There are 2 lines with zero or negative interval:',
            prev.text, cur.text, `which interval is ${dur}`
        );
    }
}

const doubleLinesAutoLead = (
    select: Lib.RenderHelper.Paragraph,
    param: AutoLeadOptions,
    env: KaraokePassEnv
) => {
    const {lines} = select, n = lines.length;
    const {extend, extend2} = param;
    if (n < 1) return;
    let l1 = lines[0].start - extend, l2 = l1;
    for (let i = 0; i < n; i += 2) {
        const cur = lines[i], suc = lines[i + 2], nxt = lines[i + 1];
        cur.lead += cur.start - l1;
        cur.start = l1;
        cur.end = l1 = -extend + (suc?.start ?? nxt?.end ?? cur.end);
        cur.end = l1 += extend + (suc ? -extend : (nxt ? extend2 : extend));
    }
    for (let j = 1; j < n; j += 2) {
        const cur = lines[j];
        cur.lead += cur.start - l2;
        cur.start = l2;
        l2 = cur.end += extend2;
    }
}

const mixAutoLeadOptions = (
    op: Partial<AutoLeadOptions>
) => {
    const ret = utils.mix(op, {

        mode: 'default',
        extend: 0.8,
        extend2: 1.0
    } as AutoLeadOptions);
    if (op.extend && !op.extend2)
        ret.extend2 = op.extend;
    return ret;
}

const LeadIn: KaraokePassConstructor = (
    op: Partial<AutoLeadOptions> = {}
) => {
    const opt = mixAutoLeadOptions(op);
    return {
        name: 'Karaoke auto lead-in',
        exec: (kara, env) => {
            for (const para of kara.content)
                switch (op.mode) {
                    case "aegisub": standardAutoLead(para, opt, env); break;
                    case "default":default:
                    case "txt2ass": doubleLinesAutoLead(para, opt, env); break;
                }
        }
    }
}

export default LeadIn;
