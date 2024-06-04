module.exports = api => {
    if (api.env('test')) {
        return getTestConfig();
    } else {
        return getProductionConfig();
    }
};

function getTestConfig() {
    return {
        presets: [
            [
                '@babel/preset-env',
                {
                    targets: {
                        node: 'current'
                    }
                }
            ],
            '@babel/preset-typescript'
        ],
        plugins: ['@babel/plugin-proposal-optional-chaining'],
        retainLines: true,
        sourceMaps: 'inline'
    };
}

function getProductionConfig() {
    return {
        presets: [
            [
                '@babel/preset-env',
                {
                    targets: {
                        ie: 11
                    },
                    exclude: ['transform-async-to-generator', 'transform-regenerator']
                }
            ],
            '@babel/preset-typescript'
        ],
        plugins: ['module:fast-async', '@babel/plugin-proposal-optional-chaining']
    };
}
