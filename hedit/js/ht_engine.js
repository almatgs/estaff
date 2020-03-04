function HtApplySelectionStyle( styleInfo )
{
	var		selection;
	var		range;
	var		startSpecifier, endSpecifier;
	var		startRangePos, endRangePos;

	if ( ! document.hasFocus() )
		return;

	selection = window.getSelection();
	range = selection.getRangeAt( 0 );

	startSpecifier = RangePosToPosSpecifier( range.startContainer, range.startOffset );
	endSpecifier = RangePosToPosSpecifier( range.endContainer, range.endOffset );

	switch ( styleInfo.nodeName )
	{
		case 'p':
		case 'h1':
		case 'h2':
		case 'h3':
			ApplyBlockNodeName( startSpecifier, endSpecifier, styleInfo.nodeName );
			break;

		case 'ol':
			document.execCommand( 'insertOrderedList' );
			return;

		case 'ul':
			document.execCommand( 'insertUnorderedList' );
			return;

		case 'b':
			if ( range.collapsed )
				return;

			document.execCommand( 'bold' );
			return;
			//ApplySpanNodeName( startSpecifier, endSpecifier, styleInfo.nodeName, styleInfo.isToggle );
			break;

		case 'i':
			document.execCommand( 'italic' );
			return;

		case 'u':
			document.execCommand( 'underline' );
			return;

		case undefined:
			switch ( styleInfo.textAlign )
			{
				case 'left':
					document.execCommand( 'justifyLeft' );
					return;

				case 'center':
					document.execCommand( 'justifyCenter' );
					return;

				case 'right':
					document.execCommand( 'justifyRight' );
					return;
			}

		default:
			throw 'Invalid node name';
	}

	startRangePos = PosSpecifierToRangePos( startSpecifier );
	endRangePos = PosSpecifierToRangePos( endSpecifier );

	range.setStart( startRangePos.node, startRangePos.offset );
	range.setEnd( endRangePos.node, endRangePos.offset );
	//range.select();
	selection.removeAllRanges();
	selection.addRange(range);
}


function HtInsertHyperlink( argsObj )
{
	if ( ! window.getSelection().getRangeAt( 0 ).collapsed )
	{
		document.execCommand( 'createLink', false, argsObj.url );
		return;
	}

	var			node, textNode;

	node = document.createElement( 'a' );
	node.href = argsObj.url;

	textNode = document.createTextNode( argsObj.text != undefined ? argsObj.text : argsObj.url );
	node.appendChild( textNode );

	InsertNodeAtSelection( node );
	//document.execCommand( 'insertHTML', false, htmlStr );

	/*var			selection, range;
	
	selection = window.getSelection();
	range = selection.getRangeAt( 0 );
	selection.removeAllRanges();
	selection.addRange(range);
	//window.getSelection().getRangeAt( 0 ).pasteHTML( htmlStr );
	range.pasteHTML( htmlStr );*/
}


function ApplyBlockNodeName( startSpecifier, endSpecifier, nodeName )
{
	var		startNode, endNode, node, newNode, newStartNode, newEndNode;

	startNode = GetUpperBlockNode( startSpecifier.GetNode() );
	if ( startNode == undefined )
	{
		node = GetNextNearestNonEmptyNode( startSpecifier.GetNode() );
		startNode = GetUpperBlockNode( node );
	}

	if ( endSpecifier.textPos == undefined && endSpecifier.baseNode == gHt.contentNode && endSpecifier.indexChain.length == 1 && endSpecifier.indexChain[0] != 0 && GetNodeDisplayType( endSpecifier.GetNode() ) == 'block' )
		endSpecifier.indexChain[0]--;
	endNode = GetUpperBlockNode( endSpecifier.GetNode() );
	if ( endNode == undefined )
	{
		node = GetPrevNearestNonEmptyNode( endSpecifier.GetNode() );
		endNode = GetUpperBlockNode( node );
	}

	if ( startNode == undefined )
	{
		//throw ( 'startNode == undefined' );
		return;
	}

	if ( endNode == undefined )
		throw ( 'endNode == undefined' );

	if ( startNode.parentNode == endNode.parentNode )
	{
		for ( node = startNode; node; node = newNode.nextSibling )
		{
			newNode = ChangeNodeName( node, nodeName );
			if ( node == startNode )
			{
				newStartNode = newNode;
				startSpecifier.UpdateAfterNodeReplace( node, newNode );
			}

			if ( node == endNode )
			{
				newEndNode = newNode;
				endSpecifier.UpdateAfterNodeReplace( node, newNode );
				break;
			}
		}
	}
	else
	{
		throw 'startNode.parentNode != endNode.parentNode';
	}
}


function ApplySpanNodeName( startSpecifier, endSpecifier, nodeName, isToggle )
{
	var		startNode, endNode;

	startNode = startSpecifier.GetNode();
	endNode = endSpecifier.GetNode();

	if ( startNode == endNode && startNode.nodeType == 3 )
	{
		ApplySpanNodeNameToSimpleRange( startNode, startSpecifier, endSpecifier, nodeName, isToggle );
		return;
	}
}


function ApplySpanNodeNameToSimpleRange( textNode, startSpecifier, endSpecifier, nodeName, isToggle )
{
	var		node, newNode, newTextNode, newTextNode2, newStartNode, newEndNode;
	var		text;
	var		rangeLen;

	if ( startSpecifier.textPos == 0 && endSpecifier.textPos == textNode.nodeValue.length )
	{
		newNode = document.createElement( nodeName );
		textNode.parentNode.replaceChild( newNode, textNode );
		newNode.appendChild( textNode );
	}
	else
	{
		text = textNode.nodeValue;
		if ( text.charAt( endSpecifier.textPos - 1 ) == ' ' )
		{
			endSpecifier.textPos--;
			if ( startSpecifier.textPos == endSpecifier.textPos )
				return;
		}

		rangeLen = endSpecifier.textPos - startSpecifier.textPos;

		newNode = document.createElement( nodeName );
		textNode.parentNode.insertBefore( newNode, textNode.nextSibling );

		newTextNode = document.createTextNode( text.slice( startSpecifier.textPos, endSpecifier.textPos ) );
		newNode.appendChild( newTextNode );

		newTextNode2 = document.createTextNode( text.slice( endSpecifier.textPos ) );
		textNode.parentNode.insertBefore( newTextNode2, newNode.nextSibling );

		textNode.nodeValue = text.slice( 0, startSpecifier.textPos );

		startSpecifier.SetSimpleTextPos( newTextNode, 0 )
		endSpecifier.SetSimpleTextPos( newTextNode, rangeLen )
	}

}


function InsertNodeAtSelection( newNode )
{
	var		selection;
	var		range;

	selection = window.getSelection();
	range = selection.getRangeAt( 0 );

	if ( range.startContainer.nodeType == 1 )
		range.startContainer.parentNode.insertBefore( newNode, range.startContainer );
	else if ( range.startContainer.nodeType == 3 )
		InsertNodeIntoTextNode( newNode, range.startContainer, range.startOffset );
}


function InsertNodeIntoTextNode( newNode, textNode, textPos )
{
	var			text;
	var			newTextNode2;

	if ( textPos == 0 )
	{
		textNode.parentNode.insertBefore( newNode, textNode );
		return;
	}

	text = textNode.nodeValue;
	textNode.parentNode.insertBefore( newNode, textNode.nextSibling );

	if ( textPos >= text.length )
		return;

	newTextNode2 = document.createTextNode( text.slice( textPos ) );
	textNode.parentNode.insertBefore( newTextNode2, newNode.nextSibling );

	textNode.nodeValue = text.slice( 0, textPos );

	//startSpecifier.SetSimpleTextPos( newTextNode, 0 )
	//endSpecifier.SetSimpleTextPos( newTextNode, rangeLen )
}


function GetNextNearestNonEmptyNode( baseNode )
{
	return FindNextNearestNode( baseNode, IsNonEmptyNode );
}


function GetPrevNearestNonEmptyNode( baseNode )
{
	return FindPrevNearestNode( baseNode, IsNonEmptyNode );
}


function IsNonEmptyNode( node )
{
	if ( node.nodeType == Node.TEXT_NODE )
		return ( node.nodeValue.trim() != '' );
	
	return node.nodeName == 'IMG' || GetNodeDisplayType( node ) == 'block';
}




function HtPosSpecifier()
{
}


HtPosSpecifier.prototype.GetNode =
function HtPosSpecifier__GetNode()
{
	return ResolveIndexChain( this.baseNode, this.indexChain );
};


HtPosSpecifier.prototype.UpdateAfterNodeReplace =
function HtPosSpecifier__UpdateAfterNodeReplace( oldNode, newNode )
{
	var		ancestorsChain;

	if ( oldNode == newNode )
		return;

	if ( this.baseNode == oldNode )
	{
		this.baseNode = newNode;
	}
	else if ( ( ancestorsChain = GetNodeAncestorsChain( this.baseNode, oldNode ) ) != undefined )
	{
		this.ElevateBaseNode( ancestorsChain.length );
		this.baseNode = newNode;
	}
};


HtPosSpecifier.prototype.ElevateBaseNode =
function HtPosSpecifier__ElevateBaseNode( levelsNum )
{
	var		i;

	for ( i = 0; i < levelsNum; i++ )
	{
		this.indexChain.splice( 0, 0, GetNodeChildIndex( this.baseNode ) );
		this.baseNode = this.baseNode.parentNode;
	}
}


HtPosSpecifier.prototype.SetSimpleTextPos =
function HtPosSpecifier__SetSimpleTextPos( textNode, pos )
{
	this.baseNode = textNode;
	this.indexChain = [];
	this.textPos = pos;
}


function RangePosToPosSpecifier( node, offset )
{
	var			specifier;

	specifier = new HtPosSpecifier();

	if ( node.nodeType == 1 )
	{
		specifier.baseNode = node;
		specifier.indexChain = [offset];
	}
	else
	{
		specifier.baseNode = node;
		specifier.indexChain = [];
		specifier.textPos = offset;
	}

	return specifier;
}


function PosSpecifierToRangePos( specifier )
{
	var			rangePos;

	rangePos = new Object;

	if ( specifier.textPos != undefined )
	{
		rangePos.node = specifier.GetNode();
		rangePos.offset = specifier.textPos
	}
	else
	{
		rangePos.node = ResolveIndexChain( specifier.baseNode, specifier.indexChain.slice( 0, specifier.indexChain.length - 1 ) );
		rangePos.offset = specifier.indexChain[specifier.indexChain.length - 1];
	}

	return rangePos;
}


function GetUpperBlockNode( node )
{
	var			curNode;

	curNode = node;
	
	while ( curNode )
	{
		if ( curNode == gHt.contentNode )
			return undefined;

		if ( GetNodeDisplayType( curNode ) == 'block' )
			return curNode;

		curNode = curNode.parentNode;
		if ( curNode == undefined )
			break;
	}

	return undefined;
}


function IsSubNode( node, baseNode )
{
	return ( GetNodeAncestorsChain( node, baseNode ) != undefined )
}


function GetNodeAncestorsChain( node, baseNode )
{
	var		ancestorsChain = new Array;
	var		curNode;

	for ( curNode = node.parentNode; curNode; curNode = curNode.parentNode )
	{
		ancestorsChain.push( curNode );
		if ( curNode == baseNode )
			return ancestorsChain;
	}

	return undefined;
}


function GetNodeOffsetChain( node, baseNode )
{
	var		offsetChain;
	var		curNode;

	offsetChain = new Array;

	for ( curNode = node; curNode != baseNode; curNode = curNode.parentNode )
	{
		if ( ! curNode )
			break;

		offsetChain.splice( 0, 0, GetNodeChildIndex( curNode ) );
	}

	return offsetChain;
}


function ResolveIndexChain( baseNode, offsetChain )
{
	var		i;
	var		curNode;

	curNode = baseNode;

	for ( i = 0; i < offsetChain.length; i++ )
	{
		curNode = curNode.childNodes[offsetChain[i]];
		if ( ! curNode )
			return undefined;
	}

	return curNode;
}


function GetNodeChildIndex( node )
{
	var i = 0;

	while( (node = node.previousSibling) != null ) 
		i++;
	
	return i;
}


function GetNodeDisplayType( node )
{
	var		style;

	if ( node.nodeType != 1 )
		return undefined;

	style = window.getComputedStyle( node, "" );
	return style.display;
}


function ChangeNodeName( node, nodeName, targetSpecifier )
{
	var			newNode;

	if ( node.nodeName.toLowerCase() == nodeName )
		return node;

	newNode = document.createElement( nodeName );
	newNode.innerHTML = node.innerHTML;

	node.parentNode.replaceChild( newNode, node );

	return newNode;
}


function FindNodeRec( node, func )
{
	if ( func( node ) )
		return node;

	var		subNode;

	for ( subNode = node.firstChild; ; subNode = subNode.nextSibling )
	{
		if ( subNode == undefined )
			break;

		if ( FindNodeRec( subNode, func ) )
			return subNode;
	}

	return undefined;
}


function FindNodeFromRightRec( node, func )
{
	if ( func( node ) )
		return node;

	var		subNode;

	for ( subNode = node.lastChild; subNode != undefined; subNode = subNode.previousSibling )
	{
		if ( FindNodeFromRightRec( subNode, func ) )
			return subNode;
	}

	return undefined;
}


function FindNextNearestNode( node, func )
{
	if ( func( node ) )
		return node;

	var		subNode;

	for ( subNode = node; subNode != undefined; subNode = subNode.nextSibling )
	{
		if ( FindNodeRec( subNode, func ) )
			return subNode;
	}

	return undefined;
}


function FindPrevNearestNode( node, func )
{
	if ( func( node ) )
		return node;

	var		subNode;

	for ( subNode = node.previousSibling; subNode != undefined; subNode = subNode.previousSibling )
	{
		if ( FindNodeFromRightRec( subNode, func ) )
			return subNode;
	}

	return undefined;
}
