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
    }
}