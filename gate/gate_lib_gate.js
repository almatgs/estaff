function get_gate_config()
{
	return FetchDoc( AppConfig.GetProperty( 'GATE-CONFIG' ), 'ui-text=1;form=gate_config.xmd' ).TopElem;
}


function get_email_plugin_config()
{
	pluginConfigDoc = FetchDoc( get_gate_config().email_plugin_config_url, 'ui-text=1;form=gate_email_plugin_config.xmd' );
	return pluginConfigDoc.TopElem;
}


function get_browser_plugin_config()
{
	pluginConfigDoc = FetchDoc( get_gate_config().browser_plugin_config_url, 'ui-text=1;form=gate_browser_plugin_config.xmd' );
	return pluginConfigDoc.TopElem;
}


function plugin_url_to_file_url( url )
{
	if ( UrlSchema( url ) == 'x-app' )
		return AbsoluteUrl( UrlHost( url ) + UrlPath( url ), FilePathToUrl( base1_config.app_setup_dir ) + '/x' );

	return FilePathToUrl( UrlToFilePath( url ) );
}


function is_datex_gate_registered()
{
	if ( ! is_ole_object_registered( get_base_class_name() + '.IeExtension', get_ie_plugin_clsid(), get_datex_gate_lib_path(), {Prefer32View:true} ) )
		return false;

	if ( ! is_ole_object_registered( get_base_class_name() + '.OutlookAddOn', get_outlook_plugin_clsid(), get_datex_gate_lib_path(), {Prefer32View:true} ) )
		return false;

	return true;
}


function is_datex_gate_x64_registered()
{
	if ( ! System.IsX64 )
		return false;

	if ( ! is_ole_object_registered( get_base_class_name() + '.IeExtension', get_ie_plugin_clsid(), get_datex_gate_x64_lib_path(), {Prefer64View:true} ) )
		return false;

	if ( ! is_ole_object_registered( get_base_class_name() + '.OutlookAddOn', get_outlook_plugin_clsid(), get_datex_gate_x64_lib_path(), {Prefer64View:true} ) )
		return false;

	return true;
}


/*function register_datex_gate()
{
	pluginPath = get_datex_gate_lib_path();

	try
	{
		retVal = ProcessExecute( 'regsvr32.exe', '/s "' + pluginPath + '"', 'sys=1;wait=1;' );
	}
	catch ( e )
	{
		ActiveScreen.MsgBox( 'Unable to register datex_gate.dll. ' + ExtractUserError( e ), UiText.titles.error, 'warning' );
	}

	if ( retVal != 0 )
		ActiveScreen.MsgBox( 'Unable to register ' + pluginPath, UiText.titles.error, 'warning' );
}


function register_datex_gate_x64()
{
	pluginPath = get_datex_gate_x64_lib_path();

	try
	{
		retVal = ProcessExecute( 'regsvr32.exe', '/s "' + pluginPath + '"', 'sys=1;wait=1;' );
	}
	catch ( e )
	{
		ActiveScreen.MsgBox( 'Unable to register datex_gate_x64.dll. ' + ExtractUserError( e ), UiText.titles.error, 'warning' );
	}

	if ( retVal != 0 )
		throw UserError( 'Unable to register ' + pluginPath );
}*/


function get_datex_gate_lib_path()
{
	return FilePath( base1_config.app_setup_dir, "datex_gate.dll" );
}


function get_datex_gate_x64_lib_path()
{
	return FilePath( base1_config.app_setup_dir, "datex_gate_x64.dll" );
}


function is_ole_object_registered( className, clsid, libPath, sysRegOptions )
{
	if ( ! FilePathExists( libPath ) )
		return false;

	if ( StrLowerCase( GetSysRegStrValue( 'HKEY_CLASSES_ROOT\\' + className + '\\CLSID', '', sysRegOptions ) ) != StrLowerCase( clsid ) )
		return false;

	if ( GetSysRegStrValue( 'HKEY_CLASSES_ROOT\\CLSID\\' + clsid + '\\InprocServer32', '', sysRegOptions ) != libPath )
		return false;

	return true;
}


function is_datex_gate_ole_class_registered( className, clsid )
{
	return is_ole_object_registered( className, clsid, get_datex_gate_lib_path(), {Prefer32View:true} );
}


function is_datex_gate_x64_ole_class_registered( className, clsid )
{
	return is_ole_object_registered( className, clsid, get_datex_gate_x64_lib_path(), {Prefer64View:true} );
}


function register_datex_gate_ole_class( className, clsid )
{
	register_ole_class( className, clsid, get_datex_gate_lib_path(), {Prefer32View:true} );
}


function register_datex_gate_x64_ole_class( className, clsid )
{
	register_ole_class( className, clsid, get_datex_gate_x64_lib_path(), {Prefer64View:true} );
}


function register_ole_class( className, clsid, libPath, sysRegOptions )
{
	if ( ! FilePathExists( libPath ) )
		throw UserError( 'File does not exists:\r\n' + libPath );

	//SetSysRegStrValue( 'HKEY_CLASSES_ROOT\\CLSID\\' + clsid + '\\InProcServer32\\', '', libPath, sysRegOptions );
	//SetSysRegStrValue( 'HKEY_CLASSES_ROOT\\' + className + '\\CLSID\\', '', clsid, sysRegOptions );

	SetSysRegStrValue( 'HKEY_AUTO\\Software\\Classes\\CLSID\\' + clsid + '\\InProcServer32\\', '', libPath, sysRegOptions );
	SetSysRegStrValue( 'HKEY_AUTO\\Software\\Classes\\' + className + '\\CLSID\\', '', clsid, sysRegOptions );
}


function get_ie_plugin_clsid()
{
	return '{2960C44B-1DB7-4C24-9E9C-882D7B81B962}';
}


function get_outlook_plugin_clsid()
{
	return '{D1729C6B-66A1-453E-84FB-E4519530BC0B}';
}


function get_base_class_name()
{
	return StrReplaceOne( AppID, '_Demo', '' ) + 'Gate';
}


function OnBrowserPluginMessage( msgData, options )
{
	//PutUrlData( 'x-local://Logs/zz_browser_msg.json', EncodeJson( msgData ) );

	if ( msgData.actionID == 'GetAppInfo' )
	{
		pluginConnector = CreateBrowserPluginConnector( msgData.browserType );

		reqObj = new Object;
		reqObj.actionID = 'GetAppInfoResult';
		reqObj.appID = AppID;
		reqObj.appVersion = AppVersion;
		reqObj.appBuildDate = AppBuildDate;

		pluginConnector.RunCode( EncodeJson( reqObj ) );
	}
	else if ( msgData.actionID == 'LoadResume' )
	{
		srcDoc = OpenNewDoc( '//gate/gate_browser_plugin_action.xmd' );

		srcDoc.TopElem.html = msgData.html;
		srcDoc.TopElem.sel_html = msgData.selHtml;
		srcDoc.TopElem.url = msgData.url;

		lib_recruit.import_web_plugin_selection( srcDoc.TopElem );
	}
	else if ( msgData.actionID == 'HttpRequestResult' )
	{
		lib_web_engine.OnPluginHttpRequestResult( msgData );
	}
	else if ( msgData.actionID == 'InjectPageScriptResult' )
	{
		lib_web_engine.OnPluginInjectPageScriptResult( msgData );
	}
	else
	{
		LogEvent( '', 'Unknown browser plugin action: ' + msgData.actionID );
	}
}


function CreateBrowserPluginConnector( browserType )
{
	pluginConnector = new ExtPluginConnector;

	pluginConnector.ProcessFileName = 'chrome.exe';
	//pluginConnector.ProcessArgs = '--enable-logging --v=1';
	pluginConnector.WindowClassName = 'ChromeNativeHost_' + lib_gate.get_gate_config().master_app_id;
	pluginConnector.WindowTitle = '*';

	return pluginConnector;
}
