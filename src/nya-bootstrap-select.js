/**
 * @license nya-bootstrap-select v1.2.6
 * Copyright 2014 nyasoft
 * Licensed under MIT license
 */

'use strict';

angular.module('nya.bootstrap.select',[])
  .directive('nyaSelectpicker', ['$parse', function ($parse) {

    // NG_OPTIONS_REGEXP copy from angular.js select directive
    var NG_OPTIONS_REGEXP = /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+group\s+by\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w]*)|(?:\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)))\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?$/;
    return {
      restrict: 'CA',
      scope: false,
      require: ['^ngModel', 'select'],

      link: function(scope, element, attrs, ctrls) {
        var optionsExp = attrs.ngOptions;
        var valuesFn, match, track, groupBy;
        if(optionsExp && (match = optionsExp.match(NG_OPTIONS_REGEXP))) {
          groupBy = match[3];
          console.log(optionsExp, groupBy);
          valuesFn = $parse(match[7]);
          track = match[8];
        }
        var ngCtrl = ctrls[0];
        var selectCtrl = ctrls[1];
        // prevent selectDirective render an unknownOption.
        selectCtrl.renderUnknownOption = angular.noop;
        var optionArray = [];

        // store data- attribute options of select
        var selectorOptions = {};
        var BS_ATTR = ['container', 'countSelectedText', 'dropupAuto', 'header', 'hideDisabled', 'selectedTextFormat', 'size', 'showSubtext', 'showIcon', 'showContent', 'style', 'title', 'width', 'disabled'];

        var checkSelectorOptionsEquality = function() {
          var isEqual = true;
          angular.forEach(BS_ATTR, function(attr) {
            isEqual = isEqual && attrs[attr] === selectorOptions[attr];
          });
        };

        var updateSelectorOptions = function() {
          angular.forEach(BS_ATTR, function(attr) {
            selectorOptions[attr] = attrs[attr];
          });

          return selectorOptions;
        };

        /**
         * Check option data attributes, text and value equality.
         * @param opt the option dom element
         * @param index the index of the option
         * @returns {boolean}
         */
        var checkOptionEquality = function(opt, index) {
          var isEqual = opt.value === optionArray[index].value && opt.text === optionArray[index].text;
          if(isEqual) {
            for(var i = 0; i< opt.attributes.length; i++){
              if(opt.attributes[i].nodeName.indexOf('data-')!==-1) {
                if(optionArray[index].attributes[opt.attributes[i].nodeName] !== opt.attributes[i].nodeValue) {
                  isEqual = false;
                  break;
                }
              }
            }
          }
          return isEqual;
        };

        var resetDataProperties = function(opt) {
          var attributes = opt.attributes;
          for(var i = 0; i < attributes.length; i++) {
            if(attributes[i].nodeName.indexOf('data-')!==-1) {
              $(opt).data(attributes[i].nodeName.substring(5, attributes[i].nodeName.length), attributes[i].value);
            }
          }
        };

        function optionDOMWatch(){
          // check every option if has changed.
          var optionElements = $(element).find('option');

          //if the first option has no value and label or value an value of ?, this must be generated by ngOptions directive. Remove it.
          if(!optionElements.eq(0).html() && (optionElements.eq(0).attr('value') ==='?' || !optionElements.eq(0).attr('value'))) {
            // angular seams incorrectly remove the first element of the options. so we have to keep the ? element in the list
            // only remove this ? element when group by is provided.
            if(!!groupBy) {
              optionElements.eq(0).remove();
            }
          }

          if(optionElements.length !== optionArray.length) {
            optionArray = makeOptionArray(optionElements);
            buildSelector();
          } else {
            var hasChanged = false;
            optionElements.each(function(index, value){
              if(!checkOptionEquality(value, index)) {
                // if check fails. reset all data properties.
                resetDataProperties(value);
                hasChanged = true;
              }
            });
            if(hasChanged) {
              buildSelector();
            }
            if(!checkSelectorOptionsEquality()) {
              updateSelectorOptions();
              $(element).selectpicker('refresh');
            }
            optionArray = makeOptionArray(optionElements);
          }
        }

        scope.$watch(function(){
          // Create an object to deep inspect if anything has changed.
          // This is slow, but not as slow as calling optionDOMWatch every $digest
          return {
            ngModel: ngCtrl.$viewValue,
            options: makeOptionArray( $(element).find('option') ),
            selectors: updateSelectorOptions()
          };
        // If any of the above properties change, call optionDOMWatch.
        }, optionDOMWatch, true);

        var setValue = function(modelValue) {
          var collection = valuesFn(scope);
          if(angular.isArray(collection) && !angular.isArray(modelValue)) {
            // collection is array and single select mode
            var index = indexInArray(modelValue, collection);
            if(index > -1) {
              $(element).val(index).selectpicker('render');
            }
          } else if(angular.isArray(collection) && angular.isArray(modelValue)) {
            // collection is array and multiple select mode.
            var indexArray = [];
            for(var i = 0; i < modelValue.length; i++) {
              var indexOfOptions = indexInArray(modelValue[i], collection);
              if(indexOfOptions > -1) {
                indexArray.push(indexOfOptions);
              }
            }
            $(element).val(indexArray).selectpicker('render');
          } else if(!angular.isArray(collection) && !angular.isArray(modelValue)) {
            // collection is object and single select mode.
            var key = keyOfObject(modelValue, collection);
            if(key) {
              $(element).val(key).selectpicker('render');
            }
          } else if(!angular.isArray(collection) && angular.isArray(modelValue)) {
            // collection is object and multiple select mode.
            var keyArray = [];
            for(var j = 0; j < modelValue.length; j++) {
              var k = keyOfObject(modelValue[j], collection);
              if(k) {
                keyArray.push(k);
              }
            }
            $(element).val(keyArray).selectpicker('render');
          }
        };

        ngCtrl.$render = function() {
          // model -> view
          var data = $(element).data('selectpicker');
          if(data) {
            if(!!valuesFn && !track) {
              // transform value to index of options
              setValue(ngCtrl.$viewValue);
            }
            else {
              $(element).val(ngCtrl.$viewValue).selectpicker('render');
            }
          }
        };

        function indexInArray(value, array) {
          for(var i = 0; i < array.length; i++) {
            if(angular.equals(value, array[i])) {
              return i;
            }
          }
          return -1;
        }

        function keyOfObject(value, object) {
          var key = null;
          angular.forEach(object, function(v, k) {
            if(angular.equals(v, value)) {
              key = k;
            }
          });
          return key;
        }

        /**
         * Copy option value and text and data attributes to an array for future comparison.
         * @param optionElements the source option elements. a jquery objects' array.
         * @returns {Array} the copied array.
         */
        function makeOptionArray(optionElements) {
          var optionArray = [];
          optionElements.each(function(index, childNode){
            var attributes = {};
            for(var i = 0; i < childNode.attributes.length; i++) {
              if(childNode.attributes[i].nodeName.indexOf('data-')!==-1) {
                attributes[childNode.attributes[i].nodeName] = childNode.attributes[i].nodeValue;
              }
            }
            optionArray.push({
              value: childNode.value,
              text: childNode.text,
              attributes: attributes
            });
          });
          return optionArray;
        }

        function buildSelector() {
          // build new selector. if previous select exists. remove previous data and DOM
          if (!element.hasClass('mobile-device')) {
            var oldSelectPicker = $(element).data('selectpicker');
            if(oldSelectPicker) {
              oldSelectPicker.$menu.parent().remove();
              oldSelectPicker.$newElement.remove();
              $(element).removeData('selectpicker');
            }
          }

          $(element).selectpicker();

          if(!!valuesFn && !track) {
            setValue(ngCtrl.$modelValue);
          }
          else {
            $(element).val(ngCtrl.$modelValue).selectpicker('render');
          }

        }

      }
    };
  }]);