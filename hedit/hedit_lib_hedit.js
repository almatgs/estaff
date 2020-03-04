function InitEditorContext( field )
{
	context = field.Parent.html_edit_context;
	context.editor_engine = '';
	//context.editor_engine = 'TinyMCA';
	//context.editor_engine = 'CKEditor';

	options = new Object;
	//options.styleUrl = FilePathToUrl( UrlToFilePath( 'style_editor.css' ) );
			
	htmlStr = lib_hedit.BuildEditorHtml( field.Value, context, options );
			
	context.temp_dir = ObtainSessionTempFile();
	ObtainDirectory( context.temp_dir );

	context.temp_file_url = UrlAppendPath( context.temp_dir, '1.htm' );
	PutUrlData( context.temp_file_url, htmlStr );
	return context;
}


function BuildEditorHtml( htmlContentStr, context, options )
{
	if ( ! context.use_full_html && lib_html.is_full_html( htmlContentStr ) )
		htmlBodyStr = lib_html.extract_html_body( htmlContentStr );
	else
		htmlBodyStr = htmlContentStr;

	destStream = new BufStream;
	destStream.PrepareWriteSpace( StrLen( htmlBodyStr ) + 512 );

	destStream.WriteStr( '<!DOCTYPE html>\r\n' );
	destStream.WriteStr( '<html>\r\n' );
	destStream.WriteStr( '<head>\r\n' );
	destStream.WriteStr( '<meta http-equiv=\"content-type\" content=\"text/html; charset=' + AppCharset + '\"/>\r\n' );

	destStream.WriteStr( '<link rel="stylesheet" href="' + FilePathToUrl( UrlToFilePath( 'js/ht_style.css' ) ) + '"/>\r\n' );

	if ( context.editor_engine == 'TinyMCA' )
	{
		destStream.WriteStr( '<script src=\"' + FilePathToUrl( UrlToFilePath( 'x-app://ext_web/tinymce/js/tinymce/tinymce.min.js' ) ) + '"></script>\r\n' );
		//destStream.WriteStr( '<script src="http://localhost:7000/ext_web/tinymce/js/tinymce/tinymce.min.js"></script>\r\n' );
	}
	else if ( context.editor_engine == 'CKEditor' )
	{
		destStream.WriteStr( '<script src=\"' + FilePathToUrl( UrlToFilePath( 'x-app://ext_web/ckeditor/ckeditor.js' ) ) + '"></script>\r\n' );
		//destStream.WriteStr( '<script src="http://localhost:7000/ext_web/tinymce/js/tinymce/tinymce.min.js"></script>\r\n' );
	}

	destStream.WriteStr( '<script src="' + FilePathToUrl( UrlToFilePath( 'js/ht_core.js' ) ) + '"></script>\r\n' );
	destStream.WriteStr( '<script src="' + FilePathToUrl( UrlToFilePath( 'js/ht_engine.js' ) ) + '"></script>\r\n' );

	if ( context.base_url.HasValue )
		destStream.WriteStr( '<base href=\"' + context.base_url + '"/>\r\n' );

	destStream.WriteStr( '</head>\r\n' );

	//destStream.WriteStr( '<body contenteditable="true">\r\n' );
	destStream.WriteStr( '<body>\r\n' );

	if ( context.editor_engine == '' )
	{
		destStream.WriteStr( '<div id="editor1" contenteditable="true">' );
		destStream.WriteStr( htmlBodyStr );
		destStream.WriteStr( '</div>\r\n' );
	}
	else if ( context.editor_engine == 'TinyMCA' )
	{
		destStream.WriteStr( '<div id="editor1">' );
		//DebugMsg( htmlBodyStr );
		destStream.WriteStr( htmlBodyStr );
		destStream.WriteStr( '</div>\r\n' );
	}
	else if ( context.editor_engine == 'CKEditor' )
	{
		//destStream.WriteStr( '<textarea id="editor1">' );
		destStream.WriteStr( '<div id="editor1" contenteditable="true">' );
		destStream.WriteStr( htmlBodyStr );
		destStream.WriteStr( '</div>\r\n' );
		//destStream.WriteStr( '</textarea>\r\n' );
	}

	
	if ( context.editor_engine == '' )
	{
		destStream.WriteStr( '<script>HtInit()</script>\r\n' );
	}
	else if ( context.editor_engine == 'TinyMCA' )
	{
		destStream.WriteStr( '<script>HtInitTinyMCA()</script>\r\n' );
	}
	else if ( context.editor_engine == 'CKEditor' )
	{
		destStream.WriteStr( '<script>HtInitCKEditor()</script>\r\n' );
	}
	
	destStream.WriteStr( '</body></html>' );

	return destStream.DetachStr();
}


function OnEditorLoaded( hyper, context )
{
	hyper.OleObject.Document.Script.HtSetOuterListener( OleDispatch( this ) );
}


function IsEditorContentModified( hyper )
{
	return hyper.OleObject.Document.Script.HtIsModified( 'dummy' );
}


function ExtractEditorHtmlContent( hyper, context )
{
	//return Trim( hyper.OleObject.Document.body.innerHtml );
	htmlStr = hyper.OleObject.Document.Script.HtExtractText( 'dummy' );

	if ( context.use_full_html )
		htmlStr = lib_html.build_full_html( htmlStr );

	return htmlStr;
}


function OnBeforeSaveObjectCard( object )
{
	//hyper = object.Screen.FindOptItemByType( 'HYPER' );
	hyper = object.Screen.FindOptItem( 'HtmlEditHyper' );
	if ( hyper == undefined )
		return;

	if ( IsEditorContentModified( hyper ) )
	{
		hyper.Ps.Value = lib_hedit.ExtractEditorHtmlContent( hyper );
		//Ps.Doc.SetChanged( true );
	}
}





function HandleActiveEditorPasteContentOnly()
{
	hyper = ActiveScreen.FindOptItem( 'HtmlEditHyper' );
	if ( hyper == undefined )
		return;

	hyper.ExecCommand( 2500 );
}


function HandleActiveEditorPastePlainText()
{
	hyper = ActiveScreen.FindOptItem( 'HtmlEditHyper' );
	if ( hyper == undefined )
		return;

	hyper.ExecCommand( 2501 );
}



function ApplyActiveEditorSelectionStyle( styleInfo )
{
	hyper = ActiveScreen.FindOptItem( 'HtmlEditHyper' );
	if ( hyper == undefined )
		return;

	CallInnerMethod( hyper, 'ApplySelectionStyle', styleInfo );
}


function InsertActiveEditorHyperlink()
{
	hyper = ActiveScreen.FindOptItem( 'HtmlEditHyper' );
	if ( hyper == undefined )
		return;

	dlgDoc = OpenDoc( 'hedit_dlg_hyperlink.xml' );
	ActiveScreen.ModalDlg( dlgDoc );

	CallInnerMethod( hyper, 'InsertHyperlink', {url:dlgDoc.TopElem.url} );
}


function HiliteEditorWordEntry( hyper, wordEntry )
{
	CallInnerMethod( hyper, 'HiliteWordEntry', wordEntry );
}


function ReplaceEditorWordEntry( hyper, wordEntry, newWord )
{
	CallInnerMethod( hyper, 'ReplaceWordEntry', {wordEntry:wordEntry,newWord:newWord} );
}


function RunActiveEditorSpellCheck()
{
	hyper = ActiveScreen.FindOptItem( 'HtmlEditHyper' );
	if ( hyper == undefined )
		return;

	resultObj = CallInnerMethod( hyper, 'GetWordEntries' );

	lib_spellcheck.RunSpellCheck( hyper, resultObj.wordEntries );
}


function CallInnerMethod( hyper, methodName, argsObj )
{
	resultObjStr = CallObjectMethod( hyper.OleObject.Document.Script, 'HtOnOuterCall', [methodName, ( argsObj != undefined ? EncodeJson( argsObj ) : undefined ) ] );
	if ( resultObjStr == undefined )
		return undefined;

	resultObj = ParseJson( resultObjStr, {StrictMode:false} );
	if ( resultObj.innerError != undefined )
		throw UserError( resultObj.innerError );
	
	return resultObj;
}


function OnInnerCall( methodName, argsObjectStr )
{
	try
	{
		resultObj = CallObjectMethod( this, methodName, [ParseJson( argsObjectStr )] );
	}
	catch ( e )
	{
		alert( e );
		return undefined;
	}

	if ( resultObj == undefined )
		return undefined;

	return EncodeJson( resultObj );
}


