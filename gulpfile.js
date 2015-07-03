var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var gutil = require('gulp-util');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var reactify = require('reactify');
var sass = require('gulp-sass');
var fs = require('fs-extra');
var exec = require('child_process').exec;
var composer = require('gulp-composer');
var path = require('path');
var install = require("gulp-install");

gulp.task('script', function() {
    // set up the browserify instance on a task basis
    var b = browserify({
        entries: 'js/main.js',
        debug: true,
    }).transform('debowerify');

    var r = b.bundle()
        .pipe(source('out.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({
            loadMaps: true
        }))
        .on('error', gutil.log);
    if (!gulp.env.dev) r = r.pipe(uglify());
    return r
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('dist/'));
});

gulp.task('script:watch', function() {
    gulp.watch('./js/main.js', ['script']);
});

gulp.task('style', function() {
    gulp.src('./css/style.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('./dist'));
});

gulp.task('style:watch', function() {
    gulp.watch('./css/style.scss', ['style']);
});

gulp.task('clean', function() {
    fs.removeSync(__dirname+'/vendor');
    fs.removeSync(__dirname+'/bower_components');
    fs.removeSync(__dirname+'/lib');
});

gulp.task('install', function() {
    // gulp.src(['./bower.json', './package.json']) // FIXME Doesn't work
    //     .pipe(install());
});

gulp.task('composer', function() {
    composer({ cwd: __dirname, bin: 'composer' });
});

gulp.task('bootstrap', ['install', 'script', 'style', 'composer']);

gulp.task('watch', ['bootstrap', 'script:watch', 'style:watch']);

gulp.task('package', ['bootstrap'], function() {
    exec("tar -zcvf ipbbx-cdr.tar.gz --exclude='.git' --exclude='node_modules' --exclude='js' --exclude='css' "+path.basename(__dirname), {
        cwd: path.normalize(__dirname+'/..')
    });
});

gulp.task('default', ['watch']);
