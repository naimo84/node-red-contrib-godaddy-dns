var gulp = require("gulp");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");
var sourcemaps = require('gulp-sourcemaps');
var paths = {
    pages: ['src/*.html'],
    assets: ['src/icons/*.png'],
    locales: ['locales/**/*.*']
};

gulp.task("copy-html", function () {
    return gulp.src(paths.pages)
        .pipe(gulp.dest("dist"));
});

gulp.task("copy-assets", function () {
    return gulp.src(paths.assets)
        .pipe(gulp.dest("dist/icons"));
});

gulp.task("copy-locales", function () {
    return gulp.src(paths.locales)
        .pipe(gulp.dest("dist/locales"));
});

function bundle() {
    return tsProject.src() 
    .pipe(sourcemaps.init())       
    .pipe(tsProject())      
    .js
    .pipe(sourcemaps.write('.')) 
    .pipe(gulp.dest("dist"))
    ;
}

gulp.task("default", gulp.series(gulp.parallel('copy-html'),gulp.parallel('copy-locales'),gulp.parallel('copy-assets'), bundle));