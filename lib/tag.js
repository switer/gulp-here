'use strict'

var path = require('path')
var querystring = require('querystring')
var lang = require('./lang')
var extMap = {}

function extname (file) {
    var ext = path.extname(file.path || file).toLowerCase()
    return extMap[ext] || ext
}
module.exports = {
    inline: function (file, target, opts) {
        var wrapper = ''
        if (opts.wrap) {
            switch (extname(file)) {
                case '.css':
                    wrapper = '<style>$</style>'
                    break
                case '.js':
                    wrapper = '<script>$</script>'
                    break
                case '.jsx':
                    wrapper = '<style type="text/jsx">$</style>'
                    break
                case '.coffee':
                    wrapper = '<style type="text/coffeescript">$</style>'
                    break
                case '.html':
                    wrapper = '<script type="text/html">$</script>'
                    break
            }
        } else {
            wrapper = '$'
        }
        return wrapper.replace('$', file.contents.toString())
    },
    transform: function (file, target, opts) {
        var wrapper = ''
        switch (extname(file)) {
            case '.css':
                wrapper = '<link rel="stylesheet" href="$" />'
            case '.js':
                wrapper = '<script src="$"></script>'
                break
            case '.jsx':
                wrapper = '<script type="text/jsx" src="$"></script>'
                break
            case '.coffee':
                wrapper = '<script type="text/coffeescript" src="$"></script>'
                break
            case '.html':
                wrapper = '<link rel="import" href="$" />'
                break
            case '.png':
            case '.gif':
            case '.jpg':
            case '.jpeg':
            case '.webp':
                wrapper = '<img src="$">'
                break
        }
        var url = file.path || file
        if (target && opts.relative && !lang.protocol.test(url)) {
            return wrapper.replace('$', path.relative(path.dirname(target.path), url))
        } else {
            return wrapper.replace('$', url)
        }
    },
    extMap: function (from, to) {
        extMap['.' + from] = '.' + to
    },
    /**
     * Here' tag expression parse functon
     */
    expr: function (str) {
        // here:xx:xxx??inline
        var matches = /^<!--\s*here\:(.*?)\s*-->$/.exec(str.trim())
        if (!matches || !matches[1]) return null
        var expr = matches[1]
        var parts = expr.split('??')
        var query = querystring.parse(parts[1] || '')
        var isInline = ('inline' in query) && query.inline != 'false'
        var isWrapping = query.wrap !== 'false'
        var namespace = ''
        var reg

        expr = parts[0]
        parts = expr.split(':')
        if (parts.length > 1) {
            namespace = parts.shift()
        }
        reg = new RegExp(parts.pop())

        return {
            regexp: reg,          // resource match validate regexp
            namespace: namespace, // resource namespace match
            inline: isInline,      // whether inline resource or not
            wrap: isWrapping
        }
    }
}