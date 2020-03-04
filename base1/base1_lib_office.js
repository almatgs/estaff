function init_active_app()
{
	try
	{
		local_settings;
	}
	catch ( e )
	{
		return;
	}

	if ( local_settings.active_office_app_id.HasValue )
		return;
	 
	if ( ! LdsIsClient )
	{
		local_settings.active_office_app_id = 'mso';
		return;
	}
		
	local_settings.active_office_app_id = detect_installed_app();
	if ( ! local_settings.active_office_app_id.HasValue )
		local_settings.active_office_app_id = 'mso';

	local_settings.Doc.Save();
}


function detect_installed_app()
{
	if ( SysRegKeyExists( 'HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Office\\Word' ) )
		return 'mso';

	if ( SysRegKeyExists( 'HKEY_LOCAL_MACHINE\\SOFTWARE\\OpenOffice.org' ) )
		return 'oo';

	return '';
}


function is_editor_file_suffix( suffix )
{
	return ( ArrayOptFind( active_editor_file_suffix_list, 'This == ' + CodeLiteral( StrLowerCase( suffix ) ) ) != undefined );
}


function active_editor_name()
{
	local_settings.active_office_app_id.ForeignElem.editor_name;
}


function active_editor_process_name()
{
	local_settings.active_office_app_id.ForeignElem.editor_process_name;
}


function active_calc_name()
{
	if ( !local_settings.active_office_app_id.HasValue )
		return GetForeignElem(base1_common.office_apps, 'mso').calc_name;

	return local_settings.active_office_app_id.ForeignElem.calc_name;
}


function active_editor_file_suffix_list()
{
	list = new Array;

	if ( local_settings.active_office_app_id == 'oo' )
	{
		list[list.length] = '.odt';
		list[list.length] = '.sxw';
	}

	list[list.length] = '.doc';
	list[list.length] = '.docx';
	list[list.length] = '.rtf';

	return list;
}


function active_editor_document_ui_name()
{
	if ( System.IsWebClient )
		return UiText.titles.msword_documents;

	if ( local_settings.active_office_app_id == 'mso' )
		return UiText.titles.msword_documents;
	else if ( local_settings.active_office_app_id == 'oo' )
		return UiText.titles.oo_editor_documents;
	else
		throw 'Unknown office app';
}


function active_editor_file_suffix_pattern()
{
	mask = ArrayMerge( lib_office.active_editor_file_suffix_list, '\'*\' + This', ';' );
	return active_editor_document_ui_name + ' (' + mask + ')\t' + mask + '\t' + UiText.titles.all_files + ' (*.*)\t*.*'
}


function msword_file_suffix_pattern()
{
	UiText.titles.msword_documents + ' (*.doc;*docx;*rtf)\t*.doc;*.docx;*rtf\t' + UiText.titles.all_files + ' (*.*)\t*.*'
}


function msexcel_file_suffix_pattern()
{
	UiText.titles.msexcel_documents + ' (*.xls;*xlsx)\t*.xls;*xlsx\t' + UiText.titles.all_files + ' (*.*)\t*.*'
}


function doc_file_to_html( docUrl, extFileList )
{
	if ( local_settings.active_office_app_id == 'mso' )
		htmlStr = mso_doc_file_to_html( docUrl, extFileList );
	else if ( local_settings.active_office_app_id == 'oo' )
		htmlStr = oo_doc_file_to_html( docUrl, extFileList );
	else
		throw 'Unknown office app';

	return lib_html.adjust_unicode_html( htmlStr );
}


function mso_doc_file_to_html( docUrl, extFileList )
{
	app = start_msword_app();
	app.DisplayAlerts = false;

	if ( StrBegins( app.version, '8.' ) )
		throw UserError( UiText.errors.mso_2000_required );

	//document = app.Documents.Open( UrlToFilePath( docUrl ) );
	document = app.Documents.Open( UrlToFilePath( docUrl ), false, true );


	tempDir = ObtainSessionTempFile();
	CreateDirectory( tempDir );

	tempFileUrl = UrlAppendPath( tempDir, '1.htm' );

	try
	{
		document.SaveAs( UrlToFilePath( tempFileUrl ), 8 );
	}
	catch ( e )
	{
		if ( ! FilePathExists( UrlToFilePath( tempFileUrl ) ) )
		{
			document.Close( 0 );
			document = undefined;
			app.Quit( 0 );
			DeleteDirectory( tempDir );

			throw e;
		}
	}

	document.Close( 0 );
	document = undefined;
	app.Quit( 0 );

	htmlStr = LoadUrlData( tempFileUrl );
	lib_html.load_resources_from_dir_rec( extFileList, UrlToFilePath( tempDir ), '', '1.htm' );

	DeleteDirectory( tempDir );

	return htmlStr;
}


function start_msword_app()
{
	try
	{
		app = new ActiveXObject( 'Word.Application' );
	}
	catch ( e )
	{
		throw UserError( UiText.errors.unable_to_start_msword, e );
	}

	if ( local_settings.use_office_editor_visible_mode )
		app.Visible = true;

	//Sleep( 500 );
	return app;
}


function start_excel_app()
{
	try
	{
		app = new ActiveXObject( 'Excel.Application' );
	}
	catch ( e )
	{
		throw UserError( UiText.errors.unable_to_start_excel );
	}

	return app;
}


function oo_doc_file_to_html( docUrl, extFileList )
{
	ns = new ActiveXObject( 'com.sun.star.ServiceManager' );
	desktop = ns.createInstance( 'com.sun.star.frame.Desktop' );
	//reflection = ns.createInstance( 'com.sun.star.reflection.CoreReflection' );

	//size = reflection.forName( 'com.sun.star.beans.NamedValue' );
	//prop = size.CreateObject();


	prop = ns.Bridge_GetStruct( 'com.sun.star.beans.PropertyValue' ); 
	prop.Name = 'Hidden';
	prop.Value = true;

	args = new Array();
	args[0] = prop;

	//doc = desktop.loadComponentFromURL( 'file:///C:/zzz.odt', '_blank', 0, args );
	
	doc = desktop.loadComponentFromURL( docUrl, '_blank', 0, args );


	tempDir = ObtainSessionTempFile();
	CreateDirectory( tempDir );

	tempFileUrl = UrlAppendPath( tempDir, '1.htm' );

	prop = ns.Bridge_GetStruct( 'com.sun.star.beans.PropertyValue' ); 
	prop.Name = 'MediaType';
	prop.Value = 'text/html';

	args = new Array();
	args[0] = prop;

	doc.storeToURL( tempFileUrl, args );
	doc.Close( true );


	htmlStr = LoadUrlData( tempFileUrl );
	lib_html.load_resources_from_dir_rec( extFileList, UrlToFilePath( tempDir ), '', '1.htm' );

	DeleteDirectory( tempDir );

	return htmlStr;

}


function build_native_doc( docUrl, srcText, srcContentType, templateUrl )
{
	if ( local_settings.active_office_app_id == 'oo' )
	{
		return BuildNativeOoDoc( docUrl, srcText, srcContentType );

		/*if ( srcContentType == 'text/html' )
		{
			if ( lib_html.is_compound_html( srcText ) )
			{
				//PutUrlData( docUrl, lib_html.compound_html_to_mht( srcText ) );
				PutUrlData( docUrl, lib_html.BindCompoundHtmlImages( srcText ) );
			}
			else
			{
				PutUrlData( docUrl, srcText );
			}
		}
		else
		{
			PutUrlData( docUrl, HtmlEncodeDoc( srcText ) );
		}

		return;*/
	}


	tempDir = ObtainSessionTempFile();
	CreateDirectory( tempDir );

	if ( srcContentType == 'text/html' )
	{
		srcText = lib_html.adjust_inline_images( srcText );
		//PutUrlData( 'zzzz.htm', srcText );

		if ( lib_html.is_compound_html( srcText ) )
		{
			tempFileUrl = UrlAppendPath( tempDir, '1.mht' );
			PutUrlData( tempFileUrl, lib_html.compound_html_to_mht( srcText ) );
		}
		else
		{
			tempFileUrl = UrlAppendPath( tempDir, '1.htm' );
			PutUrlData( tempFileUrl, lib_html.build_full_html( srcText ) );
		}
	}
	else
	{
		tempFileUrl = UrlAppendPath( tempDir, '1.doc' );
		PutUrlData( tempFileUrl, HtmlEncodeDoc( srcText ) );
	}


	app = start_msword_app();
	app.DisplayAlerts = false;

	if ( StrBegins( app.Version, '8.' ) )
		throw UserError( UiText.errors.mso_2000_required );

	isOffice2007orLater = ( app.Version >= '13.' );

	if ( templateUrl != '' )
	{
		document = app.Documents.Add( UrlToFilePath( templateUrl ) );
		app.Selection.EndKey( 6 );
	}
	else
	{
		document = app.Documents.Add();
	}

	try
	{
		app.Selection.InsertFile( UrlToFilePath( tempFileUrl ) );
	}
	catch ( e )
	{
		alert( e );
	}

	if ( isOffice2007orLater && StrEnds( docUrl, '.doc', true ) )
		document.SaveAs( UrlToFilePath( docUrl ), 0 );
	else
		document.SaveAs( UrlToFilePath( docUrl ) );

	document.Close( 0 );
	app.Quit( false );

	//DeleteDirectory( tempDir );
}


/*
    ActiveDocument.SaveAs2 FileName:="Doc1.doc", FileFormat:=wdFormatDocument, _
         LockComments:=False, Password:="", AddToRecentFiles:=True, WritePassword _
        :="", ReadOnlyRecommended:=False, EmbedTrueTypeFonts:=False, _
        SaveNativePictureFormat:=False, SaveFormsData:=False, SaveAsAOCELetter:= _
        False, CompatibilityMode:=0
*/


function BuildNativeOoDoc( docUrl, srcText, srcContentType )
{
	tempDir = ObtainSessionTempFile();
	CreateDirectory( tempDir );

	if ( srcContentType == 'text/html' )
	{
		//tempFileUrl = UrlAppendPath( tempDir, '1' + UrlPathSuffix( docUrl ) );
		tempFileUrl = UrlAppendPath( tempDir, '1.htm' );
		if ( lib_html.is_compound_html( srcText ) )
		{
			PutUrlData( tempFileUrl, lib_html.BindCompoundHtmlImages( srcText ) );
		}
		else
		{
			PutUrlData( tempFileUrl, lib_html.build_full_html( srcText ) );
		}
	}
	else
	{
		tempFileUrl = UrlAppendPath( tempDir, '1.htm' );
		PutUrlData( tempFileUrl, HtmlEncodeDoc( srcText ) );
	}

	ns = new ActiveXObject( 'com.sun.star.ServiceManager' );
	desktop = ns.createInstance( 'com.sun.star.frame.Desktop' );
	//dispatcher = ns.createInstance("com.sun.star.frame.DispatchHelper");

	prop = ns.Bridge_GetStruct( 'com.sun.star.beans.PropertyValue' ); 
	prop.Name = 'Hidden';
	prop.Value = true;

	args = new Array();
	args[0] = prop;

	doc = desktop.loadComponentFromURL( 'private:factory/swriter', '_blank', 0, args );
	//doc = desktop.loadComponentFromURL( tempFileUrl, '_blank', 0, args );

	textObject = doc.getText();
	cursor = textObject.createTextCursor();

	args = new Array();

	cursor.insertDocumentFromURL( tempFileUrl, args );

	/*
	args = new Array();

	prop = ns.Bridge_GetStruct( 'com.sun.star.beans.PropertyValue' ); 
	prop.Name = 'Name';
	prop.Value = tempFileUrl;
	args[0] = prop;

	prop = ns.Bridge_GetStruct( 'com.sun.star.beans.PropertyValue' ); 
	prop.Name = 'Filter';
	prop.Value = 'HTML (StarWriter)';
	args[1] = prop;

	dispatcher.executeDispatch( doc, ".uno:InsertDoc", "", 0, args);
	*/

	args = new Array();

	prop = ns.Bridge_GetStruct( 'com.sun.star.beans.PropertyValue' ); 
	prop.Name = 'MediaType';
	prop.Value = UrlStdContentType( docUrl );
	//DebugMsg( prop.Value + ' ' + docUrl );
	args[0] = prop;

	doc.storeToURL( docUrl, args );
	doc.Close( true );
}


function show_screen_in_calc( screen )
{
	list = screen.FindOptItemByType( 'LIST' );
	if ( list == undefined )
		list = screen.FindOptItemByType( 'GRID' );
	if ( list == undefined )
		return;

	show_report_in_calc( BuildFullReport( list.MakeReport() ) );
}


function show_report_in_calc( reportStr )
{
	tempFile = ObtainSessionTempFile( '.xls' );
	PutUrlData( tempFile, ReportToHtml( reportStr ) );

	ShellExecute( 'open', tempFile );
}


function show_report_in_calc_template( reportStr, templateFilePath, baseRange )
{
	tempFile = ObtainSessionTempFile( '.htm' );
	PutUrlData( tempFile, ReportToHtml( reportStr ) );

	app = start_excel_app();
	app.Visible = true;

	workbook = app.Workbooks.Add( templateFilePath );
	sheet = workbook.ActiveSheet;

	if ( baseRange == '' )
		baseRange = 'A2';

	qt = sheet.QueryTables.Add( 'FINDER;' + tempFile, app.Range( baseRange ) );
	qt.AdjustColumnWidth = false;
	qt.Refresh();
}


function execute_mso_doc_code_page( srcDocUrl, envObject, destDocUrl )
{
	app = start_msword_app();
	//app.Visible = true;
	app.DisplayAlerts = false;

	isOffice2007orLater = ( app.Version >= '13.' );

	document = app.Documents.Add( UrlToFilePath( srcDocUrl ) );

	eval_mso_doc_code_page( app, document, envObject );

	if ( isOffice2007orLater && StrEnds( destDocUrl, '.doc', true ) )
		document.SaveAs( UrlToFilePath( destDocUrl ), 0 );
	else
		document.SaveAs( UrlToFilePath( destDocUrl ) );

	document.Close( 0 );
	app.Quit( false );
}


function eval_mso_doc_code_page( app, document, envObject )
{
	selectionObject = app.Selection;
	findObject = selectionObject.Find;

	count = 0;

	while ( true )
	{
		if ( count >= 100 )
			throw UserError( 'Too many formulas' );

		//alert( selectionObject.Start + ' ' + selectionObject.End );
		
		findObject.Text = '<%';
		findObject.Execute();
		
		if ( ! findObject.Found )
			break;

		startPos = selectionObject.Start;
		//alert( startPos );

		selectionObject.Start = selectionObject.End;

		findObject.Text = '%>';
		findObject.Execute();
		
		if ( ! findObject.Found )
			break;

		endPos = selectionObject.End;

		selectionObject.Start = startPos;

		exprStr = selectionObject.Text;

		if ( StrBegins( exprStr, '<%=' ) )
		{
			exprStr = StrRangePos( exprStr, 3, StrLen( exprStr ) - 2 );
			isSubst = true;
		}
		else
		{
			exprStr = StrRangePos( exprStr, 2, StrLen( exprStr ) - 2 );
			isSubst = false;
		}

		//alert( exprStr );
		//alert( envObject.ExportToXml() );
		retVal = SafeEval( exprStr, [envObject] );

		if ( isSubst )
			selectionObject.Text = retVal;
		else
			selectionObject.Text = '';
			
		selectionObject.Start = selectionObject.End;
		count++;
	}
}