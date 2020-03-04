function InsertAutoField( autoField )
{
	edit = OptFocusItem;
	if ( edit == undefined || ( edit.Name != 'Subject' && edit.Name != 'Text' && edit.Name != 'FileName' ) )
		edit = Screen.FindOptItem( 'Text' );

	if ( edit != undefined )
	{
		edit.InsertText( '[[' + autoField.value + ']]' );
	}
	else if ( ( hyper = ActiveScreen.FindOptItemByType( 'HYPER' ) ) != undefined )
	{
		SetClipboard( '[[' + autoField.value + ']]' );
		hyper.ExecCommand( 2501 );
	}
	else if ( ( item = ActiveScreen.FindOptItem( 'CodeEdit' ) ) != undefined )
	{
		SetClipboard( '[[' + autoField.value + ']]' );
		Screen.RunCommand( 'Paste' );
	}

	this.Doc.SetChanged( true );
}


function SyncTexts()
{
	if ( this.use_html_text )
	{
		if ( this.html_text.HasValue )
			this.text = HtmlToPlainText( this.html_text );
		else if ( this.text.HasValue )
			this.html_text = HtmlEncodeDoc( AdjustCodeFragments( this.text ) );
	}
	else
	{
		if ( this.html_text.HasValue )
			this.text = HtmlToPlainText( this.html_text );
	}
}


function AdjustCodeFragments( str )
{
	str = StrReplace( str, '<%=', '[[' );
	str = StrReplace( str, '%>', ']]' );
	return str;
}


function HandleImportHtmlTextFromFile()
{
	srcUrl = Screen.AskFileOpen( '', 'HTML' + ' (.htm,.html)\t*.htm;*.html' );

	htmlStr = LoadUrlData( srcUrl );

	resources = lib_html.allocate_resource_list();
	
	htmlStr = lib_html.bind_external_resources( htmlStr, srcUrl, resources );
	htmlStr = lib_html.make_compound_html( htmlStr, resources );
	htmlStr = lib_html.build_full_html( htmlStr );

	this.html_text = htmlStr;

	this.html_edit_context.selector = 'preview';
}


