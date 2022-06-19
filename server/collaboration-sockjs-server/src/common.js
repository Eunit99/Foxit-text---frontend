exports.uniqueId = (format) => {
    return format
        .replace(/x/g, () => randomChar('a', 'z'))
        .replace(/X/g, () => randomChar('A', 'Z'))
        .replace(/d/g, () => randomChar('0', '9'))
        .replace(/\?/g, () => {
            const i = Math.floor(Math.random() * 3);
            switch(i) {
                case 0:
                    return randomChar('a', 'z');
                case 1:
                    return randomChar('A', 'Z');
                case 2:
                    return randomChar('0', '9');
            }
        })
};
function randomChar(minChar, maxChar) {
    const max = maxChar.charCodeAt(0);
    const min = minChar.charCodeAt(0)
    return String.fromCharCode(min + Math.floor(Math.random() * (max - min)));
}