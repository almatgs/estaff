function OnCommand( actionID, webBrowser, selHtml )
{
	lib = OpenCodeLib( 'x-app://gate/gate_lib_gate.js' );
	config = lib.get_browser_plugin_config();
	action = config.actions[0];
	
	if ( true )
	{
		htmlStr = selHtml;
	}
	else
	{
		try
		{
			htmlStr = '' + webBrowser.document.selection.createRange().htmlText;
			isStrict = false;
		}
		catch ( e )
		{
			isStrict = true;
		}

		if ( isStrict )
		{
			sel = webBrowser.paretWindow.getSelection();
			if ( true || sel.rangeCount )
			{
				container = webBrowser.document.createElement( 'div' );
				len = sel.rangeCount;

				for ( i = 0, ; i < len; ++i )
					container.appendChild( sel.getRangeAt( i ).cloneContents() );
			}

			htmlStr = container.innerHTML;
		}
	}

	/*
	if ( htmlStr == '' )
	{
		alert( action.no_sel_error_text );
		return;
	}
	*/

	destDoc = OpenNewDoc( 'x-app://gate/gate_browser_plugin_action.xmd' );
	destDoc.TopElem.action_id = action.id;

	destDoc.TopElem.url = webBrowser.LocationURL;
	destDoc.TopElem.sel_html = htmlStr;
	
	if ( htmlStr == '' )
		destDoc.TopElem.html = webBrowser.Document.body.outerHtml;
	
	tempFileUrl = ObtainTempFile( '.xml' );
	destDoc.SaveToUrl( tempFileUrl );


	/*
	fullHtmlStr = '<html x-source-url="' + webBrowser.LocationURL + '">\r\n';
	if ( AppLanguage == 'russian' )
		fullHtmlStr += '<meta http-equiv=\"content-type\" content=\"text/html; charset=windows-1251\"/>\r\n';

	fullHtmlStr += '<body>';
	fullHtmlStr += htmlStr;
	fullHtmlStr += '</body>';
	fullHtmlStr += '</html>';

	//alert( fullHtmlStr );
	*/


	appDir = AppDirectoryPath();
	appPath = FilePath( appDir, 'SpXml.exe' );

	execParam = '/E "' + config.handler_method + '( \'' + tempFileUrl + '\' ) "';
	ShellExecute( "open", appPath, execParam );
}

