mkdir -p lib
mkdir -p dist
node_modules/.bin/babel --retain-lines src --out-dir lib
node_modules/.bin/browserify -t babelify src/index.js > dist/data-guard.js
node_modules/.bin/uglifyjs dist/data-guard.js > dist/data-guard.min.js
