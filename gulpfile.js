var bower = require('gulp-bower');
var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var gutil = require('gulp-util');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var reactify = require('reactify');

gulp.task('bower', function() {
    return bower()
        .pipe(gulp.dest('lib/'));
});

gulp.task('javascriptDev', function() {
    // set up the browserify instance on a task basis
    var b = browserify({
        entries: 'js/main.js',
        debug: true,
        // defining transforms here will avoid crashing your stream
        // transform: [reactify]
    }).transform('debowerify');

    return b.bundle()
        .pipe(source('out.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({
            loadMaps: true
        }))
        // Add transformation tasks to the pipeline here.
        // .pipe(uglify())
        .on('error', gutil.log)
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('dist/'));
});

gulp.task('javascript', function() {
    // set up the browserify instance on a task basis
    var b = browserify({
        entries: 'js/main.js',
        debug: true,
        // defining transforms here will avoid crashing your stream
        transform: [reactify]
    }).transform('debowerify');

    return b.bundle()
        .pipe(source('out.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({
            loadMaps: true
        }))
        // Add transformation tasks to the pipeline here.
        .pipe(uglify())
        .on('error', gutil.log)
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('dist/'));
});

gulp.task('bootstrap', ['bower', 'javascript']);

gulp.task('dev', ['javascriptDev']);

gulp.task('default', ['bootstrap']);
