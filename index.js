'use strict'

var through = require('through2')
var gutil = require('gulp-util')
var es = require('event-stream')
var ASTParser = require('block-ast')
var path = require('path')
var PLUGIN_NAME = require('./package.json').name
var Tag = require('./lib/tag')
var PluginError = gutil.PluginError
var colors = gutil.colors

/**
 * Tokenier to parse html to ast
 */
var parser = ASTParser(
    /<!--\s*\/?\bhere\b.*?-->/gm
, function isSelfCloseTag(tag) {
    return /<!--\s*here\:.*?\/-->/m.test(tag)
}, function isOpenTag(tag) {
    return /^<!--\s*here\:/m.test(tag)
}, {
    strict: true
})

/**
 * Here' tag expression parse functon
 */
function parseExpr(str) {
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

/**
 * Inject specified resources into template file
 * @param  {Stream} rstream Resource stream
 * @param  {Object} opts    Inject options
 * @return {stream}         Template files stream
 */
module.exports = function (rstream, opts) {
    opts = opts || {}

    var resources = []
    var sort = opts.sort
    var namespace = opts.name
    var transform = opts.transform
    var done // flag for resouce stream

    function collectResources(cb) {
        if (done) cb(resources)
        else if (rstream._done) {
            cb(rstream._resources || [])
        } else {
            rstream.pipe(es.map(function (data, cb) {
                resources.push(data)
                cb(null, data)
            })).on('end', function () {
                rstream._done = done = true
                rstream._resources = resources
                cb(resources)
            })
        }
    }
    /**
     * Handle each template file independ
     */
    return es.map(function (tpl, cb) {
        if (tpl.isStream()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Stream is not supported for template target!'))
            return cb(null, tpl)
        }
        if (tpl.isNull()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Template target should not be null!'))
            return cb(null, tpl)
        }
        var content = tpl.contents.toString()
        var ast = parser(content)

        collectResources(function (resources) {
            var count = 0
            function walk(node, scope) {
                var output = ''
                var isBlock
                switch(node.nodeType) {
                    // root node of ast
                    case 1:
                        output += node.childNodes.map(function (n) {
                            return walk(n, scope)
                        }).join('')
                        break
                    // open tag
                    case 2:
                        isBlock = true
                    // self closing tag
                    case 3:
                        // expression form tag
                        var expression = isBlock ? node.openHTML : node.outerHTML
                        var startag = isBlock ? expression : expression.replace(/\/-->$/, '-->')
                        var endtag = isBlock ? node.closeHTML : '<!--/here-->'
                        var exprObj = parseExpr(expression)
                        if (exprObj) {
                            output += startag
                            if (namespace && exprObj.namespace !== namespace) {
                                output += endtag
                                break
                            } else {
                                var tagObj = {
                                    inline: exprObj.inline,
                                    namespace: exprObj.namespace
                                }
                                var rs = resources.slice(0)

                                rs = rs.reduce(function (next, file) {
                                    if (exprObj.regexp.test(file.path)) {
                                        next.push(file)
                                    }
                                    return next
                                }, [])


                                if (rs.length > 1 && sort) {
                                    rs = sort(rs, tpl, tagObj)
                                }

                                output += rs.map(function (file) {
                                    var result = true
                                    if (transform) {
                                        result = transform(file, tpl, tagObj)
                                    }
                                    if (result === true) {
                                        count ++
                                        return exprObj.inline 
                                            ? Tag.inline(file) 
                                            : Tag.transform(file)
                                    } else if (result) {
                                        count ++
                                        return result
                                    }
                                }).join('')
                            }
                            output += endtag

                        } else {
                            this.emit('error', new PluginError(PLUGIN_NAME, 'Unvalid expression:"' + expression +'"'))
                            break
                        }
                        break
                    case 4:
                        output += node.nodeValue
                }
                return output   
            }
            tpl.contents = new Buffer(walk(ast))
            gutil.log(
                PLUGIN_NAME + ': ' +
                colors.cyan(namespace ? '[' + namespace + '] ' : ' ' ) + 'Inject', 
                colors.green(count), 
                'files to', 
                colors.blue(path.basename(tpl.path))
            )
            cb(null, tpl)
        })
    })
}