module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    karma: {
      options: {
        configFile: 'spec/karma.conf.js',
        browsers: ['PhantomJS'],
        autoWatch: true
      },
      ci: {
        options: {
          browsers: ['PhantomJS'],
          reporters: ['dots'],
          autoWatch: false,
          singleRun: true,
          preprocessors: {
            '**/app/**/*': 'coverage'
          }
        }
      },
      watch: {
        options: {
          browsers: ['PhantomJS'],
          reporters: ['dots', 'growl'],
          autoWatch: true
        }
      }
    },
    uglify: {
      'jquery-ajax-goodies-min.js': ['jquery-ajax-goodies.js']
    },
    jshint: {
      all: [
        'Gruntfile.js',
        'spec/**/*spec.js',
        'jquery-ajax-goodies.js'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },
    version: {
      update: {
        src: ['component.json', 'package.json']
      }
    }
  });

  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-version');

  grunt.registerTask('test', ['jshint', 'karma:ci']);
  grunt.registerTask('default', ['test', 'uglify']);

  grunt.registerTask('release', 'Releasing new version with update version', function() {
    var type = this.args[0] || 'patch';
    grunt.task.run(['test', 'version:update:' + type, 'uglify']);
  });
};