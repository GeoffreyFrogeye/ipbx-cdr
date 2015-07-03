var bower = require('gulp-bower');
var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var gutil = require('gulp-util');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var reactify = require('reactify');
var sass = require('gulp-sass');
// TODO gulp-install

gulp.task('bower', function() {
    return bower()
        .pipe(gulp.dest('lib/'));
});

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

gulp.task('bootstrap', ['bower', 'script', 'style']);

gulp.task('continous', ['bootstrap', 'script:watch', 'style:watch']);

gulp.task('default', ['continous']);
