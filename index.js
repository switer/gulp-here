'use strict'

var through = require('through2')
var gutil = require('gulp-util')
var es = require('event-stream')
var ASTParser = require('block-ast')
var path = require('path')
var PluginError = gutil.PluginError
var PLUGIN_NAME = require('./package.json').name

var parser = ASTParser(
    /<!--\s*\/?\brelease\b.*?-->/gm
, function isSelfCloseTag(tag) {
    return /<!--\s*release\:.*?\/-->/m.test(tag)
}, function isOpenTag(tag) {
    return /^<!--\s*release\:/m.test(tag)
}, {
    strict: true
})

function inlineTag (file) {
    switch (path.extname(file.path)) {
        case '.js':
            return '<script>$</script>'.replace('$', file.contents.toString())
        case '.css':
            return '<style>$</style>'.replace('$', file.contents.toString())
    }
}
function transformTag(file) {
    switch (path.extname(file.path)) {
        case '.js':
            return '<script src="$"></script>'.replace('$', file.path)
        case '.css':
            return '<link rel="stylesheet" href="$" />'.replace('$', file.path)
    }
}
function parseExpr(str) {
    // release:xx:xxx??inline
    var matches = /^<!--\s*release\:(.*?)\s*-->$/.exec(str.trim())
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
        regexp: reg,
        namespace: namespace,
        inline: isInline
    }
}
module.exports = function (rstream, opts) {
    opts = opts || {}

    var resources = []
    var transform = opts.transform
    var sort = opts.sort
    var namespace = opts.name
    var done

    function collectResources(cb) {
        if (done) cb(resources)
        else {
            rstream.pipe(es.through(function (data) {
                resources.push(data)
                this.emit(data)
            }, function () {
                done = true
                this.emit('end')
                cb(resources)
            }))
        }
    }
    return es.map(function (tpl, cb) {
        if (tpl.isStream()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Stream is not supported for template target!'))
            return cb(null, tpl)
        }
        var content = tpl.contents.toString()
        var ast = parser(content)

        collectResources(function (rs) {
            if (sort) {
                rs = sort(rs.slice(0), tpl)
            }
            var count = 0
            function walk(node, scope) {
                var output = ''
                var isBlock
                switch(node.nodeType) {
                    case 1: 
                        output += node.childNodes.map(function (n) {
                            return walk(n, scope)
                        }).join('')
                        break
                    case 2:
                        isBlock = true
                    case 3:
                        var expression = isBlock ? node.openHTML : node.outerHTML
                        var startag = isBlock ? expression : expression.replace(/\/-->$/, '-->')
                        var endtag = isBlock ? node.closeHTML : '<!--/release-->'
                        var exprObj = parseExpr(expression)
                        if (exprObj) {
                            output += startag
                            if (namespace && exprObj.namespace !== namespace) {
                                break
                            } else {
                                output += rs.reduce(function (next, file) {
                                    if (! exprObj.regexp.test(file.path) ) return next

                                    var result = true
                                    if (transform) {
                                        result = transform(file, tpl, {inline: exprObj.inline})
                                    }
                                    if (result === true) {
                                        count ++
                                        next.push(exprObj.inline ? inlineTag(file) : transformTag(file))
                                    } else if (result) {
                                        count ++
                                        next.push(result)
                                    }
                                    return next
                                }, []).join('')
                            }
                            output += endtag
                        } else {
                            console.warn('Unvalid release expression:"' + expression +'"')
                            break
                        }
                        break
                    case 4:
                        output += node.nodeValue
                }
                return output   
            }
            tpl.contents = new Buffer(walk(ast))
            console.log('Inject ' + count + ' files to ' + path.basename(tpl.path))
            cb(null, tpl)
        })
    })
}