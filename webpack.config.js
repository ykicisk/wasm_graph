module.exports = {
    entry: {
        'application': './src/js/main.js',
    },
    output: {
        path: __dirname + '/dist/js',
        filename: 'bundle.js'
    },
    module: {
        loaders: [
            { 
                test: /\.js$/, 
                include: ['./src/js'],
                exclude: /node_modules/, 
                loader: "babel-loader"
            }
        ]
    },
    resolve: {
        extensions: ['.js']
    },
};
