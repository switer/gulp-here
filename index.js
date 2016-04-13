'use strict'

var through = require('through2')
var gutil = require('gulp-util')
var es = require('event-stream')
var map = require('map-stream')
var ASTParser = require('block-ast')
var path = require('path')
var PLUGIN_NAME = require('./package.json').name
var Tag = require('./lib/tag')
var _ = require('underscore')
var PluginError = gutil.PluginError
var colors = gutil.colors

/**
 * Tokenier for parsing html to ast
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
 * Inject specified resources into template file
 * @param  {Stream} rstream Resource stream
 * @param  {Object} opts    Inject options
 * @return {stream}         Template files stream
 */
function here (rstream, opts) {
    opts = opts || {}

    var resources = []
    var sort = opts.sort
    var namespace = opts.name
    var transform = opts.transform
    var done // flag for resouce stream
    var waitting

    function collectResources(cb) {
        if (waitting) {
            waitting.push(cb)
        } else if (done) {
            cb(resources)
        } else if (rstream._done) {
            cb(rstream._resources || [])
        } else {
            waitting = []
            rstream.pipe(map(function (file, next) {
                resources.push(file)
                next(null, file)
            })).on('end', function () {
                rstream._done = done = true
                rstream._resources = resources
                cb(resources)
                var queue = waitting
                waitting = null
                setTimeout(function () {
                    queue.forEach(function (c) {
                        c(resources)
                    })
                })
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
                        var starttag = isBlock ? expression : expression.replace(/\/-->$/, '-->')
                        var endtag = isBlock ? node.closeHTML : '<!--/here-->'
                        var exprObj = Tag.expr(expression)
                        if (exprObj) {
                            output += starttag
                            if ( 
                                (!namespace && exprObj.namespace) || 
                                (namespace && (exprObj.namespace !== namespace && exprObj.namespace !== '*') ) 
                            ) {
                                if (node.childNodes.length) {
                                    output += node.childNodes.map(function (n) {
                                        return n.toString()
                                    }).join('')
                                }
                                output += endtag
                                break
                            } else {
                                var tagObj = {
                                    inline: exprObj.inline,
                                    wrap: exprObj.wrap,
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
                                    var opts = _.extend({}, tagObj)
                                    if (transform) {
                                        result = transform(file, tpl, opts)
                                    }
                                    if (result === true) {
                                        count ++
                                        return opts.inline 
                                            ? Tag.inline(file, tpl, opts) 
                                            : Tag.transform(file, tpl)
                                    } else if (result && opts.wrap) {
                                        return Tag.transform(result)
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
                PLUGIN_NAME + ': ' + colors.yellow(count ? '✔ ' : '❗ ') +
                colors.cyan(namespace ? '[' + namespace + '] ' : ' ' ) + 'Release', 
                colors.green(count), 
                'files to', 
                colors.blue(path.basename(tpl.path))
            )
            cb(null, tpl)
        })
    })
}

here.mapping = function (from, to) {
    Tag.extMap(from, to)
    return here
}

module.exports = here