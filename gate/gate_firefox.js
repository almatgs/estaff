function OnFirefoxMsg( srcStr )
{
	reqObj = EvalExtCodeLiteral( DecodeCharset( srcStr, 'utf-8' ) );

	lib = OpenCodeLib( 'x-app://gate/gate_lib_gate.js' );
	config = lib.get_browser_plugin_config();
	//action = config.actions[0];
	
	destDoc = OpenNewDoc( 'x-app://gate/gate_browser_plugin_action.xmd' );
	destDoc.TopElem.action_id = reqObj.actionID;

	destDoc.TopElem.url = reqObj.url;
	destDoc.TopElem.sel_html = reqObj.selHtml;
	
	if ( destDoc.TopElem.sel_html == '' )
		destDoc.TopElem.html = reqObj.html;
	
	tempFileUrl = ObtainTempFile( '.xml' );
	destDoc.SaveToUrl( tempFileUrl );


	appDir = AppDirectoryPath();
	appPath = FilePath( appDir, 'SpXml.exe' );

	execParam = '/E "' + config.handler_method + '( \'' + tempFileUrl + '\' ) "';
	//ShellExecute( "open", appPath, execParam );
	ProcessExecute( appPath, execParam );

	return '{"text":"OK"}';
}

