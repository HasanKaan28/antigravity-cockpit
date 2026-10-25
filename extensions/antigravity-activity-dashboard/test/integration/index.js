'use strict';
const path = require('path');
const Mocha = require('mocha');

function run() {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 10000
    });

    const testsRoot = path.resolve(__dirname);
    const fs = require('fs');
    const files = fs.readdirSync(testsRoot).filter(f => f.endsWith('.test.js'));

    files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

    return new Promise((resolve, reject) => {
        try {
            mocha.run(failures => {
                if (failures > 0) {
                    reject(new Error(`${failures} integration tests failed.`));
                } else {
                    resolve();
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { run };
