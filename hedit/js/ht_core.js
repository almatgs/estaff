"use strict";

var		gHt = new Object;


function HtInit()
{
	gHt.engine = '';
	HtInitCore();
}


function HtInitTinyMCA()
{
	var		config;

	gHt.engine = 'TinyMCA';
	HtInitCore();

	config = new Object;
	config.selector = '#editor1',
	//config.inline = true;
	config.plugins = 'autoresize,spellchecker';
	config.width = '100%';
	config.height = '100%';
	//config.theme = 'advanced';
	//config.theme_advanced_toolbar_location = "top";

	config.spellchecker_callback = HtSpellChekcerCallbackTinyMCA;

	//config.spellchecker_languages = "Russian=ru,Ukrainian=uk,English=en";
	//config.spellchecker_language = "ru"; // default language
	//config.spellchecker_rpc_url - "http://speller.yandex.net/services/tinyspell";


	//config.setup = function(ed) {
          //ed.onChange.add( HtOnChangeTinyMCA );
          //ed.onChange = HtOnChangeTinyMCA;
		  //ed.on('change', HtOnChangeTinyMCA );
	//};
	
	tinymce.init( config );
}


function HtInitCKEditor()
{
	gHt.engine = 'CKEditor';
	HtInitCore();

	var			editor;

	//CKEDITOR.replace( 'editor1' );
	editor = CKEDITOR.inline( 'editor1' );

	editor.on( 'change', HtOnChangeCKEditor );
}


function HtInitCore()
{
	gHt.contentNode = HtGetContentNode();
	gHt.origText = HtGetContentNode().innerHTML;
	//DebugMsg( gHt.origText );
	gHt.isModified = false;
}


function HtSetOuterListener( listener )
{
	gHt.outerListener = listener;
}


function HtGetContentNode()
{
	return document.getElementById( 'editor1' );
}


function HtIsModified()
{
	if ( gHt.isModified )
		return true;
	//if ( gHt.engine == 'TinyMCA' )
		//return gHt.isModified;
	
	gHt.newText = HtGetText();

	//alert( gHt.origText );
	//alert( gHt.newText );

	//DebugMsg( HtTrimTextSpaces( gHt.newText ) + '\r\n' + HtTrimTextSpaces( gHt.origText ) );
	return ( HtTrimTextSpaces( gHt.newText ) != HtTrimTextSpaces( gHt.origText ) );
}


function HtExtractText()
{
	var			text;

	if ( gHt.newText != undefined )
		text = gHt.newText;
	else
		text = HtGetText();
	
	gHt.origText = text;
	gHt.newText = undefined;
	gHt.isModified = false;

	return text;
}


function HtGetText()
{
	if ( gHt.engine == '' )
		return HtGetContentNode().innerHTML;
	else if ( gHt.engine == 'TinyMCA' )
		return tinyMCE.activeEditor.getContent();
	else if ( gHt.engine == 'CKEditor' )
		return CKEDITOR.instances.editor1.getData();
}


function HtTrimTextSpaces( htmlStr )
{
	//htmlStr = htmlStr.replace( /\s+/g, " " );
	htmlStr = BmStrReplaceAll( htmlStr, "\r", "" );
	htmlStr = BmStrReplaceAll( htmlStr, "\n", "" );
	//htmlStr = BmStrReplaceAll( htmlStr, ">&nbsp;<", "" );
	return htmlStr;
}

		  
function HtOnChangeTinyMCA( ed, l )
{
     //DebugMsg(11);
	 gHt.isModified = true;
};


function HtOnChangeCKEditor( event )
{
     //DebugMsg(11);
	 gHt.isModified = true;
};


function HtSpellChekcerCallbackTinyMCA( method, text, success, failure )
{
	if ( method != "spellcheck" )
		return;

	var		words = text.match(this.getWordCharPattern());
	var		suggestions = {};
	var		i;
	var		argsObj = {};
	var		resultObj;
	var		entry;

	argsObj.words = words;

	resultObj = HtCallOuterMethod( 'OnSpellCheck', argsObj );

	for ( i = 0; i < resultObj.entries.length; i++ )
	{
		entry = resultObj.entries[i];
		suggestions[entry.word] = entry.suggestions;
	}

	success( suggestions );
}


function HtCallOuterMethod( methodName, argsObj )
{
	var			resultObjStr;

	resultObjStr = gHt.outerListener.OnInnerCall( methodName, JSON.stringify( argsObj ) );
	if ( resultObjStr != undefined )
		return JSON.parse( resultObjStr );
	else
		return undefined;
}


function HtOnOuterCall( methodName, argsObjectStr )
{
	var			func;
	var			resultObj;

	try
	{
		func = window['Ht' + methodName];
		if ( func == undefined )
			throw 'Unknown inner method: ' + methodName;
		
		resultObj = func.apply( undefined, argsObjectStr != undefined ? [JSON.parse( argsObjectStr )] : [] );
	}
	catch ( e )
	{
		return JSON.stringify( {innerError:BmGetErrorDesc( e )} );

		//alert( BmGetErrorDesc( e ) );
		//throw e;
		//return undefined;
	}

	return ( resultObj != undefined ? JSON.stringify( resultObj ) : undefined );
}




function HtGetWordEntries()
{
	HtBuildWordEntries();
	return {wordEntries:gHt.wordEntries};
}


function HtBuildWordEntries()
{
	gHt.wordEntries = new Array;
	HtBuildWordEntriesFromNode( HtGetContentNode() );
}


function HtBuildWordEntriesFromNode( node )
{
	if ( node.nodeType == 1 )
	{
		var		i;

		for ( i = 0; i < node.childNodes.length; i++ )
			HtBuildWordEntriesFromNode( node.childNodes[i] );
	}
	else if ( node.nodeType == 3 )
	{
		HtBuildWordEntriesFromTextNode( node );
	}
}


function HtBuildWordEntriesFromTextNode( node )
{
	var			text;
	var			pos, curWordStartPos;
	var			entry;

	text = node.nodeValue;

	for ( pos = 0; ; pos++ )
	{
		if ( pos >= text.length || HtIsWordDelim( text.charAt( pos ) ) )
		{
			if ( curWordStartPos != undefined )
			{
				entry = new Object;
				gHt.wordEntries.push( entry );

				entry.id = gHt.wordEntries.length;
				entry.word = text.slice( curWordStartPos, pos );
				entry.node = node;
				entry.startPos = curWordStartPos;
			
				curWordStartPos = undefined;
			}
		}
		else
		{
			if ( curWordStartPos == undefined )
			{
				curWordStartPos = pos;
			}
		}

		if ( pos >= text.length )
			break;
	}
}

function HtHiliteWordEntry( wordEntry )
{
	var		storedWordEntry;

	storedWordEntry = ArrayOptFindByKey( gHt.wordEntries, wordEntry.id, 'id' );
	if ( storedWordEntry == undefined )
		BmDebug( "storedWordEntry == undefined" );

	HtSelectWord( storedWordEntry.node, storedWordEntry.startPos, storedWordEntry.word.length );
}


function HtReplaceWordEntry( argsObj )
{
	var		storedWordEntry;
	var		shift;
	var		i;
	var		nextWordEntry;

	storedWordEntry = ArrayOptFindByKey( gHt.wordEntries, argsObj.wordEntry.id, 'id' );
	if ( storedWordEntry == undefined )
		DebugMsg( "storedWordEntry == undefined" );

	shift = argsObj.newWord.length - storedWordEntry.word.length;
	storedWordEntry.node.nodeValue = storedWordEntry.node.nodeValue.slice( 0, storedWordEntry.startPos ) + argsObj.newWord + storedWordEntry.node.nodeValue.slice( storedWordEntry.startPos + storedWordEntry.word.length );
	
	storedWordEntry.word = argsObj.newWord;
	HtSelectWord( storedWordEntry.node, storedWordEntry.startPos, storedWordEntry.word.length );

	if ( shift != 0 )
	{
		for ( i = storedWordEntry.id; i < gHt.wordEntries.length; i++ )
		{
			nextWordEntry = gHt.wordEntries[i];
			if ( nextWordEntry.node != storedWordEntry.node )
				break;

			nextWordEntry.startPos += shift;
		}
	}
}


function HtSelectWord( textNode, startPos, wordLen )
{
	var		selection;
	var		range;

	selection = window.getSelection();
	range = document.createRange();
	range.setStart( textNode, startPos );
	range.setEnd( textNode, startPos + wordLen );
	selection.removeAllRanges();
	selection.addRange(range);
}


function HtIsWordDelim( c )
{
	if ( c.charCodeAt( 0 ) <= 47 )
		return true;

	switch ( c )
	{
		case ',':
		case ';':
		case '<':
		case '=':
		case '>':
		case '?':
		case '\\':
		case '[':
		case ']':
		case '|':
		case '{':
		case '}':
		case kBmNonBreakingSpace:
			return true;
	}

	return false;
}





function BmStrReplaceAll( str, origSubStr, newSubStr )
{
	return str.split( origSubStr ).join( newSubStr );
}


function ArrayOptFindByKey( array, keyVal, keyName )
{
	var		i;
	var		elem;
	
	for ( i = 0; i < array.length; i++ )
	{
		elem = array[i];
		if ( elem[keyName] === keyVal )
			return elem;
	}

	return undefined;
}


function DebugMsg( str )
{
	alert( str );
	return str;
}


function BmGetErrorDesc( err )
{
	var		str;

	if ( err.GetDesc != undefined )
		return err.GetDesc();

	if ( ! BmIsObject( err ) )
		return err.toString();

	str = err.toString();

	if ( err.fileName != undefined )
	{
		str += "\r\n";
		str += err.fileName;
		str += ",  line " + err.lineNumber;
	}
	else if ( err.stack != undefined )
	{
		//str += "\r\n";
		str += err.stack;
	}

	return str;
}


function BmIsObject( val )
{
    return ( typeof( val ) == "object" && val !== null );
}


function BmEncodeHtml( textStr )
{
	textStr = textStr.replace( /&/g, "&amp;" );
	textStr = textStr.replace( /</g, "&lt;" );
	textStr = textStr.replace( />/g, "&gt;" );

	textStr = textStr.replace( /\r/g, "" );
	textStr = textStr.replace( /\n/g, "<br/>" );

	return textStr;
};


var		kBmNonBreakingSpace = String.fromCharCode(160);