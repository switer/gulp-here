gulp-here
=========
[![npm version](https://badge.fury.io/js/gulp-here.svg)](https://badge.fury.io/js/gulp-here)

Transform resource and inject to HTML

## Usage

```js
gulp.task('default', function () {
    return gulp.src('asserts/*.html')
            .pipe(
                require('gulp-herer')(
                    gulp.src(['asserts/*.css', 'asserts/*.js'])
                    , {
                        name: 'asserts',
                        sort: function (resources, target) {
                            // resource => ['dist/a.js', 'dist/b.js', 'dist/a.css']
                        }
                    }
                )
            )
            .pipe(gulp.dest('dist'))
})
```

Into resource to HTML: 

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title></title>
    <!-- here:asserts:\.css$??inline --><!-- /here -->
    <!-- here:asserts:\.css$ --><!-- /here -->
    <!-- here:will-not-inject:css??inline --><!-- /here -->
</head>
<body>
    <!-- here:asserts:\.js$ --><!-- /here -->
</body>
</html>
```

Render result: 

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title></title>
    <!-- here:asserts:\.css$??inline --><style> .inline-style-here{}</style><!-- /here -->
    <!-- here:asserts:\.css$ --><link rel="stylesheet" href="/path/to/asserts/index.css" /><!-- /here -->
    <!-- here:will-not-inject:css??inline -->
</head>
<body>
    <!-- here:asserts:\.js$ --><script src="/path/to/asserts/index.js"></script><script src="/path/to/asserts/secondary.js"></script><!-- /here -->
</body>
</html>
````