/**
 * Unbundle samsung msf library:
 * node msf-unbundle
 */
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const { SourceMapConsumer } = require('source-map');

const filename = './vendor/msf-2.3.3.min.js.map';
const outdir = 'vendor/msf';

const WEBPACK_PREFIX = 'msf:///';
// for webpack 1
//const WEBPACK_FOOTER = '/*****************';
const WEBPACK_FOOTER = '//////////////////';

const readJson = filename => {
    try {
        return JSON.parse(fs.readFileSync(filename, 'utf8'));
    } catch(e) {
        console.error(`Parsing file '${filename}' failed: ${e.message}`);
        process.exit(1);
    }
}

const getSourceList = smc => {
    let sources = smc.sources
        .filter(src => src.startsWith(WEBPACK_PREFIX))
        .map(src => [cleanFilepath(src), src])
        .filter(([filePath]) => !filePath.startsWith('(webpack)'));

    return sources;
};

const cleanFilepath = filepath => filepath.replace(WEBPACK_PREFIX, '').replace('?', '');

const trimFooter = str => str.substr(0, str.indexOf(WEBPACK_FOOTER)).trimRight() + '\n';

const saveSourceContent = (smc, filePath, src) => {
    const content = trimFooter(smc.sourceContentFor(src));
    const outPath = path.resolve(path.join(outdir, filePath));
    const dir = path.dirname(outPath);

    if (content.length < 2) {
        console.log('empty file', filePath)
        return;
    }

    mkdirp(dir, err => {
        if (err) {
            console.error('Failed creating directory', dir);
            process.exit(1);
        } else {
            fs.writeFile(outPath, content, err => {
                if (err) {
                    console.error('Failed writing file', outPath);
                    process.exit(1);
                } else {
                    console.log('saved', outPath)
                }
            });
        }
    })
};

function processFile(filename) {
    const json = readJson(filename);
    const smc = new SourceMapConsumer(json);
    const sources = getSourceList(smc);
    sources.forEach(([filePath, src]) => saveSourceContent(smc, filePath, src));
    console.log(`Processed ${sources.length} files`);
}

fs.access(filename, err => {
    if (err) {
        console.error(err.message);
        process.exit(1);
    }

    processFile(filename);
});
