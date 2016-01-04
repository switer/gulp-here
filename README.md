gulp-here
=========
[![npm version](https://badge.fury.io/js/gulp-here.svg)](https://badge.fury.io/js/gulp-here)

Transform resource and inject to HTML

## Install

```bash
npm install gulp-here --save-dev
```

## Usage

**In gulp stream:**
```js
var here = require('gulp-here')
gulp.src('asserts/*.html')
    .pipe(
        require('gulp-here')(gulp.src(['asserts/*.css', 'asserts/*.js']), {
            /**
             * Namespace match
             * @optional
             * @type {String}
             */
            name: 'asserts',
            /**
             * sort method of all injected resources
             * @optional
             * @param  {Array} resources  resources list, each item is a vinyl stream
             * @param  {Stream} target    target html template for injecting
             * @param  {Object} options   options given by here's tag of template html.
             * @return {Array}            New resources list
             */
            sort: function (resources, target, options) {
                // resource => ['dist/a.js', 'dist/b.js', 'dist/a.css']
            },
            /**
             * sort method of all injected resources
             * @optional
             * @param  {Stream} file      file is a resource that will be injected to template file. It's a vinyl stream. 
             * @param  {Stream} target    target html template for injecting
             * @param  {Object} options   options given by here's tag of template html.
             * @return {String|Boolean}   
             */
            transform: function (file, target, options) {
                if (cnd1) return false // will skip inject step
                else if (cnd2) return '<script src="$"></script>'.replace(PREFIX, file.path) // transform to result
                else return true // continue inject step
            }
        )
    )
```

**Template syntax:**

Inject tag syntax in the format of: <!--here[:namespace]:regex_match[??query]--><!--here-->

> Notice: query will be passed to **sort** and **transform** method as options.
```html
<!-- here:\.css$ --><!-- /here -->
```

Inline resourcce:
```html
<!-- here:\.css$??inline --><!-- /here -->
```

Namespace match(`will match with optiosn.name if given`):
```html
<!-- here:namespace:\.css$ --><!-- /here -->
```

More complex regexpmatch:
```html
<!-- here:\.(css|js|jsx)$ --><!-- /here -->
```

