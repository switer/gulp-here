'use strict'

var gulp = require('gulp')
var release = require('../index')
var cssmin = require('gulp-cssmin')

gulp.task('default', function () {
    return gulp.src('asserts/*.html')
            .pipe(
                release(
                    gulp.src(['asserts/*.css','asserts/*.js'])
                        .pipe(cssmin())
                    , {
                        name: 'asserts',
                        sort: function (resources, target) {
                            // resource => ['dist/a.js', 'dist/b.js', 'dist/a.css']
                            function isSecondary (f) {
                                return /secondary\.js/.test(f.path)
                            }
                            function isIndex (f) {
                                return /secondary\.js/.test(f.path)
                            }
                            return resources.sort(function (a, b) {
                                if (isSecondary(a) & !isSecondary(b)) return 1
                                else if (!isSecondary(a) && isSecondary(b)) return -1
                                else return 0
                            })
                        }
                    }
                )
            )
            .pipe(gulp.dest('dist'))
})