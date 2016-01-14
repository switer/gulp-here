'use strict'

var gulp = require('gulp')
var path = require('path')
var here = require('../index')
var cssmin = require('gulp-cssmin')

// here.mapping('css', 'html')

gulp.task('default', function () {
    var asserts = gulp.src(['asserts/*.css','asserts/*.js']).pipe(cssmin())

    return gulp.src('asserts/*.html')
            .pipe(
                here(asserts, {
                    name: 'asserts',
                    // sort call before transform
                    sort: function (resources, target) {
                        // resource => ['dist/a.js', 'dist/b.js', 'dist/a.css']
                        function isSecondary (f) {
                            return /secondary\.js/.test(f.path)
                        }
                        return resources.sort(function (a, b) {
                            if (isSecondary(a) & !isSecondary(b)) return 1
                            else if (!isSecondary(a) && isSecondary(b)) return -1
                            else return 0
                        })
                    },
                    transform: function (file, target, opt) {
                        if (/\.css$/.test(file.path)) {
                            return '<link rel="stylesheet" href="$" />'.replace('$', 'path/to/' + path.basename(file.path))
                        }
                        return true
                    }
                })
            )
            .pipe(
                here(
                    asserts.pipe(cssmin()), { name: 'release' }
                )
            )
            .pipe(
                here(
                    asserts.pipe(cssmin()), { name: 'no-transform' }
                )
            )
            .pipe(gulp.dest('dist'))
})