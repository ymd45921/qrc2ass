import * as utils from "../../utils";
import {execSync} from "child_process";
import * as zlib from "zlib";
import * as fs from "fs";
import * as path from "path";
import Lrc from "lrc-utils";
import { xml2js } from "xml-js";


const timeToString = (time: number) => Lrc.TimeStamp.toString(time / 1000);

export const qrcToLrc = (text: string) => {
    let ret = [], match;
    const lines = text.split(/[\r\n]/).map(i => i.trim());
    for (const line of lines) {
        if ((match = /^\[(\S+):(\S+)]$/.exec(line))) {
            ret.push(match[0]);
        } else if ((match = /^\[(\d+),(\d+)]/.exec(line))) {
            let out = "", base = parseInt(match[1]), sub;
            out += `[${timeToString(base)}]`;
            out += `<${timeToString(base)}>`;
            for (const re = /([^(^\]]*)\((\d+),(\d+)\)/g; (sub = re.exec(line));)
                out += `${sub[1]}<${timeToString(parseInt(sub[2]) + parseInt(sub[3]))}>`
            ret.push(out);
        }
    }
    return ret.join('\r\n');
}

type CallMethod = 'js-wasm' | 'win32'

const callCommand = (method: CallMethod) => {

    switch (method) {
        case "js-wasm": return `"${process.execPath}" ${path.join(__dirname, "qrc.js")}`
        case "win32": return path.join(__dirname, "qrc.exe")
        default: return ''
    }
}

const decoderSync = (hex: string, call: CallMethod = 'js-wasm') => {
    const stdout = execSync(callCommand(call), {input: hex});
    if (stdout.length !== 0) {
        try {
            const buffer = utils.hexToBuffer(stdout.toString());
            return zlib.unzipSync(buffer, {});
        } catch (e) {
            console.error(e);
        }
    } else console.warn('stdout is empty.')
    return Buffer.from("");
}

const decodeQrc = (qrc: Buffer | string) => {
    const buf: Buffer = (typeof qrc === 'string') ? fs.readFileSync(qrc) : qrc;
    return decoderSync(buf.toString('hex')).toString();
}


export interface QrcXml {
    _declaration: {
        _attributes: {
            version: string,
            encoding: string,
            [k: string]: any
        },
        [k: string]: any
    };
    QrcInfos: {
        LyricInfo: {
            _attributes: {
                LyricCount: string | number,
                [k: string]: any
            },
            Lyric_1: {
                _attributes: {
                    LyricType?: string | number,
                    LyricContent: string,
                    [k: string]: any
                },
                [k: string]: any
            },
            [k: string]: any
        },
        [k: string]: any
    },
    [k: string]: any
}

/**
 * @param   qrc Buffer stores qrc or path to qrc file
 * @return  Enhanced lrc string decoded from qrc
 */
const decode = (qrc: Buffer | string) => {
    const xml = xml2js(decodeQrc(qrc), {compact: true}) as QrcXml;
    const content = xml.QrcInfos?.LyricInfo?.Lyric_1?._attributes.LyricContent;
    if (content === undefined) {
        console.warn('LyricContent is not found in qrc xml.');
        return '';
    } else return qrcToLrc(content);
}

export default {
    decodeQrc,
    decoderSync,
    qrcToLrc,
    decode
}


