(function($) {
	"use strict"

	$.fn.Intellisense = function(options) {

		var DEFAULTS = {
			'suggestData': [''],
			'separators': ['-'],
			'maxHits': -1,
			'listWidth': 0,
			'textAreaWidth': 'fill',
			'debug': false
		}

		var KEYBOARD = {
			'ENTER': 13,
			'ARROW_UP': 38,
			'ARROW_DOWN': 40,
			'LEFT_ARROW': 37,
			'RIGHT_ARROW': 39,
			'ESCAPE': 27,
			'SPACEBAR': 32,
			'BACKSPACE': 8,
			'DELETE': 46,
			'MINUS': 189,
			'EQUALS': 187,
			//Errr
			'STAR': 106,
			'PLUS': 187,
			//Errr
			'DOT': 190,
			'FW_SLASH': 191
		}

		String.prototype.lastchar = function() {
			return this.split("").reverse()[0];
		}

		function Intellisense($me) {
			var AS = $.extend(DEFAULTS, options);

			if(AS.debug) console.log({
				'AS': AS,
				'this': this
			});


			//Sort the data alphabetically and remove duplicates
			/*AS.suggestData = (function (data){
			

				 //Keep only unique values, assume incomming array is sorted
				 var unique = function( a ) 
				    	{
				    	    	var b = []
				    	    	
				    	    	//For all elements               
				    	    	for(var i = 0; i < a.length; i++) //Either this and that is equal, or push it on to b (they were different)
				    	    	    (a[ i ] == a[ i+1 ]) || b.push( a[i] )
				    	    	    
						return b
				    	};
				    	
			    	data = unique(data.sort())
			    
				if(AS.debug) console.log( data )
			    
				return data
			    
			})(AS.suggestData)*/



			// Set up the current element
			var setUp = function($me) {
					$me.addClass("autosuggest");

					AS.textAreaWidth = AS.textAreaWidth == 'fill' ? $me.width() : AS.textAreaWidth;

					var $editableDiv = $('<div class="autosuggest-text-area" contenteditable="true"></div>').width(AS.textAreaWidth);
					var $suggestDiv = $('<div class="autosuggest-suggestions-wrapper"></div>');

					var $suggestions = $('<ul class="autosuggest-suggestions"></ul>').width(AS.listWidth > 0 ? AS.listWidth : AS.textAreaWidth);

					$suggestDiv.html($suggestions);

					$me.html($editableDiv);
					$me.append($suggestDiv);



					AS.$me = $me;
					AS.$editableDiv = $editableDiv;
					AS.$suggestDiv = $suggestDiv;
					AS.$suggestions = $suggestions;

					hideSuggestions();

					bindEvents();

					setDirection();

					hideSuggestions();
				}



			var bindEvents = function() {
					AS.$editableDiv.on('focus click', focus);

					AS.$editableDiv.on('keyup keydown', keyboardEventHandler);

					AS.$editableDiv.on('blur', blur);

					AS.$suggestDiv.on('mouseenter mouseover', suggestionsMouseEnter);

					AS.$suggestDiv.on('mouseleave', suggestionsMouseLeave);

					$(window).resize(resizeEventHandler);
				}


			var resizeEventHandler = function() {
					setDirection();

				}



			var setDirection = function(direction) {


					var heightAbove = AS.$editableDiv.offset().top;

					var heightBelow = $(window).height() - AS.$editableDiv.offset().top - AS.$editableDiv.height();

					if(direction == undefined) {

						if((getSuggestiondivsHeight() > heightBelow) && (heightAbove > heightBelow)) {

							direction = 'up';
						} else {
							direction = 'down';
						}

					}



					//Either up down, down is default
					AS.direction = direction == 'up' ? 'up' : 'down';


					if(AS.suggestionsVisible) updateSuggestions();

				}



			var focus = function() {
					updateSuggestions();
				}



			var blur = function() {
					//If not suggestionlist is hovered, hide
					if(!AS.SuggestionsMouseOver) hideSuggestions();

					verifyText();
				}


			var suggestionsMouseEnter = function() {
					AS._caretPos = getCurrentCaretPos();
					AS.SuggestionsMouseOver = true;
				}

			var suggestionsMouseLeave = function() {
					AS._caretPos = undefined;
					AS.SuggestionsMouseOver = false;
				}



			var hideSuggestions = function() {
					clearSelection();

					AS.suggestionsVisible = false;
					AS.$suggestDiv.hide();
				}



			var showSuggestions = function() {

					if(getNumberOfHits() == 1 && AS.$suggestions.find('li.suggestion').first().text() == getQueryText()) {
						hideSuggestions();
					} else {
						AS.suggestionsVisible = true;
						AS.$suggestDiv.show();
					}


				}



			var populateSuggestions = function(elements) {
					//Clear current list
					AS.$suggestions.html('');

					if(AS.direction == 'up') elements.reverse();

					//Insert new elements 
					for(var e in elements) AS.$suggestions.append(getSuggestionObject(elements[e]));

					if(getNumberOfHits() > 0) {
						showSuggestions();
					} else {
						hideSuggestions();
					}

					AS.$suggestions.height(getSuggestiondivsHeight());

					if(getNumberOfHits() == 1) setSelected(AS.$suggestions.find('li.suggestion').first());

				}



			var getVisibleHits = function() {
					return getNumberOfHits() <= 10 ? getNumberOfHits() : 10;
				}



			var getNumberOfHits = function() {
					return filterSuggestions(getQueryText()).length;
				}



			var getSuggestiondivsHeight = function() {
					var singleElementsHeight = getHeightOfSuggestionElement();
					var visibleHits = getVisibleHits();



					return singleElementsHeight * visibleHits;
				}



			var clearSelection = function() {
					AS.$suggestions.find('li.suggestion').removeClass('selected');
				}



			var getSuggestionObject = function(text) {
					var $s = $("<li class='suggestion'>" + text + "</li>");

					$s.click(function() {
						AS.caretPos = AS._caretPos;
						setSelected($(this));
						finishSelection();
					})



					return $s;
				}



			var keyboardEventHandler = function(e) {
					verifyText();

					switch(e.which) {
					case KEYBOARD.ENTER:
						finishSelection();
						e.preventDefault();

						break;

					case KEYBOARD.ESCAPE:
						hideSuggestions();
						break;

					case KEYBOARD.ARROW_UP:
						if(e.type == "keydown" && AS.suggestionsVisible) {
							e.preventDefault();
							selectPrevious();
						}

						break;

					case KEYBOARD.ARROW_DOWN:
						if(e.type == "keydown" && AS.suggestionsVisible) {
							e.preventDefault();
							selectNext();
						}

						break;


					default:
						updateSuggestions();

						break;
					}

				}



			var finishSelection = function() {
					if(!selectionIsEmpty()) {
						appendToken(getCurrentSelectedElement().text(), AS.caretPos ? AS.caretPos : getCurrentCaretPos());
					}

					updateSuggestions();
					hideSuggestions();

					AS.caretPos = AS._caretPos = undefined;

					AS.$editableDiv.focus();

				}



			var getQueryText = function() {
					return getTokenAtPos(getCurrentCaretPos());
				}



			var getTokenAtPos = function(pos) {
					var currentToken = getAllTokens()[getIndexOfTokenAtPos(pos)];

					return(currentToken) ? currentToken : "";

				}



			var getTokenAtIndex = function(i) {
					return getAllTokens()[i];
				}



			var getIndexOfTokenAtPos = function(pos) {
					var str = getText().substring(0, pos).match(getSeparatorsRegex());

					return(str) ? str.length : 0;
				}



			var getSeparatorsRegex = function() {
					var t = '[';

					for(var i in AS.separators) {
						t += escapeRegExp(AS.separators[i]);
					}

					t += ']';

					return new RegExp(t, "g");
				}



			var escapeRegExp = function(str) {
					return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
				}



			var getCurrentCaretPos = function() {
					var pos = getText().length;
					if(window.getSelection()) pos = window.getSelection().baseOffset;

					return pos;
				}



			var verifyText = function() {
					if(getAllTokens().length == AS.suggestData.length) {
						AS.$editableDiv.addClass("accepted");
					} else {
						AS.$editableDiv.removeClass("accepted");
					}

					//AS.$editableDiv.text( stripExcessSeparators( getText() ) )
				}



			var appendToken = function(text, pos) {
					var allTokens = getAllTokens(),
						indexOfToken = getIndexOfTokenAtPos(pos);

					allTokens[indexOfToken] = text;

					setText(tokensToString(allTokens), indexOfToken);

				}



			var getSuggestions = function() {

					return AS.suggestData[getIndexOfTokenAtPos(getCurrentCaretPos())];

				}



			var tokensToString = function(tokens) {
					var t = "";

					for(var i in tokens) {
						t += tokens[i] + AS.separators[0];
					}


					return stripExcessSeparators(t);
				}


				//TODO: Strip separators that are either first in the string og recurring more than once 
			var stripExcessSeparators = function(t) {
					var insertSeparatorAtEnd = getAllTokens().length <= AS.suggestData.length;
					var lastCharIsASeparator = t.lastchar().match(getSeparatorsRegex());

					if(!insertSeparatorAtEnd && lastCharIsASeparator) t = t.substring(0, t.length - 1);

					return t;
				}



			var getAllTokens = function() {
					return AS.$editableDiv.text().split(getSeparatorsRegex());
				}



			var setCaretPos = function(pos) {
					var el = AS.$editableDiv[0];
					var range = document.createRange();
					var sel = window.getSelection();
					range.setStart(el.childNodes[0], pos);
					range.collapse(true);
					sel.removeAllRanges();
					sel.addRange(range);
					el.focus();
				}



			var selectionIsEmpty = function() {
					return(getCurrentSelectedElement().size() == 0);
				}



			var selectNext = function() {

					var $itemToSelect = undefined;

					if(AS.direction == 'up') {
						$itemToSelect = selectionIsEmpty() ? AS.$suggestions.find('li.suggestion').last() : getCurrentSelectedElement().next();
					} else if(AS.direction == 'down') {
						$itemToSelect = selectionIsEmpty() ? AS.$suggestions.find('li.suggestion').first() : getCurrentSelectedElement().next();
					}

					if(!AS.suggestionsVisible) showSuggestions();

					setSelected($itemToSelect);
				}



			var selectPrevious = function() {
					var $itemToSelect = undefined;

					if(AS.direction == 'up') {
						$itemToSelect = selectionIsEmpty() ? AS.$suggestions.find('li.suggestion').last() : getCurrentSelectedElement().prev();
					} else if(AS.direction == 'down') {
						$itemToSelect = selectionIsEmpty() ? AS.$suggestions.find('li.suggestion').first() : getCurrentSelectedElement().prev();
					}


					if(!AS.suggestionsVisible) showSuggestions();

					setSelected($itemToSelect);

				}



			var getHeightOfSuggestionElement = function() {
					var $testElement = $('<div class="autosuggest"><div class="autosuggest-suggestions-wrapper"><ul class="autosuggest-suggestions"><li class="suggestion">item</li></ul></div></div>');

					$('body').append($testElement);

					var height = $testElement.find('.suggestion').outerHeight();

					$testElement.remove();

					return height;
				}



			var setSelected = function($item) {
					AS.$suggestions.find('li.suggestion').removeClass('selected');

					if(!$item) return;

					if($item.size() == 1) {
						$item.addClass('selected');
					} else if($item.size() == 0) {
						hideSuggestions();
					}


					scrollToElement($item);


				}


				//TODO: Check if element is outside viewable area
			var scrollToElement = function($item) {
					if($item) {
						var el = AS.$suggestions;
						var itemHeight = getHeightOfSuggestionElement();
						var currentIndex = $item.prevAll().size();
						var elHeight = getSuggestiondivsHeight();

						var visibleRange = {
							'minIndex': el.scrollTop() / itemHeight,
							'maxIndex': (el.scrollTop() + elHeight) / itemHeight - 1
						}

						if(currentIndex < visibleRange.minIndex) el.scrollTop(currentIndex * itemHeight);
						if(currentIndex > visibleRange.maxIndex) el.scrollTop((currentIndex + 1) * itemHeight - elHeight);


					}
				}


			var updateSuggestions = function() {
					populateSuggestions(filterSuggestions(getQueryText()));

					if(AS.direction == 'up') {
						AS.$me.addClass('up');
						AS.$suggestDiv.css('top', -getSuggestiondivsHeight() - 1);

						scrollToElement($(AS.$suggestions.find('li.suggestion').last()));
					} else {
						AS.$me.removeClass('up');
						AS.$suggestDiv.css('top', AS.$editableDiv.height());

						scrollToElement($(AS.$suggestions.find('li.suggestion').first()));
					}
				}



			var getCurrentSelectedElement = function() {
					return $(AS.$suggestions.find('li.suggestion.selected').first());
				}



			var getText = function() {
					return AS.$editableDiv.text();
				}



			var setText = function(text, indexOfTokenToPlaceCaretAfter) {
					AS.$editableDiv.text(text);

					if(indexOfTokenToPlaceCaretAfter != undefined) {

						var pos = 0;

						for(var i = 0; i <= indexOfTokenToPlaceCaretAfter; i++) pos += (getTokenAtIndex(i).length + 1);

						if(text.length < pos) pos = text.length;

						setCaretPos(pos);
					}


				}



			var filterSuggestions = function(q) {
					var suggestions = [];

					//If search is empty, return an empty array
					//if(q.length == 0) return suggestions
					var listOfSuggestions = getSuggestions();

					//Parse all elements in passed list of suggestion and keep only the ones satisfying the filter
					for(var s in listOfSuggestions) {
						var suggestionObject = listOfSuggestions[s],
							suggestionDisplayName = '';
						//Does the query string exist in the current suggestion?
						if(typeof suggestionObject == 'string') {
							suggestionDisplayName = suggestionObject;
						} else if(typeof suggestionObject == 'object') {
							suggestionDisplayName = suggestionObject[0];
						}


						if(suggestionDisplayName.toLowerCase().trim().indexOf(q.toLowerCase().trim()) >= 0 || q.length == 0) {
							//If so, add it to the pile of suggestions
							suggestions.push(suggestionDisplayName);
						}

						if(AS.maxHits > 0 && suggestions.length > AS.maxHits) return suggestions;
					}

					return suggestions;

				}



			setUp($me);
		}



		return $(this).each(function() {
			Intellisense($(this));
		});
	}
})(jQuery)