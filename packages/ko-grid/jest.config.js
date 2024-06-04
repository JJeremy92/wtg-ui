module.exports = {
    moduleNameMapper: {
        knockout: '<rootDir>/../../node_modules/knockout/build/output/knockout-latest.debug.js',
        'jquery-ui': '<rootDir>/../../node_modules/jquery-ui-dist/jquery-ui.js'
    },
    restoreMocks: true,
    setupFiles: ['./jestSetupFile.js'],
    testRegex: '__tests__/.*\\.test\\.ts',
    transform: {
        '^.+\\.[jt]s$': 'babel-jest',
        '^.+\\.html$': 'html-loader-jest'
    }
};
