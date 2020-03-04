function GetPluginRequiredUi()
{
	doc = OpenDoc( '//rcr/rcr_email_plugin_required_ui.xml', 'ui-text=1' );

	for ( button in doc.TopElem.buttons )
	{
		button.image_url = FilePathToUrl( UrlToFilePath( button.image_url ) );
	}

	binary = new Binary();
	doc.SaveToStream( binary.WriteStream );

	//alert( doc.TopElem.Xml );
	return binary;
}


function RunPluginAction( paramXml )
{
	//alert( paramXml );

	tempFile = ObtainTempFile( '.xml' );
	PutUrlData( tempFile, paramXml );

	appDir = AppDirectoryPath();
	appPath = FilePath( appDir, 'SpXml.exe' );

	execParam = '/E "lib_recruit.handle_email_plugin_action( \'' + tempFile + '\' ) "';
	
	ShellExecute( "open", appPath, execParam );
	return;


	//alert( paramXml );

	srcDoc = OpenDocFromStr( paramXml );

	switch( srcDoc.TopElem.action_id )
	{
		case 'LoadResume':
			handle_load_resume( srcDoc.TopElem );
			break;

		case 'ShowEvent':
			handle_show_event( srcDoc.TopElem );
			break;

		default:
			throw UserError( 'Unknown action: ' + srcDoc.TopElem.action_id );
	}
}