function is_firefox_installed()
{
	regKey = 'HKEY_LOCAL_MACHINE\\Software\\Mozilla\\Mozilla Firefox';
	if ( ! SysRegKeyExists( regKey ) )
		return false;

	return true;
}


function is_firefox_plugin_registered()
{
	if ( ! is_native_host_registered( false ) && ! is_native_host_registered( true ) )
		return false;

	destDir = get_firefox_extensions_dir_path();
	if ( destDir == '' )
		return false;

	destFilePath = FilePath( destDir, get_plugin_uid() + '.xpi' );
	return FilePathExists( destFilePath );
}


function register_firefox_plugin() 
{
	register_native_host( false );
	PutFileData( get_plugin_dest_file_path(), LoadUrlData( 'install/' + get_plugin_uid() + '.xpi' ) );
}


function unregister_firefox_plugin() 
{
    unregister_native_host( false );
    unregister_native_host( true );

	destFilePath = get_plugin_dest_file_path();
	if ( ! FilePathExists( destFilePath ) )
		return;

	DeleteFile( destFilePath );
}


function get_plugin_dest_file_path() 
{
	destDir = get_firefox_extensions_dir_path();
	if ( destDir == '' )
		throw UserError( 'Unable to get Firefox extensions directiry path.\r\nCheck your profile settings or start Mozilla Firefox for first configuration' );

	return FilePath( destDir, get_plugin_uid() + '.xpi' );
}


function get_firefox_extensions_dir_path() 
{
	appData = GetShellFolderPath( "AppData" );

    profPath = appData + '\\Mozilla\\Firefox';
    pathIni = profPath + '\\profiles.ini';
	if ( FilePathExists(pathIni))
		defProfile = LoadFileData(pathIni);
	else
		return '';

	linesArray = StrSplitToLines( defProfile );
	lineStr = ArrayOptFind( linesArray, 'StrBegins( This, \'Path=\' )' );
	if ( lineStr == undefined )
		return '';

	relPath = StrReplaceOne( lineStr, 'Path=', '' );
	relPath = StrReplace( relPath, '/', '\\' );

	profPath = FilePath( profPath, relPath );
	if ( ! PathIsDirectory( profPath ) )
		return '';
	
	profPath = FilePath( profPath, 'extensions' );
	ObtainDirectory( profPath );
    return profPath;
}


function get_plugin_uid() 
{
	//return '{107D7D7A-881C-40A5-A207-F29B01930042}';
	return 'estaff@firefox.datex-soft.com';
}


function register_native_host( installForAll )
{
	manifestFilePath = build_native_host_manifest();

	regKey = get_native_host_reg_key_path( installForAll );
	SetSysRegStrValue( regKey, '', manifestFilePath, {Prefer64View:true} );

	//if ( installForAll && System.IsX64 )
		//SetSysRegStrValue( regKey, '', manifestFilePath, {Prefer32View:true} );
}


function unregister_native_host( installForAll )
{
	regKey = get_native_host_reg_key_path( installForAll )
	if ( ! SysRegKeyExists( regKey, {Prefer64View:true} ) )
		return;

	//RemoveSysRegKey( regKey, {Prefer64View:true} );
}


function build_native_host_manifest()
{
	hostAppID = lib_chrome.get_host_app_id();
	pluginUid = get_plugin_uid();

	appDir = base1_config.app_setup_dir;
	//if ( FileName( appDir ) == 'Uninstall' )
		//appDir = ParentDirectory( appDir );
	appPath = FilePath( appDir, 'SpXml.exe' );

	datatStr = LoadUrlData( 'firefox_native_host_manifest_SAMPLE.json' );
	
	datatStr = StrReplaceOne( datatStr, '##HOST_APP_ID##', hostAppID );
	datatStr = StrReplaceOne( datatStr, '##HOST_APP_DESC##', EncodeCharset( AppName, 'utf-8' ) );
	datatStr = StrReplaceOne( datatStr, '##HOST_APP_PATH##', StrReplace( appPath, '\\', '\\\\' ) );
	datatStr = StrReplaceOne( datatStr, '##PLUGIN_ID##', pluginUid );

	appID = StrReplaceOne( AppID, '_Demo', '' );

	//manifestFilePath = FilePath( appDir, 'chrome_native_host_manifest.json' );
	manifestFilePath = FilePath( FilePath( GetShellFolderPath( 'LocalAppData' ), appID ), 'firefox_native_host_manifest.json' );

	ObtainDirectory( ParentDirectory( manifestFilePath ) );
	PutFileData( manifestFilePath, datatStr );
	return manifestFilePath;
}


function is_native_host_registered( installForAll )
{
	regKey = get_native_host_reg_key_path( installForAll );
	filePath = GetSysRegStrValue( regKey, '', {Prefer64View:true} );
	if ( filePath == '' )
		return false;

	//if ( ParentDirectory( filePath ) != base1_config.app_setup_dir )
		//return false;
	
	return true;
}


function get_native_host_reg_key_path( installForAll )
{
	hostAppID = lib_chrome.get_host_app_id();
	if ( installForAll )
		regKey = 'HKEY_LOCAL_MACHINE';
	else
		regKey = 'HKEY_CURRENT_USER';

	regKey += '\\SOFTWARE\\Mozilla\\NativeMessagingHosts\\' + hostAppID;
	return regKey;
}
