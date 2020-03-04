function DefaultMethod( webBrowser )
{
	//alert( webBrowser.Document.body.outerHtml );
	
	htmlStr = '' + webBrowser.Document.selection.createRange().htmlText;
	if ( htmlStr == '' )
	{
		alert( AppUiLangID == 'ru' ? 'Текст резюме не выделен' : 'CV text is not selected' );
		return;
	}

	fullHtmlStr = '<html x-source-url="' + webBrowser.LocationURL + '">\r\n';
	if ( AppLanguage == 'russian' )
		fullHtmlStr += '<meta http-equiv=\"content-type\" content=\"text/html; charset=windows-1251\"/>\r\n';

	fullHtmlStr += '<body>';
	fullHtmlStr += htmlStr;
	fullHtmlStr += '</body>';
	fullHtmlStr += '</html>';

	//alert( fullHtmlStr );


	tempFile = ObtainTempFile( '.htm' );
	PutUrlData( tempFile, fullHtmlStr );

	appDir = AppDirectoryPath();
	appPath = FilePath( appDir, 'SpXml.exe' );

	execParam = '/E "lib_recruit.import_web_plugin_selection( \'' + tempFile + '\' ) "';
	
	ShellExecute( "open", appPath, execParam );
}


