'use strict'

var path = require('path')

module.exports = {
    inline: function (file) {
        var wrapper = ''
        switch (path.extname(file.path)) {
            case '.js':
                wrapper = '<script>$</script>'
            case '.css':
                wrapper = '<style>$</style>'
        }
        return wrapper.replace('$', file.contents.toString())
    },
    transform: function (file) {
        var wrapper = ''
        switch (path.extname(file.path)) {
            case '.js':
                wrapper = '<script src="$"></script>'
            case '.css':
                wrapper = '<link rel="stylesheet" href="$" />'
        }
        return wrapper.replace('$', file.path)
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
        var query = parts[1]
        var isInline = /\binline\b/.test(query)
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
            inline: isInline      // whether inline resource or not
        }
    }
}