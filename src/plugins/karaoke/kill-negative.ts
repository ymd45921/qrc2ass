import {KaraokePass} from "./index";

const killNegative: KaraokePass = {
    name: 'Kill negative time-tags',
    desc: 'Replace negative time-tags that caused by lead-in.',
    exec: kara => {
        for (const para of kara.content)
            for (const line of para.lines) {
                const cut = -line.start;
                if (cut > 0) {
                    line.lead = Math.max(line.lead - cut, 0);
                    line.start = 0;
                }
                line.end = Math.max(line.start, line.end);
            }
    }
}

export default killNegative;
