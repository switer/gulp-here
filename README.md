gulp-here
=========
[![npm version](https://badge.fury.io/js/gulp-here.svg)](https://badge.fury.io/js/gulp-here)

Transform and inject resources into HTML template.

## Install

```bash
npm install gulp-here --save-dev
```

## Usage


* **In gulp stream:**

```js
var here = require('gulp-here')
gulp.src('asserts/*.html')
    .pipe(
        here(gulp.src(['asserts/*.css', 'asserts/*.js']), {
            /**
             * Namespace match
             * @optional
             * @type {String}
             */
            name: 'asserts',
            /**
             * Sort method of the injecting order of resources
             * @optional
             * @param  {Array} resources  resources list, each item is a vinyl stream
             * @param  {Stream} target    target html template for injecting
             * @param  {Object} options   options given by `Here`'s tag of html template
             * @return {Array}            New resources list
             */
            sort: function (resources, target, options) {
                // resource => ['dist/a.js', 'dist/b.js', 'dist/a.css']
            },
            /**
             * Change resource's path manually
             * @optional
             * @param  {Stream} file      file is a resource that will be injected to template file. It's a vinyl stream.
             * @param  {Stream} target    target html template for injecting
             * @param  {Object} options   options given by here's tag of template html
             * @return {String} full path of the resource
             */
            prefix: function (file, target, options) {
                // set relative to false will not change path to relative path of "cwd"
                option.relative = false
                return  '/path/to/cdn/' + file.relative
            },
            // or 
            // prefix: 'http://path/to/resource/',
            /**
             * Transform method that for injecting custom resource url/content
             * @optional
             * @param  {Stream} file      file is a resource that will be injected to template file. It's a vinyl stream.
             * @param  {Stream} target    target html template for injecting
             * @param  {Object} options   options given by here's tag of template html
             * @return {String|Boolean}   
             */
            transform: function (file, target, options) {
                if (cnd1) return false // will skip inject step
                else if (cnd2) return '<script src="$"></script>'.replace(PREFIX, file.path) // transform to custom centent
                else return true // continue inject step
            }
        )
    )
```
> Notice: File object is a [vinly](https://github.com/gulpjs/vinyl) stream.

* **Template syntax:**

Inject tag syntax in the format of: 

```html
<!--here[:namespace]:regex_match[??query]--><!--here-->
```

Support queries:
    
- **inline** 
    Inline file contents to HTML, default `false`

- **wrap** 
    HTML tag wrapper HTML tag for resource contontent, default `true`.Using with inline only.

For example:
```html
<!-- here:asserts_here:\.html$??inline&wrap=false --><!-- /here -->
```

Inline resources:

> Notice: query will be passed to **sort** and **transform** method as options.

```html
<!-- here:\.css$??inline --><!-- /here -->
```

Namespace match(`matching with "options.name" if given`):
```html
<!-- here:namespace:\.css$ --><!-- /here -->
```

More complex matching regexp:
```html
<!-- here:\.(css|js|jsx)$ --><!-- /here -->
```


* **Extname mapping:**

Using `here.mapping(from, to)` to map extension of resource for reusing default wrapper when injecting:
```js
here.mapping('ejs', 'html')
    .mapping('less', 'css')
```
