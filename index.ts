import { convert } from './src/demo';

convert(
    `C:\\Users\\ymd45\\Desktop\\幽闭星光 - 紅に染まる恋の花 (with Marcia) - 250 - 紅に染まる恋の花_qm.qrc`, // QRC file: file to covert.
    String.raw`C:\Users\ymd45\Desktop\input.mp4`,   // Movie file - for Aegisub use, if you don't need it, you can set it to ''.
    String.raw`C:\Users\ymd45\Desktop\input.ass`,   // Output file - the directory where the file resides must have been created.
    true,               // Print QRC in console - check lyric content and determine the lines to delete.
    [0, 1, 2, 3],       // Lines to delete - start by 0, the lines contained here will not appear in the result.
    1.8,                // Paragraph spacing - specify the minimum length that intermezzos should have.
    0,                  // Lyric offset - in milliseconds, positive values advance lyrics, while negative values delay them.
    [1280, 720],        // Video resolution - if it does not match the video, the display may be misaligned.
    [255, 162, 40],     // Subtitle color - in [red, green, blue], range 0 to 255.
    [100, 50]           // Font size - in [Lyric, Furigana], recommend to [120, 60] in 1080p videos.
);